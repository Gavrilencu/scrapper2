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
    if not s:
        return False
    # Full XPath (ex: /html/body/div[1]), XPath relativ (//div), sau prefix xpath=
    return s.startswith("/") or s.startswith("(.") or s.lower().startswith("xpath=")


def _xpath_strip_prefix(selector: str) -> str:
    """Elimină prefixul 'xpath=' dacă există, pentru document.evaluate."""
    s = (selector or "").strip()
    if s.lower().startswith("xpath="):
        return s[6:].strip()
    return s


# JavaScript rulat în browser pentru XPath – același motor ca în Chrome (Copy full XPath).
_JS_XPATH_EXTRACT = """
(xpath) => {
  const out = [];
  try {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    for (let i = 0; i < result.snapshotLength; i++) {
      const node = result.snapshotItem(i);
      if (!node) { out.push(''); continue; }
      if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
        out.push((node.nodeValue || '').trim());
      } else {
        out.push((node.textContent || '').trim());
      }
    }
  } catch (e) {
    return { error: e.message };
  }
  return out;
}
"""


def test_extract_playwright(url: str, selector: str, proxy: dict | None = None) -> list[str]:
    """Extrage toate textele: XPath (inclusiv full XPath ca în Chrome) sau CSS. Rulează JavaScript."""
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
            # load = așteaptă evenimentul load (mai robust decât networkidle pe site-uri cu multe request-uri)
            page.goto(url, wait_until="load", timeout=60000)
            page.wait_for_timeout(5000)

            if _is_xpath(selector):
                xpath_clean = _xpath_strip_prefix(selector)
                # Folosim document.evaluate în pagină – compatibil cu „Copy full XPath” din Chrome
                out = page.evaluate(_JS_XPATH_EXTRACT, xpath_clean)
                if isinstance(out, dict) and "error" in out:
                    raise ValueError(out["error"])
                return [str(v).strip() for v in (out or [])]
            else:
                # CSS: locator + listă de text
                locator = page.locator(selector)
                try:
                    locator.first.wait_for(state="visible", timeout=10000)
                except Exception:
                    pass
                n = locator.count()
                result: list[str] = []
                for i in range(n):
                    try:
                        text = locator.nth(i).inner_text(timeout=3000)
                        result.append((text or "").strip())
                    except Exception:
                        try:
                            text = locator.nth(i).text_content(timeout=3000)
                            result.append((text or "").strip())
                        except Exception:
                            result.append("")
                return result
        finally:
            browser.close()


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
    from app.scraper_lxml import _xpath_without_tbody

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
            if not nodes and "/tbody" in selector:
                nodes = tree.xpath(_xpath_without_tbody(selector))
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
