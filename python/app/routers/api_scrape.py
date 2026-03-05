from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.scraper import analyze_page, extract_with_config

router = APIRouter(tags=["scrape"])


class AnalyzeBody(BaseModel):
    url: str


class ExtractBody(BaseModel):
    url: str
    extraction_config: dict


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
