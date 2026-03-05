import re
import json
from datetime import datetime
from app.database import get_db, get_setting
from app.oracle_client import build_connect_string, run_script
from app.scraper import extract_with_config
from app.email_sender import (
    send_email,
    build_job_success_email,
    build_job_error_email,
)


def get_datetime_placeholders(dt: datetime | None = None) -> dict[str, str]:
    """Returnează placeholdere pentru data/ora curentă, folosibile în scripturi cu {{nume}}."""
    if dt is None:
        dt = datetime.now()
    return {
        "now_yyyy_mm_dd": dt.strftime("%Y-%m-%d"),
        "now_dd_mm_yyyy": dt.strftime("%d.%m.%Y"),
        "now_dd_mm_yyyy_hh_mi_ss": dt.strftime("%d.%m.%Y %H:%M:%S"),
        "now_yyyy_mm_dd_hh_mi_ss": dt.strftime("%Y-%m-%d %H:%M:%S"),
        "now_time": dt.strftime("%H:%M:%S"),
        "now_ora": dt.strftime("%H:%M:%S"),
    }


def substitute_in_script(script: str, row: dict) -> str:
    dt_placeholders = get_datetime_placeholders()
    combined = {**row, **dt_placeholders}
    out = script
    for key, value in combined.items():
        safe = str(value).replace("'", "''") if value is not None else ""
        out = re.sub(r"\{\{\s*" + re.escape(key) + r"\s*\}\}", safe, out, flags=re.IGNORECASE)
        out = re.sub(rf":{re.escape(key)}\b", f"'{safe}'", out, flags=re.IGNORECASE)
    return out


def get_proxy_config() -> dict | None:
    """Construiește configurația de proxy globală din app_settings (sau None dacă nu este setată)."""
    host = (get_setting("proxy_host", "") or "").strip()
    port = (get_setting("proxy_port", "") or "").strip()
    username = (get_setting("proxy_username", "") or "").strip()
    password = (get_setting("proxy_password", "") or "").strip()
    if not host or not port:
        return None
    server = f"http://{host}:{port}"
    return {
        "server": server,
        "username": username or None,
        "password": password or None,
    }


def run_job(job_id: int) -> dict:
    conn = get_db()
    try:
        job = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not job:
            return {"success": False, "rowsInserted": 0, "error": "Job not found"}

            job = dict(job)
        db_conn = conn.execute(
            "SELECT * FROM connections WHERE id = ?", (job["connection_id"],)
        ).fetchone()
        if not db_conn:
            return {"success": False, "rowsInserted": 0, "error": "Connection not found"}
        db_conn = dict(db_conn)

        run_id = conn.execute(
            "INSERT INTO job_runs (job_id, status) VALUES (?, ?)", (job_id, "running")
        ).lastrowid
        conn.commit()

        rows_inserted = 0
        try:
            extraction_config = None
            if job.get("extraction_config"):
                extraction_config = json.loads(job["extraction_config"])
            rows = (
                extract_with_config(job["url"], extraction_config, proxy_cfg)
                if extraction_config
                else []
            )

            connect_string = build_connect_string(
                db_conn["host"],
                db_conn["port"] or 1521,
                db_conn["service_name"] or "",
            )
            oracle_user = db_conn["user_name"]
            oracle_pass = db_conn["password"]

            before_script = (job.get("before_insert_script") or "").strip()
            insert_script = (job.get("insert_script") or "").strip()
            use_verification = job.get("use_before_insert", 1) != 0
            use_proxy = job.get("use_proxy", 0) != 0

            proxy_cfg = get_proxy_config() if use_proxy else None

            for row_data in rows:
                row_dict = dict(row_data) if hasattr(row_data, "keys") else row_data
                should_insert = True
                if use_verification and before_script:
                    check_script = substitute_in_script(before_script, row_dict)
                    result = run_script(
                        oracle_user, oracle_pass, connect_string, check_script, {}
                    )
                    rows_result = result.get("rows") or []
                    if rows_result:
                        first_row = rows_result[0]
                        if isinstance(first_row, dict):
                            first_val = next(iter(first_row.values()), 0)
                        else:
                            first_val = first_row[0] if first_row else 0
                        if (first_val is not None and int(first_val) > 0):
                            should_insert = False
                if should_insert and insert_script:
                    script = substitute_in_script(insert_script, row_dict)
                    run_script(oracle_user, oracle_pass, connect_string, script, {})
                    rows_inserted += 1

            conn.execute(
                "UPDATE job_runs SET finished_at = CURRENT_TIMESTAMP, status = ?, rows_inserted = ? WHERE id = ?",
                ("success", rows_inserted, run_id),
            )
            conn.commit()

            if job.get("email_on_success") and job.get("email_config_id") and job.get("success_recipients"):
                ec = conn.execute(
                    "SELECT * FROM email_config WHERE id = ?",
                    (job["email_config_id"],),
                ).fetchone()
                if ec:
                    ec = dict(ec)
                    to_list = [e.strip() for e in job["success_recipients"].split(",") if e.strip()]
                    send_email(
                        host=ec["host"],
                        port=ec["port"],
                        secure=bool(ec.get("secure")),
                        user=ec["user_name"],
                        password=ec["password"],
                        from_addr=ec["from_address"],
                        to_list=to_list,
                        subject=f"[Scrapper Pro] Succes: {job['name']}",
                        html=build_job_success_email(
                            job["name"], rows_inserted, datetime.utcnow().isoformat()
                        ),
                    )

            return {"success": True, "rowsInserted": rows_inserted}

        except Exception as err:
            error_message = str(err)
            conn.execute(
                "UPDATE job_runs SET finished_at = CURRENT_TIMESTAMP, status = ?, error_message = ? WHERE id = ?",
                ("error", error_message, run_id),
            )
            conn.commit()

            if job.get("email_on_error") and job.get("email_config_id") and job.get("error_recipients"):
                try:
                    ec = conn.execute(
                        "SELECT * FROM email_config WHERE id = ?",
                        (job["email_config_id"],),
                    ).fetchone()
                    if ec:
                        ec = dict(ec)
                        to_list = [e.strip() for e in job["error_recipients"].split(",") if e.strip()]
                        send_email(
                            host=ec["host"],
                            port=ec["port"],
                            secure=bool(ec.get("secure")),
                            user=ec["user_name"],
                            password=ec["password"],
                            from_addr=ec["from_address"],
                            to_list=to_list,
                            subject=f"[Scrapper Pro] Eroare: {job['name']}",
                            html=build_job_error_email(
                                job["name"], error_message, datetime.utcnow().isoformat()
                            ),
                        )
                except Exception:
                    pass

            return {"success": False, "rowsInserted": 0, "error": error_message}
    finally:
        conn.close()
