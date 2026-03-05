from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.oracle_client import test_connection

router = APIRouter(prefix="/api/connections", tags=["connections"])


class ConnectionCreate(BaseModel):
    name: str
    type: str = "oracle"
    host: str
    port: int = 1521
    service_name: str
    user_name: str
    password: str


class ConnectionTest(BaseModel):
    host: str
    port: int = 1521
    service_name: str
    user_name: str
    password: str


@router.get("")
def list_connections():
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, name, type, host, port, service_name, user_name, created_at FROM connections ORDER BY name"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@router.post("")
def create_connection(body: ConnectionCreate):
    if not body.name or not body.host or not body.user_name or not body.password or not body.service_name:
        raise HTTPException(400, "Lipsesc câmpuri: name, host, service_name, user_name, password")
    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO connections (name, type, host, port, service_name, user_name, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (body.name, body.type or "oracle", body.host, body.port or 1521, body.service_name, body.user_name, body.password),
        )
        db.commit()
        return {"id": cur.lastrowid}
    finally:
        db.close()


@router.get("/{id:int}")
def get_connection(id: int):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM connections WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        return dict(row)
    finally:
        db.close()


class ConnectionUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    host: str | None = None
    port: int | None = None
    service_name: str | None = None
    user_name: str | None = None
    password: str | None = None


@router.put("/{id:int}")
def update_connection(id: int, body: ConnectionUpdate):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM connections WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        row = dict(row)
        name = body.name if body.name is not None else row["name"]
        typ = body.type if body.type is not None else row["type"]
        host = body.host if body.host is not None else row["host"]
        port = body.port if body.port is not None else row["port"]
        service_name = body.service_name if body.service_name is not None else row["service_name"]
        user_name = body.user_name if body.user_name is not None else row["user_name"]
        if body.password:
            db.execute(
                "UPDATE connections SET name=?, type=?, host=?, port=?, service_name=?, user_name=?, password=? WHERE id=?",
                (name, typ, host, port, service_name, user_name, body.password, id),
            )
        else:
            db.execute(
                "UPDATE connections SET name=?, type=?, host=?, port=?, service_name=?, user_name=? WHERE id=?",
                (name, typ, host, port, service_name, user_name, id),
            )
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.delete("/{id:int}")
def delete_connection(id: int):
    db = get_db()
    try:
        db.execute("DELETE FROM connections WHERE id = ?", (id,))
        db.commit()
        return {"ok": True}
    finally:
        db.close()


class PatchAction(BaseModel):
    action: str


@router.patch("/{id:int}")
def patch_connection(id: int, body: PatchAction):
    if body.action != "test":
        raise HTTPException(400, "Invalid action")
    db = get_db()
    try:
        row = db.execute("SELECT * FROM connections WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        row = dict(row)
        ok, err = test_connection(
            row["host"],
            row["port"] or 1521,
            row["service_name"] or "",
            row["user_name"],
            row["password"],
        )
        return {"success": ok, "error": err}
    finally:
        db.close()


@router.post("/test")
def test_connection_api(body: ConnectionTest):
    if not body.host or not body.service_name or not body.user_name or not body.password:
        raise HTTPException(400, "Lipsesc: host, service_name, user_name, password")
    ok, err = test_connection(
        body.host, body.port or 1521, body.service_name, body.user_name, body.password
    )
    if ok:
        return {"success": True}
    return {"success": False, "error": err}
