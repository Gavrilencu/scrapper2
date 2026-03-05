"""
Motor de scraping: XPath (lxml etree), tabele (BeautifulSoup + lxml), fetch (httpx), proxy.
Folosit de scraper_lxml și de pagina de testare.
"""
import re
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
    kwargs = {"timeout": timeout, "follow_redirects": True}
    if proxy_str and proxy_str.strip():
        kwargs["proxy"] = proxy_str.strip()
    headers = {"User-Agent": "ScrapperPro/1.0 (httpx)"}
    with httpx.Client(**kwargs) as client:
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


def _cell_xpath_to_table_xpath(cell_xpath: str) -> str | None:
    """Din XPath către o celulă (ex. .../table[2]/tbody/tr[1]/td[1]) obține XPath către tabel."""
    if not cell_xpath or "table" not in cell_xpath.lower():
        return None
    x = cell_xpath.strip()
    x = re.sub(r"/tbody/tr\[\d+\]/td\[\d+\]$", "", x, flags=re.IGNORECASE)
    x = re.sub(r"/tr\[\d+\]/td\[\d+\]$", "", x, flags=re.IGNORECASE)
    x = re.sub(r"/td\[\d+\]$", "", x, flags=re.IGNORECASE)
    x = re.sub(r"/tbody$", "", x, flags=re.IGNORECASE)
    x = re.sub(r"/tr\[\d+\]$", "", x, flags=re.IGNORECASE)
    if "table" in x:
        return x
    return None


def _table_xpath_fallbacks(table_xpath: str) -> list[str]:
    """Variante de XPath pentru tabel (fără tbody, table ca descendent)."""
    out = []
    if "/tbody" in table_xpath:
        s = table_xpath.replace("/tbody/", "/").rstrip("/")
        if s.endswith("/tbody"):
            s = s[:-6]
        if s and s not in out:
            out.append(s)
    if "]/table[" in (table_xpath or ""):
        s = table_xpath.replace("]/table[", "]//table[", 1)
        if s not in out:
            out.append(s)
    return out


def extract_table_cells_by_xpath(
    html_content: str,
    table_xpath: str,
    xpath_fallbacks: list[str] | None = None,
) -> list[str]:
    """
    Extrage toate celulele dintr-un tabel găsit prin XPath.
    Returnează listă de stringuri (text din fiecare celulă, rând cu rând).
    """
    doc = etree.HTML(html_content)
    if doc is None:
        return []
    tries = [table_xpath] + (list(xpath_fallbacks) if xpath_fallbacks else [])
    table_el = None
    for xp in tries:
        if not (xp or "").strip():
            continue
        try:
            nodes = doc.xpath(xp)
            for n in nodes:
                if n is None or not hasattr(n, "tag"):
                    continue
                tag = (getattr(n, "tag", None) or "")
                if isinstance(tag, bytes):
                    tag = tag.decode("utf-8", errors="replace")
                if "table" in str(tag).lower():
                    table_el = n
                    break
            if table_el is not None:
                break
        except Exception:
            continue
    if table_el is None:
        return []
    cells = []
    for tr in table_el.xpath(".//tr"):
        for cell in tr.xpath(".//td | .//th"):
            if hasattr(cell, "itertext"):
                cells.append(("".join(cell.itertext())).strip())
            else:
                cells.append(str(cell).strip())
    return cells


def extract_by_xpath_or_table(
    html_content: str,
    xpath: str,
    xpath_fallbacks: list[str] | None = None,
) -> list[str]:
    """
    Extrage după XPath; dacă nu găsește nimic și XPath-ul arată că e din tabel,
    încearcă să extragă toate celulele din acel tabel (metodă „din tabel”).
    """
    values = extract_by_xpath(html_content, xpath, xpath_fallbacks=xpath_fallbacks)
    if values:
        return values
    table_xpath = _cell_xpath_to_table_xpath(xpath)
    if not table_xpath:
        return []
    table_fallbacks = _table_xpath_fallbacks(table_xpath)
    if xpath_fallbacks:
        for f in xpath_fallbacks:
            t = _cell_xpath_to_table_xpath(f)
            if t and t not in table_fallbacks:
                table_fallbacks.append(t)
    return extract_table_cells_by_xpath(html_content, table_xpath, xpath_fallbacks=table_fallbacks)


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
