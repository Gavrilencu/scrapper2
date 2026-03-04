import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const dbPath = path.join(dir, 'scrapper.db');
const db = new Database(dbPath);

db.exec(`
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
`);

console.log('DB initializat:', dbPath);
db.close();
