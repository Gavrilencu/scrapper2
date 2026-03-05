from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db

router = APIRouter(prefix="/api/email-config", tags=["email"])


class EmailConfigCreate(BaseModel):
    name: str
    host: str
    port: int = 587
    secure: bool = False
    use_starttls: bool = True  # False = SMTP simplu (ex. Exchange pe 5525)
    user_name: str
    password: str
    from_address: str


class EmailConfigUpdate(BaseModel):
    name: str | None = None
    host: str | None = None
    port: int | None = None
    secure: bool | None = None
    use_starttls: bool | None = None
    user_name: str | None = None
    password: str | None = None
    from_address: str | None = None


@router.get("")
def list_email_configs():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, name, host, port, secure, use_starttls, user_name, from_address, created_at FROM email_config ORDER BY name"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@router.post("")
def create_email_config(body: EmailConfigCreate):
    if not body.name or not body.host or not body.user_name or not body.password or not body.from_address:
        raise HTTPException(400, "Lipsesc câmpuri obligatorii")
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO email_config (name, host, port, secure, use_starttls, user_name, password, from_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (body.name, body.host, body.port, 1 if body.secure else 0, 1 if body.use_starttls else 0, body.user_name, body.password, body.from_address),
        )
        db.commit()
        return {"id": cur.lastrowid}
    finally:
        db.close()


@router.get("/{id:int}")
def get_email_config(id: int):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM email_config WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        return dict(row)
    finally:
        db.close()


@router.put("/{id:int}")
def update_email_config(id: int, body: EmailConfigUpdate):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM email_config WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        row = dict(row)
        name = body.name if body.name is not None else row["name"]
        host = body.host if body.host is not None else row["host"]
        port = body.port if body.port is not None else row["port"]
        secure = body.secure if body.secure is not None else bool(row.get("secure"))
        use_starttls = body.use_starttls if body.use_starttls is not None else (row.get("use_starttls", 1) != 0)
        user_name = body.user_name if body.user_name is not None else row["user_name"]
        from_address = body.from_address if body.from_address is not None else row["from_address"]
        if body.password:
            db.execute(
                "UPDATE email_config SET name=?, host=?, port=?, secure=?, use_starttls=?, user_name=?, password=?, from_address=? WHERE id=?",
                (name, host, port, 1 if secure else 0, 1 if use_starttls else 0, user_name, body.password, from_address, id),
            )
        else:
            db.execute(
                "UPDATE email_config SET name=?, host=?, port=?, secure=?, use_starttls=?, user_name=?, from_address=? WHERE id=?",
                (name, host, port, 1 if secure else 0, 1 if use_starttls else 0, user_name, from_address, id),
            )
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.delete("/{id:int}")
def delete_email_config(id: int):
    db = get_db()
    try:
        db.execute("DELETE FROM email_config WHERE id = ?", (id,))
        db.commit()
        return {"ok": True}
    finally:
        db.close()
