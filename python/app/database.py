import sqlite3
from pathlib import Path
from app.config import DB_PATH, DATA_DIR
from contextlib import contextmanager
from typing import Generator

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'oracle',
    host TEXT NOT NULL,
    port INTEGER DEFAULT 1521,
    service_name TEXT,
    user_name TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER DEFAULT 587,
    secure INTEGER DEFAULT 0,
    user_name TEXT NOT NULL,
    password TEXT NOT NULL,
    from_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    connection_id INTEGER NOT NULL,
    email_config_id INTEGER,
    url TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    extraction_config TEXT,
    insert_script TEXT,
    before_insert_script TEXT,
    use_before_insert INTEGER DEFAULT 1,
    email_on_success INTEGER DEFAULT 1,
    email_on_error INTEGER DEFAULT 1,
    success_recipients TEXT,
    error_recipients TEXT,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES connections(id),
    FOREIGN KEY (email_config_id) REFERENCES email_config(id)
);

CREATE TABLE IF NOT EXISTS job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    status TEXT NOT NULL,
    rows_inserted INTEGER DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _get_connection() as conn:
        conn.executescript(SCHEMA)
        conn.execute("PRAGMA journal_mode = WAL")
        # Migration: use_before_insert if missing
        try:
            cur = conn.execute("PRAGMA table_info(jobs)")
            cols = [row[1] for row in cur.fetchall()]
            if "use_before_insert" not in cols:
                conn.execute("ALTER TABLE jobs ADD COLUMN use_before_insert INTEGER DEFAULT 1")
        except Exception:
            pass
        # Default: motor scraping = playwright
        conn.execute(
            "INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)",
            ("scraper_engine", "playwright"),
        )
        conn.commit()


@contextmanager
def _get_connection() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def get_setting(key: str, default: str = "") -> str:
    conn = get_db()
    try:
        row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default
    finally:
        conn.close()


def set_setting(key: str, value: str) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        conn.commit()
    finally:
        conn.close()
