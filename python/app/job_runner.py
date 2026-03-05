import re
import json
import traceback
from datetime import datetime
from typing import Any
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


def _script_value(key: str, value: Any) -> str:
    """Valoare pentru substituție în script: evită ORA-00936 (expression missing) când e goală."""
    if value is not None and str(value).strip() != "":
        return str(value).replace("'", "''")
    key_lower = key.lower()
    if key_lower in ("valabile_din", "data", "date", "arcdate") or "date" in key_lower or "data" in key_lower or "din" in key_lower:
        return "01.01.1900"
    return "NULL"


def substitute_in_script(script: str, row: dict) -> str:
    dt_placeholders = get_datetime_placeholders()
    combined = {**row, **dt_placeholders}
    out = script
    for key, value in combined.items():
        safe = _script_value(key, value)
        out = re.sub(r"\{\{\s*" + re.escape(key) + r"\s*\}\}", safe, out, flags=re.IGNORECASE)
        quoted = safe if safe == "NULL" else f"'{safe}'"
        out = re.sub(rf":{re.escape(key)}\b", quoted, out, flags=re.IGNORECASE)
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
            use_proxy = job.get("use_proxy", 0) != 0
            proxy_cfg = get_proxy_config() if use_proxy else None
            job_engine = (job.get("scraper_engine") or "").strip().lower() or None
            rows = (
                extract_with_config(job["url"], extraction_config, proxy_cfg, engine=job_engine)
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

            for row_data in rows:
                row_dict = dict(row_data) if hasattr(row_data, "keys") else row_data
                current_sql: str | None = None
                try:
                    should_insert = True
                    if use_verification and before_script:
                        check_script = substitute_in_script(before_script, row_dict)
                        current_sql = check_script
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
                        current_sql = script
                        run_script(oracle_user, oracle_pass, connect_string, script, {})
                        rows_inserted += 1
                except Exception as e:
                    # Eroare la acest rând – logăm și includem valorile variabilelor + ultimul SQL
                    row_json = json.dumps(row_dict, ensure_ascii=False)
                    base_msg = (str(e) or "").strip() or repr(e) or "Eroare necunoscută"
                    if not (str(e) or "").strip():
                        base_msg = f"{type(e).__name__}: {base_msg}"
                    if current_sql:
                        error_message = f"{base_msg} | ROW={row_json} | SQL={current_sql}"
                    else:
                        error_message = f"{base_msg} | ROW={row_json}"
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

                    return {"success": False, "rowsInserted": rows_inserted, "error": error_message}

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
            raw = (str(err) or "").strip()
            error_message = raw or repr(err) or "Eroare necunoscută"
            if not raw:
                error_message = f"{type(err).__name__}: {error_message}"
            traceback.print_exc()
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
