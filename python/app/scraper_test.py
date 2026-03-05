"""
Extragere simplă pentru pagina de testare: un URL + un selector (XPath sau CSS).
Returnează listă de texte extrase. Suportă Playwright, Beautiful Soup (CSS), Lxml (XPath pe HTML static).
"""
from typing import Any

_CHROMIUM_HEADLESS_ARGS = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-setuid-sandbox",
]


def _is_xpath(selector: str) -> bool:
    s = (selector or "").strip()
    return s.startswith("/") or s.startswith("(.") or s.startswith("xpath=")


def test_extract_playwright(url: str, selector: str, proxy: dict | None = None) -> list[str]:
    """Extrage toate textele care se potrivesc selectorului (XPath sau CSS). Rulează JavaScript."""
    from playwright.sync_api import sync_playwright

    selector = (selector or "").strip()
    if not selector:
        return []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            proxy=proxy or None,
            args=_CHROMIUM_HEADLESS_ARGS,
        )
        try:
            page = browser.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(2500)

            if _is_xpath(selector):
                locator = page.locator(f"xpath={selector}")
            else:
                locator = page.locator(selector)

            try:
                locator.first.wait_for(state="attached", timeout=8000)
            except Exception:
                pass

            n = locator.count()
            result: list[str] = []
            for i in range(n):
                try:
                    el = locator.nth(i)
                    text = el.inner_text(timeout=2000)
                    result.append((text or "").strip())
                except Exception:
                    try:
                        text = locator.nth(i).text_content(timeout=2000)
                        result.append((text or "").strip())
                    except Exception:
                        result.append("")
            browser.close()
            return result
        except Exception:
            browser.close()
            raise


def test_extract_bs4(url: str, selector: str, proxy: dict | None = None) -> list[str]:
    """Extrage texte cu Beautiful Soup – doar selectoare CSS (fără XPath). HTML static, fără JS."""
    import requests
    from bs4 import BeautifulSoup

    selector = (selector or "").strip()
    if not selector:
        return []

    if _is_xpath(selector):
        return []  # BS4 nu suportă XPath – folosește Lxml sau Playwright

    headers = {"User-Agent": "ScrapperPro/1.0 (Test)"}
    kwargs: dict[str, Any] = {"timeout": 30, "headers": headers}
    if proxy and proxy.get("server"):
        server = proxy["server"]
        if proxy.get("username") and proxy.get("password"):
            server = f"http://{proxy['username']}:{proxy['password']}@{server.replace('http://', '')}"
        kwargs["proxies"] = {"http": server, "https": server}

    resp = requests.get(url, **kwargs)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    result: list[str] = []
    try:
        for el in soup.select(selector):
            result.append((el.get_text() or "").strip())
    except Exception:
        pass
    return result


def test_extract_lxml(url: str, selector: str, proxy: dict | None = None) -> list[str]:
    """Extrage texte cu lxml – XPath sau CSS pe HTML static (fără JavaScript)."""
    import requests
    from lxml import html

    selector = (selector or "").strip()
    if not selector:
        return []

    headers = {"User-Agent": "ScrapperPro/1.0 (Test)"}
    kwargs: dict[str, Any] = {"timeout": 30, "headers": headers}
    if proxy and proxy.get("server"):
        server = proxy["server"]
        if proxy.get("username") and proxy.get("password"):
            server = f"http://{proxy['username']}:{proxy['password']}@{server.replace('http://', '')}"
        kwargs["proxies"] = {"http": server, "https": server}

    resp = requests.get(url, **kwargs)
    resp.raise_for_status()
    tree = html.fromstring(resp.content)

    result: list[str] = []
    try:
        if _is_xpath(selector):
            nodes = tree.xpath(selector)
        else:
            from lxml import cssselect
            nodes = cssselect.CSSSelector(selector)(tree)
        for node in nodes:
            if hasattr(node, "text_content"):
                result.append((node.text_content() or "").strip())
            else:
                result.append(str(node).strip())
    except Exception:
        pass
    return result
