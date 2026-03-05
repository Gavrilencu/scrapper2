from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.database import get_db
from app.job_runner import run_job

_scheduler: BackgroundScheduler | None = None


def _cron_to_fields(expr: str) -> dict:
    parts = (expr or "* * * * *").strip().split()
    if len(parts) < 5:
        return {"minute": "*", "hour": "*", "day": "*", "month": "*", "day_of_week": "*"}
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


def _run_job_safe(job_id: int) -> None:
    try:
        run_job(job_id)
    except Exception as e:
        print(f"Job run error {job_id}: {e}")


def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    db = get_db()
    try:
        rows = db.execute(
            "SELECT id, cron_expression FROM jobs WHERE active = 1"
        ).fetchall()
        _scheduler = BackgroundScheduler()
        for row in rows:
            job_id = row["id"]
            expr = row["cron_expression"] or "* * * * *"
            fields = _cron_to_fields(expr)
            try:
                trigger = CronTrigger(
                    minute=fields["minute"],
                    hour=fields["hour"],
                    day=fields["day"],
                    month=fields["month"],
                    day_of_week=fields["day_of_week"],
                )
                _scheduler.add_job(
                    _run_job_safe,
                    trigger=trigger,
                    args=[job_id],
                    id=f"job_{job_id}",
                )
            except Exception:
                continue
        _scheduler.start()
    finally:
        db.close()


def reload_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
    start_scheduler()


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
