import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "scrapper.db"

SESSION_SECRET = os.environ.get("SESSION_SECRET", "scrapper-dev-secret")
SESSION_COOKIE = "scrapper_session"
SESSION_MAX_AGE_DAYS = 7
