from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_setting, set_setting

router = APIRouter(prefix="/api/settings", tags=["settings"])

SCRAPER_ENGINE_KEY = "scraper_engine"
ALLOWED_ENGINES = ("playwright", "beautifulsoup")


class SettingsBody(BaseModel):
    scraper_engine: str | None = None
    proxy_host: str | None = None
    proxy_port: int | None = None
    proxy_username: str | None = None
    proxy_password: str | None = None


@router.get("")
def get_settings():
    engine = get_setting(SCRAPER_ENGINE_KEY, "playwright")
    if engine not in ALLOWED_ENGINES:
        engine = "playwright"

    proxy_host = get_setting("proxy_host", "")
    proxy_port = get_setting("proxy_port", "")
    proxy_username = get_setting("proxy_username", "")
    # Parola este stocată în clar; dacă vrei, poți goli câmpul în UI.
    proxy_password = get_setting("proxy_password", "")

    port_int = int(proxy_port) if proxy_port.isdigit() else 0

    return {
        "scraper_engine": engine,
        "proxy_host": proxy_host,
        "proxy_port": port_int,
        "proxy_username": proxy_username,
        "proxy_password": proxy_password,
    }


@router.put("")
def update_settings(body: SettingsBody):
    if body.scraper_engine is not None:
        engine = (body.scraper_engine or "playwright").strip().lower()
        if engine not in ALLOWED_ENGINES:
            engine = "playwright"
        set_setting(SCRAPER_ENGINE_KEY, engine)

    if body.proxy_host is not None:
        set_setting("proxy_host", body.proxy_host.strip())
    if body.proxy_port is not None:
        set_setting("proxy_port", str(body.proxy_port))
    if body.proxy_username is not None:
        set_setting("proxy_username", body.proxy_username.strip())
    if body.proxy_password is not None:
        set_setting("proxy_password", body.proxy_password)

    return {"ok": True}
