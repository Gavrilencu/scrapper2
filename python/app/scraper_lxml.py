"""
Scraper cu lxml – XPath și CSS pe HTML static (fără JavaScript).
Potrivit pentru pagini care nu depind de JS.
"""
import json
import re
from typing import Any
import requests
from lxml import html, cssselect


def _is_xpath(selector: str) -> bool:
    s = (selector or "").strip()
    return s.startswith("/") or s.startswith("(.") or s.lower().startswith("xpath=")


def _apply_proxy_to_server(server: str, username: str | None, password: str | None) -> str:
    if not username or not password:
        return server
    if "://" in server:
        scheme, rest = server.split("://", 1)
    else:
        scheme, rest = "http", server
    return f"{scheme}://{username}:{password}@{rest}"


def _get_tree(url: str, proxy: dict | None = None):
    headers = {"User-Agent": "ScrapperPro/1.0 (Lxml)"}
    kwargs: dict[str, Any] = {"timeout": 30, "headers": headers}
    if proxy and proxy.get("server"):
        server = proxy["server"]
        server_with_auth = _apply_proxy_to_server(
            server, proxy.get("username"), proxy.get("password")
        )
        kwargs["proxies"] = {"http": server_with_auth, "https": server_with_auth}
    resp = requests.get(url, **kwargs)
    resp.raise_for_status()
    return html.fromstring(resp.content)


def _xpath_without_tbody(xpath: str) -> str:
    """Transformă XPath copiat din browser (cu tbody) în variantă validă pentru lxml (fără tbody implicit)."""
    if not xpath or "/tbody" not in xpath:
        return xpath
    s = xpath.replace("/tbody/", "/")
    if s.endswith("/tbody"):
        s = s[:-6]
    return s


def _xpath_table_as_descendant(xpath: str) -> str:
    """Când tabelul nu e copil direct (ex. #id > div > table[2]), /table[N] nu găsește nimic. Încercăm //table[N] (descendent)."""
    if not xpath or "]/table[" not in xpath:
        return xpath
    return xpath.replace("]/table[", "]//table[", 1)


def _xpath_id_on_table(xpath: str) -> str | None:
    """Dacă id-ul e pe tabel (ex. <table id="base-rates-table">), path-ul din Chrome poate avea /table[2]/ deși e un singur tabel. Încercăm fără /table[N]/."""
    if not xpath or "]/table[" not in xpath or "@id=" not in xpath:
        return None
    # elimină /table[1]/ sau /table[2]/ etc. după ] (după predicate)
    s = re.sub(r"\]/table\[\d+\]/", "]/", xpath, count=1)
    return s if s != xpath else None


def _xpath_fallbacks_for_table(selector: str) -> list[str]:
    """Generează variante de XPath pentru extragere din tabele (Copy XPath din Chrome)."""
    sel = (selector or "").strip()
    if not sel or not _is_xpath(sel):
        return [sel]
    out = [sel]
    without_tbody = _xpath_without_tbody(sel)
    if without_tbody != sel:
        out.append(without_tbody)
    base = without_tbody or sel
    # tabel nu e copil direct: ]/table[ -> ]//table[
    if "]/table[" in base:
        desc = _xpath_table_as_descendant(base)
        if desc != base:
            out.append(desc)
    # id pe tabel: elimină /table[N]/ și ia primul tr/td
    id_on_table = _xpath_id_on_table(base)
    if id_on_table and id_on_table not in out:
        out.append(id_on_table)
    return out


def _nodes_for_selector(root, selector: str):
    """Returnează listă de noduri pentru selector (XPath sau CSS). Pentru XPath din tabele, încearcă mai multe variante (fără tbody, table ca descendent)."""
    sel = (selector or "").strip()
    if not sel:
        return []
    if _is_xpath(selector):
        for xpath_try in _xpath_fallbacks_for_table(sel):
            nodes = root.xpath(xpath_try)
            if nodes:
                return nodes
        return []
    try:
        return list(cssselect.CSSSelector(sel)(root))
    except Exception:
        return []


