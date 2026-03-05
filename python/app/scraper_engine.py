"""
Motor de scraping: XPath (lxml etree), tabele (BeautifulSoup + lxml), fetch (httpx), proxy.
Folosit de scraper_lxml și de pagina de testare.
"""
from typing import Any

import httpx
from bs4 import BeautifulSoup
from lxml import etree


def _proxy_to_httpx(proxy: dict | None) -> str | None:
    """Convertește proxy dict (server, username?, password?) la string pentru httpx."""
    if not proxy or not proxy.get("server"):
        return None
    server = (proxy.get("server") or "").strip()
    if not server:
        return None
    user = (proxy.get("username") or "").strip()
    pwd = (proxy.get("password") or "").strip()
    if user and pwd:
        if "://" in server:
            scheme, rest = server.split("://", 1)
        else:
            scheme, rest = "http", server
        return f"{scheme}://{user}:{pwd}@{rest}"
    return server


def fetch_html(
    url: str,
    proxy: dict | None = None,
    timeout: float = 30.0,
) -> str:
    """Descarcă HTML de la URL, cu proxy opțional (dict: server, username?, password?)."""
    proxy_str = _proxy_to_httpx(proxy)
    proxies = None
    if proxy_str and proxy_str.strip():
        proxies = {"http://": proxy_str.strip(), "https://": proxy_str.strip()}
    headers = {"User-Agent": "ScrapperPro/1.0 (httpx)"}
    with httpx.Client(proxies=proxies, timeout=timeout, follow_redirects=True) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        return r.text


def extract_by_xpath(
    html_content: str,
    xpath: str,
    xpath_fallbacks: list[str] | None = None,
) -> list[str]:
    """
    Extrage texte din HTML folosind un singur XPath (poate returna mai multe noduri).
    xpath_fallbacks: liste opțională de variante XPath (ex. fără tbody); dacă None, se încearcă doar xpath.
    """
    doc = etree.HTML(html_content)
    if doc is None:
        return []
    tries = [xpath] if not xpath_fallbacks else [xpath] + list(xpath_fallbacks)
    nodes = []
    for xp in tries:
        if not (xp or "").strip():
            continue
        try:
            nodes = doc.xpath(xp)
            if nodes:
                break
        except Exception:
            continue
    result = []
    for n in nodes:
        if hasattr(n, "itertext"):
            result.append(("".join(n.itertext())).strip())
        else:
            result.append(str(n).strip())
    return result


def extract_table(
    html_content: str,
    table_selector: str | None = None,
    columns: list[str] | list[int] | None = None,
    table_index: int | None = None,
) -> list[dict[str, Any]]:
    """
    Extrage tabel ca listă de dict.
    table_selector: CSS selector sau 'first' pentru primul <table>.
    table_index: index 0-based al tabelului (dacă vrei să alegi un anumit <table> din pagină).
    columns: nume coloane (din header) sau indici 0-based; dacă None, toate coloanele din header.
    """
    soup = BeautifulSoup(html_content, "lxml")
    tables = soup.find_all("table")
    table = None
    if table_index is not None and 0 <= table_index < len(tables):
        table = tables[table_index]
    elif table_selector and (table_selector or "").strip().lower() != "first":
        table = soup.select_one(table_selector)
    else:
        table = tables[0] if tables else None
    if not table:
        return []
    rows = table.find_all("tr")
    if not rows:
        return []
    first_cells = rows[0].find_all(["th", "td"])
    first_has_th = any(c.name == "th" for c in first_cells)
    if not first_has_th and first_cells:
        headers = [f"col_{i}" for i in range(len(first_cells))]
        data_rows = rows
    else:
        headers = [
            ("".join(c.get_text(strip=True) or [])).strip() or f"col_{i}"
            for i, c in enumerate(first_cells)
        ]
        data_rows = rows[1:]
    if columns is not None:
        def as_indices(vals):
            out = []
            for c in vals:
                if isinstance(c, int):
                    out.append(c)
                elif isinstance(c, str) and (c or "").strip().isdigit():
                    out.append(int((c or "").strip()))
                else:
                    return None
            return out if out else None

        col_indices = as_indices(columns)
        if col_indices is not None:
            col_indices = [i for i in col_indices if 0 <= i < len(headers)]
            headers = [headers[i] for i in col_indices]
        else:
            col_indices = [headers.index(c) for c in columns if c in headers]
            headers = [h for i, h in enumerate(headers) if i in col_indices]
    else:
        col_indices = list(range(len(headers)))
    result = []
    for tr in data_rows:
        cells = tr.find_all(["td", "th"])
        row_dict = {}
        for i, idx in enumerate(col_indices):
            if idx < len(cells):
                val = ("".join(cells[idx].get_text(strip=True) or [])).strip()
                row_dict[headers[i]] = val or ""
        if row_dict:
            result.append(row_dict)
    return result


def preview_tables(
    url: str,
    proxy: dict | None = None,
    timeout: float = 30.0,
    max_rows: int = 5,
) -> list[dict[str, Any]]:
    """
    Detectează toate tabelele din pagină și întoarce un preview:
    [ { "index", "headers", "rows" }, ... ]
    """
    html_content = fetch_html(url, proxy=proxy, timeout=timeout)
    soup = BeautifulSoup(html_content, "lxml")
    tables = soup.find_all("table")
    previews: list[dict[str, Any]] = []
    for idx, table in enumerate(tables):
        rows = table.find_all("tr")
        if not rows:
            continue
        first_cells = rows[0].find_all(["th", "td"])
        first_has_th = any(c.name == "th" for c in first_cells)
        if not first_has_th and first_cells:
            headers = [f"col_{i}" for i in range(len(first_cells))]
            data_rows = rows[:max_rows]
        else:
            headers = [
                ("".join(c.get_text(strip=True) or [])).strip() or f"col_{i}"
                for i, c in enumerate(first_cells)
            ]
            data_rows = rows[1 : 1 + max_rows]
        body_rows = []
        for tr in data_rows:
            cells = tr.find_all(["td", "th"])
            body_rows.append(
                [
                    ("".join(c.get_text(strip=True) or [])).strip() or ""
                    for c in cells[: len(headers)]
                ]
            )
        previews.append(
            {
                "index": idx,
                "headers": headers,
                "rows": body_rows,
            }
        )
    return previews
