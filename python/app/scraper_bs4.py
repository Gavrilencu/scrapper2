"""
Scraper cu Beautiful Soup – doar HTML static (fără JavaScript).
Selectoarele trebuie să fie CSS; XPath nu este suportat în acest mod.
"""
import json
import re
from typing import Any
import requests
from bs4 import BeautifulSoup


def _apply_proxy_to_server(server: str, username: str | None, password: str | None) -> str:
    if not username or not password:
        return server
    # server e de forma scheme://host:port
    if "://" in server:
        scheme, rest = server.split("://", 1)
    else:
        scheme, rest = "http", server
    return f"{scheme}://{username}:{password}@{rest}"


def _get_soup(url: str, proxy: dict | None = None) -> BeautifulSoup:
    headers = {"User-Agent": "ScrapperPro/1.0"}
    kwargs: dict[str, Any] = {"timeout": 30, "headers": headers}
    if proxy and proxy.get("server"):
        server = proxy["server"]
        server_with_auth = _apply_proxy_to_server(
            server,
            proxy.get("username"),
            proxy.get("password"),
        )
        kwargs["proxies"] = {
            "http": server_with_auth,
            "https": server_with_auth,
        }
    resp = requests.get(url, **kwargs)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


def analyze_page(url: str, proxy: dict | None = None) -> list[dict]:
    soup = _get_soup(url, proxy)
    results = []
    tables = soup.find_all("table")
    for i, el in enumerate(tables):
        headers = []
        for th in el.find_all("th"):
            headers.append((th.get_text() or "").strip())
        if not headers:
            first_row = el.find("tr")
            if first_row:
                for cell in first_row.find_all(["td", "th"]):
                    headers.append((cell.get_text() or "").strip())
        rows = []
        trs = el.find_all("tr")
        start = 1 if (headers and trs and trs[0].find("th")) else 0
        for r in range(start, len(trs)):
            row = {}
            cells = trs[r].find_all(["td", "th"])
            for c, cell in enumerate(cells):
                key = headers[c] if c < len(headers) else f"Col{c}"
                row[key] = (cell.get_text() or "").strip()
            if row:
                rows.append(row)
        preview = " | ".join(json.dumps(r) for r in rows[:3])
        # selector pentru CSS: table nth-of-type
        results.append({
            "id": f"table-{i}",
            "type": "html_table",
            "selector": f"table:nth-of-type({i + 1})",
            "headers": headers,
            "rows": rows,
            "preview": preview,
        })
    return results


def _is_xpath(selector: str) -> bool:
    s = (selector or "").strip()
    return s.startswith("/") or s.startswith("(.") or s.startswith("xpath=")


def _css_selector_only(selector: str) -> str:
    """Dacă e XPath, nu putem folosi cu BS4 – returnăm ceva care nu găsește nimic sau încercăm o conversie simplă."""
    if _is_xpath(selector):
        return ""
    return (selector or "").strip()


def extract_with_config(
    url: str,
    config: dict,
    proxy: dict | None = None,
) -> list[dict[str, Any]]:
    tables_cfg = config.get("tables") or []
    fields_cfg = config.get("fields") or []
    row_selector = (config.get("rowSelector") or "").strip()

    all_rows: list[dict[str, Any]] = []
    soup = _get_soup(url, proxy)

    if fields_cfg:
        row_selector_css = _css_selector_only(row_selector)
        if row_selector_css:
            # Caz: avem selector de rânduri (ex: table#id tbody tr)
            row_elems = soup.select(row_selector_css)
            for row_el in row_elems:
                row: dict[str, Any] = {}
                for item in fields_cfg:
                    sel, var = item.get("selector"), item.get("variable")
                    if not sel or not var:
                        continue
                    css = _css_selector_only(sel)
                    if not css:
                        continue
                    try:
                        # Încercăm mai întâi relativ la rând; dacă nu găsim, căutăm global în pagină.
                        found = row_el.select_one(css) or soup.select_one(css)
                        row[var] = (found.get_text() or "").strip() if found else ""
                    except Exception:
                        row[var] = ""
                all_rows.append(row)
        else:
            row = {}
            for item in fields_cfg:
                sel, var = item.get("selector"), item.get("variable")
                if not sel or not var:
                    continue
                css = _css_selector_only(sel)
                if not css:
                    continue
                try:
                    found = soup.select_one(css)
                    row[var] = (found.get_text() or "").strip() if found else ""
                except Exception:
                    row[var] = ""
            all_rows.append(row)

    for table in tables_cfg:
        selector = (table.get("selector") or "table").strip()
        columns = table.get("columns") or []
        col_map = {c["source"]: c["target"] for c in columns if c.get("source")}
        try:
            el = None
            nth_match = re.match(r"table:nth-of-type\((\d+)\)", selector)
            if nth_match:
                idx = int(nth_match.group(1), 10) - 1
                tables = soup.find_all("table")
                if 0 <= idx < len(tables):
                    el = tables[idx]
            if el is None:
                el = soup.select_one(selector)
            if not el:
                continue
            trs = el.find_all("tr")
            headers = []
            ths = el.find_all("th")
            for t in ths:
                headers.append((t.get_text() or "").strip())
            if not headers and trs:
                for c in trs[0].find_all(["td", "th"]):
                    headers.append((c.get_text() or "").strip())
            start = 1 if (headers and trs and trs[0].find("th")) else 0
            for i in range(start, len(trs)):
                row = {}
                cells = trs[i].find_all(["td", "th"])
                for j, cell in enumerate(cells):
                    src_key = headers[j] if j < len(headers) else f"Col{j}"
                    key = col_map.get(src_key, src_key)
                    row[key] = (cell.get_text() or "").strip()
                all_rows.append(row)
        except Exception:
            continue

    return all_rows
