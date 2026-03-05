from fastapi import APIRouter, Request, Response, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.auth import (
    verify_password,
    sign_session,
    hash_password,
    get_session_from_cookie,
    get_session_cookie_name,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str
    password: str


class RegisterBody(BaseModel):
    username: str
    password: str


class SetupBody(BaseModel):
    username: str
    password: str


@router.post("/login")
def login(body: LoginBody, response: Response):
    if not body.username.strip() or not body.password:
        raise HTTPException(400, "Utilizator și parolă obligatorii.")
    db = get_db()
    try:
        row = db.execute(
            "SELECT id, username, password_hash FROM users WHERE username = ?",
            (body.username.strip(),),
        ).fetchone()
        if not row or not verify_password(body.password, row["password_hash"]):
            raise HTTPException(401, "Utilizator sau parolă incorectă.")
        token = sign_session(row["id"], row["username"])
        resp = Response(content='{"ok":true}', media_type="application/json")
        resp.set_cookie(
            key=get_session_cookie_name(),
            value=token,
            max_age=7 * 24 * 60 * 60,
            httponly=True,
            samesite="lax",
            path="/",
        )
        return resp
    finally:
        db.close()


@router.get("/status")
def status(request: Request):
    db = get_db()
    try:
        count = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        needs_setup = count == 0
        cookie = request.cookies.get("scrapper_session")
        session = get_session_from_cookie(
            f"scrapper_session={cookie}" if cookie else None
        )
        return {"needsSetup": needs_setup, "user": session}
    finally:
        db.close()


@router.get("/needs-setup")
def needs_setup():
    db = get_db()
    try:
        count = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        return {"needsSetup": count == 0}
    finally:
        db.close()


@router.post("/setup")
def setup(body: SetupBody, response: Response):
    db = get_db()
    try:
        count = db.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        if count > 0:
            raise HTTPException(400, "Aplicația este deja configurată.")
        if not body.username.strip() or not body.password:
            raise HTTPException(400, "Utilizator și parolă sunt obligatorii.")
        if len(body.password) < 6:
            raise HTTPException(400, "Parola trebuie să aibă minim 6 caractere.")
        pw_hash = hash_password(body.password)
        try:
            db.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (body.username.strip(), pw_hash),
            )
            db.commit()
        except Exception:
            raise HTTPException(400, "Utilizatorul există deja.")
        row = db.execute(
            "SELECT id, username FROM users WHERE username = ?",
            (body.username.strip(),),
        ).fetchone()
        token = sign_session(row["id"], row["username"])
        resp = Response(content='{"ok":true}', media_type="application/json")
        resp.set_cookie(
            key=get_session_cookie_name(),
            value=token,
            max_age=7 * 24 * 60 * 60,
            httponly=True,
            samesite="lax",
            path="/",
        )
        return resp
    finally:
        db.close()


@router.post("/register")
def register(body: RegisterBody, request: Request):
    from app.deps import get_session
    if not get_session(request):
        raise HTTPException(401, "Neautentificat.")
    if not body.username.strip() or not body.password:
        raise HTTPException(400, "Utilizator și parolă obligatorii.")
    if len(body.password) < 6:
        raise HTTPException(400, "Parola trebuie să aibă minim 6 caractere.")
    db = get_db()
    try:
        pw_hash = hash_password(body.password)
        try:
            db.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (body.username.strip(), pw_hash),
            )
            db.commit()
            return {"ok": True}
        except Exception:
            raise HTTPException(400, "Utilizatorul există deja.")
    finally:
        db.close()


@router.post("/logout")
def logout(response: Response):
    resp = Response(content='{"ok":true}', media_type="application/json")
    resp.delete_cookie(key=get_session_cookie_name(), path="/")
    return resp
