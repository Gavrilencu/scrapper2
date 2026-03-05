"""
Dispatcher: folosește motorul per job (sau din Setări pentru analiză fără job).
Suportă: playwright, beautifulsoup, lxml.
"""
from typing import Any
from app.database import get_setting

from app import scraper_playwright
from app import scraper_bs4
from app import scraper_lxml

ALLOWED_ENGINES = ("playwright", "beautifulsoup", "lxml")


def _normalize_engine(engine: str | None) -> str:
    e = (engine or get_setting("scraper_engine") or "playwright").strip().lower()
    return e if e in ALLOWED_ENGINES else "playwright"


def analyze_page(url: str, proxy: dict | None = None, engine: str | None = None) -> list[dict]:
    """Analizează pagina; engine dacă e dat (ex. din formular), altfel din Setări."""
    e = _normalize_engine(engine)
    if e == "beautifulsoup":
        return scraper_bs4.analyze_page(url, proxy)
    if e == "lxml":
        return scraper_lxml.analyze_page(url, proxy)
    return scraper_playwright.analyze_page(url, proxy)


def extract_with_config(
    url: str,
    config: dict,
    proxy: dict | None = None,
    engine: str | None = None,
) -> list[dict[str, Any]]:
    """Extrage date; engine din job (sau din Setări dacă nu e specificat)."""
    e = _normalize_engine(engine)
    if e == "beautifulsoup":
        return scraper_bs4.extract_with_config(url, config, proxy)
    if e == "lxml":
        return scraper_lxml.extract_with_config(url, config, proxy)
    return scraper_playwright.extract_with_config(url, config, proxy)
