from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.scraper import analyze_page, extract_with_config
from app.scraper_test import test_extract_playwright, test_extract_bs4, test_extract_lxml
from app.job_runner import get_proxy_config

router = APIRouter(tags=["scrape"])


class AnalyzeBody(BaseModel):
    url: str


class ExtractBody(BaseModel):
    url: str
    extraction_config: dict


class TestExtractBody(BaseModel):
    url: str
    selector: str
    method: str = "playwright"  # playwright | beautifulsoup | lxml
    use_proxy: bool = False


@router.post("/api/scrape/analyze")
def analyze(body: AnalyzeBody):
    if not body.url:
        raise HTTPException(400, "URL lipsă")
    try:
        tables = analyze_page(body.url)
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/scrape/extract")
def extract(body: ExtractBody):
    if not body.url or not body.extraction_config:
        raise HTTPException(400, "URL sau extraction_config lipsă")
    try:
        rows = extract_with_config(body.url, body.extraction_config)
        return {"rows": rows}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/api/scrape/test")
def test_extract(body: TestExtractBody):
    """Pagină testare: un URL + un selector (XPath sau CSS), returnează valorile extrase."""
    if not body.url or not (body.selector or "").strip():
        raise HTTPException(400, "URL și selector sunt obligatorii.")
    method = (body.method or "playwright").strip().lower()
    if method not in ("playwright", "beautifulsoup", "lxml"):
        raise HTTPException(400, "Metodă invalidă. Alege: playwright, beautifulsoup sau lxml.")
    proxy = get_proxy_config() if body.use_proxy else None
    try:
        if method == "playwright":
            values = test_extract_playwright(body.url, body.selector, proxy)
        elif method == "beautifulsoup":
            values = test_extract_bs4(body.url, body.selector, proxy)
        else:
            values = test_extract_lxml(body.url, body.selector, proxy)
        return {"method": method, "values": values, "count": len(values)}
    except Exception as e:
        raise HTTPException(500, str(e))