def _text_from_node(node) -> str:
    if node is None:
        return ""
    if hasattr(node, "text_content"):
        return (node.text_content() or "").strip()
    if hasattr(node, "nodeValue"):
        return (node.nodeValue or "").strip()
    return str(node).strip()


def analyze_page(url: str, proxy: dict | None = None) -> list[dict]:
    tree = _get_tree(url, proxy)
    results = []
    tables = tree.xpath("//table")
    for i, el in enumerate(tables):
        headers = []
        for th in el.xpath(".//th"):
            headers.append(_text_from_node(th))
        if not headers:
            first_row = el.xpath(".//tr")[0] if el.xpath(".//tr") else None
            if first_row:
                for cell in first_row.xpath(".//td | .//th"):
                    headers.append(_text_from_node(cell))
        rows = []
        trs = el.xpath(".//tr")
        start = 1 if (headers and trs and trs[0].xpath(".//th")) else 0
        for r in range(start, len(trs)):
            row = {}
            cells = trs[r].xpath(".//td | .//th")
            for c, cell in enumerate(cells):
                key = headers[c] if c < len(headers) else f"Col{c}"
                row[key] = _text_from_node(cell)
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
    return results


def extract_with_config(
    url: str,
    config: dict,
    proxy: dict | None = None,
) -> list[dict[str, Any]]:
    tables_cfg = config.get("tables") or []
    fields_cfg = config.get("fields") or []
    row_selector = (config.get("rowSelector") or "").strip()

    all_rows: list[dict[str, Any]] = []
    tree = _get_tree(url, proxy)

    if fields_cfg:
        if row_selector:
            row_nodes = _nodes_for_selector(tree, row_selector)
            for row_el in row_nodes:
                row: dict[str, Any] = {}
                for item in fields_cfg:
                    sel, var = item.get("selector"), item.get("variable")
                    if not sel or not var:
                        continue
                    # XPath relativ la rând: dacă e absolut (//) îl facem relativ (.//)
                    sel_use = sel.strip()
                    if _is_xpath(sel) and sel_use.startswith("//"):
                        sel_use = "." + sel_use
                    nodes = _nodes_for_selector(row_el, sel_use) if sel_use else []
                    if nodes:
                        row[var] = _text_from_node(nodes[0])
                    else:
                        # încercare din root
                        nodes_root = _nodes_for_selector(tree, item.get("selector") or "")
                        row[var] = _text_from_node(nodes_root[0]) if nodes_root else ""
                all_rows.append(row)
        else:
            row: dict[str, Any] = {}
            for item in fields_cfg:
                sel, var = item.get("selector"), item.get("variable")
                if not sel or not var:
                    continue
                nodes = _nodes_for_selector(tree, sel)
                row[var] = _text_from_node(nodes[0]) if nodes else ""
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
                tables = tree.xpath("//table")
                if 0 <= idx < len(tables):
                    el = tables[idx]
            if el is None:
                nodes = _nodes_for_selector(tree, selector)
                el = nodes[0] if nodes else None
            if not el:
                continue
            trs = el.xpath(".//tr")
            headers = []
            ths = el.xpath(".//th")
            for t in ths:
                headers.append(_text_from_node(t))
            if not headers and trs:
                for c in trs[0].xpath(".//td | .//th"):
                    headers.append(_text_from_node(c))
            start = 1 if (headers and trs and trs[0].xpath(".//th")) else 0
            for i in range(start, len(trs)):
                row = {}
                cells = trs[i].xpath(".//td | .//th")
                for j, cell in enumerate(cells):
                    src_key = headers[j] if j < len(headers) else f"Col{j}"
                    key = col_map.get(src_key, src_key)
                    row[key] = _text_from_node(cell)
                all_rows.append(row)
        except Exception:
            continue

    return all_rows
