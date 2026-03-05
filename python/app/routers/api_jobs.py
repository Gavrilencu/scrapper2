import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any
from app.database import get_db
from app.job_runner import run_job
from app.deps import get_session

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    name: str
    connection_id: int
    email_config_id: int | None = None
    url: str
    cron_expression: str
    extraction_config: dict | None = None
    insert_script: str | None = None
    before_insert_script: str | None = None
    use_before_insert: bool = True
    use_proxy: bool = False
    email_on_success: bool = True
    email_on_error: bool = True
    success_recipients: str | None = None
    error_recipients: str | None = None
    active: bool = True


class JobUpdate(BaseModel):
    name: str | None = None
    connection_id: int | None = None
    email_config_id: int | None = None
    url: str | None = None
    cron_expression: str | None = None
    extraction_config: dict | None = None
    insert_script: str | None = None
    before_insert_script: str | None = None
    use_before_insert: bool | None = None
    use_proxy: bool | None = None
    email_on_success: bool | None = None
    email_on_error: bool | None = None
    success_recipients: str | None = None
    error_recipients: str | None = None
    active: bool | None = None


@router.get("")
def list_jobs():
    db = get_db()
    try:
        rows = db.execute("""
            SELECT j.*, c.name as connection_name
            FROM jobs j
            LEFT JOIN connections c ON j.connection_id = c.id
            ORDER BY j.name
        """).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            if d.get("extraction_config") and isinstance(d["extraction_config"], str):
                pass  # keep as string for list
            out.append(d)
        return out
    finally:
        db.close()


@router.post("")
def create_job(body: JobCreate):
    if not body.name or not body.connection_id or not body.url or not body.cron_expression:
        raise HTTPException(400, "Lipsesc: name, connection_id, url, cron_expression")
    db = get_db()
    try:
        ext = json.dumps(body.extraction_config) if body.extraction_config else None
        cur = db.execute("""
            INSERT INTO jobs (name, connection_id, email_config_id, url, cron_expression,
                extraction_config, insert_script, before_insert_script, use_before_insert, use_proxy,
                email_on_success, email_on_error, success_recipients, error_recipients, active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            body.name,
            body.connection_id,
            body.email_config_id,
            body.url,
            body.cron_expression,
            ext,
            body.insert_script,
            body.before_insert_script,
            1 if body.use_before_insert else 0,
            1 if body.use_proxy else 0,
            1 if body.email_on_success else 0,
            1 if body.email_on_error else 0,
            body.success_recipients,
            body.error_recipients,
            1 if body.active else 0,
        ))
        db.commit()
        return {"id": cur.lastrowid}
    finally:
        db.close()


@router.get("/runs")
def list_runs(request: Request, jobId: int | None = None):
    db = get_db()
    try:
        if jobId:
            rows = db.execute(
                "SELECT * FROM job_runs WHERE job_id = ? ORDER BY started_at DESC LIMIT 100",
                (jobId,),
            ).fetchall()
        else:
            rows = db.execute(
                "SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 200"
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        db.close()


@router.get("/{id:int}")
def get_job(id: int):
    db = get_db()
    try:
        row = db.execute("SELECT * FROM jobs WHERE id = ?", (id,)).fetchone()
        if not row:
            raise HTTPException(404, "Not found")
        return dict(row)
    finally:
        db.close()


@router.put("/{id:int}")
def update_job(id: int, body: JobUpdate):
    db = get_db()
    try:
        existing = db.execute("SELECT * FROM jobs WHERE id = ?", (id,)).fetchone()
        if not existing:
            raise HTTPException(404, "Not found")
        existing = dict(existing)
        name = body.name if body.name is not None else existing["name"]
        connection_id = body.connection_id if body.connection_id is not None else existing["connection_id"]
        email_config_id = body.email_config_id if body.email_config_id is not None else existing["email_config_id"]
        url = body.url if body.url is not None else existing["url"]
        cron_expression = body.cron_expression if body.cron_expression is not None else existing["cron_expression"]
        extraction_config = body.extraction_config
        if extraction_config is not None:
            extraction_config = json.dumps(extraction_config)
        else:
            extraction_config = existing["extraction_config"]
        insert_script = body.insert_script if body.insert_script is not None else existing["insert_script"]
        before_insert_script = body.before_insert_script if body.before_insert_script is not None else existing["before_insert_script"]
        use_before_insert = body.use_before_insert if body.use_before_insert is not None else (existing.get("use_before_insert", 1) != 0)
        use_proxy = body.use_proxy if body.use_proxy is not None else (existing.get("use_proxy", 0) != 0)
        email_on_success = body.email_on_success if body.email_on_success is not None else (existing.get("email_on_success", 1) != 0)
        email_on_error = body.email_on_error if body.email_on_error is not None else (existing.get("email_on_error", 1) != 0)
        success_recipients = body.success_recipients if body.success_recipients is not None else existing["success_recipients"]
        error_recipients = body.error_recipients if body.error_recipients is not None else existing["error_recipients"]
        active = body.active if body.active is not None else (existing.get("active", 1) != 0)

        db.execute("""
            UPDATE jobs SET name=?, connection_id=?, email_config_id=?, url=?, cron_expression=?,
                extraction_config=?, insert_script=?, before_insert_script=?, use_before_insert=?, use_proxy=?,
                email_on_success=?, email_on_error=?, success_recipients=?, error_recipients=?, active=?,
                updated_at=CURRENT_TIMESTAMP WHERE id=?
        """, (
            name,
            connection_id,
            email_config_id,
            url,
            cron_expression,
            extraction_config,
            insert_script,
            before_insert_script,
            1 if use_before_insert else 0,
            1 if use_proxy else 0,
            1 if email_on_success else 0,
            1 if email_on_error else 0,
            success_recipients,
            error_recipients,
            1 if active else 0,
            id,
        ))
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.delete("/{id:int}")
def delete_job(id: int):
    db = get_db()
    try:
        db.execute("DELETE FROM job_runs WHERE job_id = ?", (id,))
        db.execute("DELETE FROM jobs WHERE id = ?", (id,))
        db.commit()
        return {"ok": True}
    finally:
        db.close()


@router.post("/{id:int}/run")
def run_job_api(id: int):
    try:
        result = run_job(id)
        return {
            "success": result["success"],
            "rowsInserted": result.get("rowsInserted", 0),
            "error": result.get("error"),
        }
    except Exception as e:
        return {"success": False, "rowsInserted": 0, "error": str(e)}
