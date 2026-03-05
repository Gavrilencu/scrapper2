"""
Dispatcher: folosește motorul ales în Setări (Playwright sau Beautiful Soup).
"""
from typing import Any
from app.database import get_setting

from app import scraper_playwright
from app import scraper_bs4


def _engine() -> str:
    return (get_setting("scraper_engine") or "playwright").strip().lower()


def analyze_page(url: str) -> list[dict]:
    if _engine() == "beautifulsoup":
        return scraper_bs4.analyze_page(url)
    return scraper_playwright.analyze_page(url)


def extract_with_config(
    url: str,
    config: dict,
    proxy: dict | None = None,
) -> list[dict[str, Any]]:
    if _engine() == "beautifulsoup":
        return scraper_bs4.extract_with_config(url, config, proxy)
    return scraper_playwright.extract_with_config(url, config, proxy)
