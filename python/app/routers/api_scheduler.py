from fastapi import APIRouter
from app.scheduler import reload_scheduler

router = APIRouter(tags=["scheduler"])


@router.post("/api/scheduler/reload")
def reload():
    reload_scheduler()
    return {"ok": True}
