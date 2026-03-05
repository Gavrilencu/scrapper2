from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_setting, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])

SCRAPER_ENGINE_KEY = "scraper_engine"
ALLOWED_ENGINES = ("playwright", "beautifulsoup")


class ScraperEngineBody(BaseModel):
    scraper_engine: str


@router.get("")
def get_settings():
    engine = get_setting(SCRAPER_ENGINE_KEY, "playwright")
    if engine not in ALLOWED_ENGINES:
        engine = "playwright"
    return {"scraper_engine": engine}


@router.put("")
def update_settings(body: ScraperEngineBody):
    engine = (body.scraper_engine or "playwright").strip().lower()
    if engine not in ALLOWED_ENGINES:
        engine = "playwright"
    set_setting(SCRAPER_ENGINE_KEY, engine)
    return {"ok": True, "scraper_engine": engine}
