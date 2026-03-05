import json
from typing import Any
from playwright.sync_api import sync_playwright


def analyze_page(url: str) -> list[dict]:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1500)

            results = []

            tables = page.query_selector_all("table")
            for i, el in enumerate(tables):
                headers = []
                for th in el.query_selector_all("th"):
                    headers.append((th.inner_text() or "").strip())
                if not headers:
                    first_row = el.query_selector("tr")
                    if first_row:
                        for cell in first_row.query_selector_all("td, th"):
                            headers.append((cell.inner_text() or "").strip())
                rows = []
                trs = el.query_selector_all("tr")
                start = 1 if (headers and trs and trs[0].query_selector("th")) else 0
                for r in range(start, len(trs)):
                    row = {}
                    cells = trs[r].query_selector_all("td, th")
                    for c, cell in enumerate(cells):
                        key = headers[c] if c < len(headers) else f"Col{c}"
                        row[key] = (cell.inner_text() or "").strip()
                    if row:
                        rows.append(row)
                preview = " | ".join(json.dumps(r) for r in rows[:3])
                results.append({
                    "id": f"table-{i}",
                    "type": "html_table",
                    "selector": f"table:nth-of-type({i + 1})",
                    "headers": headers,
                    "rows": rows,
                    "preview": preview,
                })

            browser.close()
            return results
        except Exception:
            browser.close()
            raise


def _is_xpath(selector: str) -> bool:
    s = selector.strip()
    return s.startswith("/") or s.startswith("(.") or s.startswith("xpath=")


def extract_with_config(url: str, config: dict) -> list[dict[str, Any]]:
    tables_cfg = config.get("tables") or []
    fields_cfg = config.get("fields") or []
    row_selector = (config.get("rowSelector") or "").strip()

    all_rows: list[dict[str, Any]] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(1000)

            if fields_cfg:
                if row_selector:
                    loc = page.locator(f"xpath={row_selector}" if _is_xpath(row_selector) else row_selector)
                    count = loc.count()
                    for i in range(count):
                        row_el = loc.nth(i)
                        row = {}
                        for item in fields_cfg:
                            sel, var = item.get("selector"), item.get("variable")
                            if not sel or not var:
                                continue
                            loc_opt = f"xpath={sel}" if _is_xpath(sel) else sel
                            try:
                                text = row_el.locator(loc_opt).first.text_content()
                                row[var] = (text or "").strip()
                            except Exception:
                                row[var] = ""
                        all_rows.append(row)
                else:
                    row = {}
                    for item in fields_cfg:
                        sel, var = item.get("selector"), item.get("variable")
                        if not sel or not var:
                            continue
                        loc_opt = f"xpath={sel}" if _is_xpath(sel) else sel
                        try:
                            text = page.locator(loc_opt).first.text_content()
                            row[var] = (text or "").strip()
                        except Exception:
                            row[var] = ""
                    all_rows.append(row)

            for table in tables_cfg:
                selector = table.get("selector") or "table"
                columns = table.get("columns") or []
                col_map = {c["source"]: c["target"] for c in columns if c.get("source")}
                try:
                    el = page.query_selector(selector)
                    if not el:
                        continue
                    trs = el.query_selector_all("tr")
                    headers = []
                    ths = el.query_selector_all("th")
                    for t in ths:
                        headers.append((t.inner_text() or "").strip())
                    if not headers and trs:
                        for c in trs[0].query_selector_all("td, th"):
                            headers.append((c.inner_text() or "").strip())
                    start = 1 if (headers and trs and trs[0].query_selector("th")) else 0
                    for i in range(start, len(trs)):
                        row = {}
                        cells = trs[i].query_selector_all("td, th")
                        for j, cell in enumerate(cells):
                            src_key = headers[j] if j < len(headers) else f"Col{j}"
                            key = col_map.get(src_key, src_key)
                            row[key] = (cell.inner_text() or "").strip()
                        all_rows.append(row)
                except Exception:
                    continue

            browser.close()
            return all_rows
        except Exception:
            browser.close()
            raise
