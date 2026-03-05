import asyncio
import sys
from pathlib import Path

# Pe Windows, Playwright folosește subprocess; trebuie ProactorEventLoop (altfel NotImplementedError)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
try:
    from fastapi.templating import Jinja2Templates
except ImportError:
    from starlette.templating import Jinja2Templates
from app.config import DATA_DIR, DB_PATH
from app.database import init_db
from app.auth import get_session_from_cookie, get_session_cookie_name
from app.scheduler import start_scheduler
from app.routers import api_auth, api_connections, api_jobs, api_email, api_scrape, api_scheduler, api_settings

app = FastAPI(title="Scrapper Pro")

# Ensure data dir and DB exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
init_db()

app.include_router(api_auth.router)
app.include_router(api_connections.router)
app.include_router(api_jobs.router)
app.include_router(api_email.router)
app.include_router(api_scrape.router)
app.include_router(api_scheduler.router)
app.include_router(api_settings.router)

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")

PUBLIC_PATHS = {"/login", "/setup"}


@app.on_event("startup")
def on_startup():
    try:
        start_scheduler()
    except Exception as e:
        print("[Scrapper Pro] Scheduler init failed:", e)


def get_session(request: Request):
    cookie = request.cookies.get(get_session_cookie_name())
    return get_session_from_cookie(f"{get_session_cookie_name()}={cookie}" if cookie else None)


@app.get("/")
async def index(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("dashboard.html", {"request": request, "user": session})


@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/setup")
async def setup_page(request: Request):
    return templates.TemplateResponse("setup.html", {"request": request})


@app.get("/connections")
async def connections_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("connections.html", {"request": request, "user": session})


@app.get("/connections/new")
async def connections_new_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("connection_form.html", {"request": request, "user": session, "connection_id": None})


@app.get("/connections/{id:int}")
async def connection_edit_page(request: Request, id: int):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("connection_form.html", {"request": request, "user": session, "connection_id": id})


@app.get("/jobs")
async def jobs_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("jobs.html", {"request": request, "user": session})


@app.get("/jobs/new")
async def job_new_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("job_form.html", {"request": request, "user": session, "job_id": None})


@app.get("/jobs/{id:int}")
async def job_edit_page(request: Request, id: int):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("job_form.html", {"request": request, "user": session, "job_id": id})


@app.get("/email")
async def email_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("email.html", {"request": request, "user": session})


@app.get("/email/new")
async def email_new_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("email_form.html", {"request": request, "user": session, "config_id": None})


@app.get("/email/{id:int}")
async def email_edit_page(request: Request, id: int):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("email_form.html", {"request": request, "user": session, "config_id": id})


@app.get("/runs")
async def runs_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("runs.html", {"request": request, "user": session})


@app.get("/documentatie")
async def documentatie_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("documentatie.html", {"request": request, "user": session})


@app.get("/settings")
async def settings_page(request: Request):
    session = get_session(request)
    if not session:
        return RedirectResponse("/login", status_code=302)
    return templates.TemplateResponse("settings.html", {"request": request, "user": session})
