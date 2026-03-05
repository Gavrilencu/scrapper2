from fastapi import Request, HTTPException, status
from app.auth import get_session_from_cookie


def get_session(request: Request) -> dict | None:
    cookie = request.cookies.get("scrapper_session")
    return get_session_from_cookie(f"scrapper_session={cookie}" if cookie else None)


def require_auth(request: Request) -> dict:
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Neautentificat.")
    return session
