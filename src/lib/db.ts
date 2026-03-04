import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'scrapper.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
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
  try {
    const info = database.prepare('PRAGMA table_info(jobs)').all() as { name: string }[];
    if (!info.some((c) => c.name === 'use_before_insert')) {
      database.exec('ALTER TABLE jobs ADD COLUMN use_before_insert INTEGER DEFAULT 1');
    }
  } catch (_) {}
}

export type Connection = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  service_name: string | null;
  user_name: string;
  password: string;
  created_at: string;
};

export type EmailConfig = {
  id: number;
  name: string;
  host: string;
  port: number;
  secure: number;
  user_name: string;
  password: string;
  from_address: string;
  created_at: string;
};

export type Job = {
  id: number;
  name: string;
  connection_id: number;
  email_config_id: number | null;
  url: string;
  cron_expression: string;
  extraction_config: string | null;
  insert_script: string | null;
  before_insert_script: string | null;
  email_on_success: number;
  email_on_error: number;
  success_recipients: string | null;
  error_recipients: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export type JobRun = {
  id: number;
  job_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_inserted: number;
  error_message: string | null;
};
