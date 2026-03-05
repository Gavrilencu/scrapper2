import { getDb } from './db';
import { buildConnectString, runOracleScript } from './oracle';
import { extractWithConfig } from './scraper';
import { sendEmail, buildJobSuccessEmail, buildJobErrorEmail } from './email';
import type { ExtractionConfig } from './scraper';

/** Placeholdere pentru data/ora curentă, folosibile în scripturi cu {{nume}}. */
function getDatetimePlaceholders(date: Date = new Date()): Record<string, string> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return {
    now_yyyy_mm_dd: `${y}-${m}-${d}`,
    now_dd_mm_yyyy: `${d}.${m}.${y}`,
    now_dd_mm_yyyy_hh_mi_ss: `${d}.${m}.${y} ${h}:${mi}:${s}`,
    now_yyyy_mm_dd_hh_mi_ss: `${y}-${m}-${d} ${h}:${mi}:${s}`,
    now_time: `${h}:${mi}:${s}`,
    now_ora: `${h}:${mi}:${s}`,
  };
}

function substituteInScript(script: string, row: Record<string, unknown>): string {
  const dtPlaceholders = getDatetimePlaceholders();
  const combined = { ...row, ...dtPlaceholders };
  let out = script;
  for (const [key, value] of Object.entries(combined)) {
    const safe = typeof value === 'string' ? value.replace(/'/g, "''") : String(value ?? '');
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), safe);
    out = out.replace(new RegExp(`:${key}\\b`, 'gi'), `'${safe}'`);
  }
  return out;
}

export async function runJob(jobId: number): Promise<{ success: boolean; rowsInserted: number; error?: string }> {
  const db = getDb();
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as {
    id: number;
    name: string;
    connection_id: number;
    email_config_id: number | null;
    url: string;
    extraction_config: string | null;
    insert_script: string | null;
    before_insert_script: string | null;
    use_before_insert: number;
    email_on_success: number;
    email_on_error: number;
    success_recipients: string | null;
    error_recipients: string | null;
  };
  if (!job) return { success: false, rowsInserted: 0, error: 'Job not found' };

  const conn = db.prepare('SELECT * FROM connections WHERE id = ?').get(job.connection_id) as {
    host: string;
    port: number;
    service_name: string;
    user_name: string;
    password: string;
  };
  if (!conn) return { success: false, rowsInserted: 0, error: 'Connection not found' };

  const runId = (db.prepare('INSERT INTO job_runs (job_id, status) VALUES (?, ?)').run(jobId, 'running') as { lastInsertRowid: number }).lastInsertRowid;
  let rowsInserted = 0;

  try {
    const extractionConfig: ExtractionConfig | null = job.extraction_config
      ? (JSON.parse(job.extraction_config) as ExtractionConfig)
      : null;
    const rows = extractionConfig
      ? await extractWithConfig(job.url, extractionConfig)
      : [];

    const oracleConfig = {
      user: conn.user_name,
      password: conn.password,
      connectString: buildConnectString(conn.host, conn.port, conn.service_name),
    };

    const beforeScript = (job.before_insert_script || '').trim();
    const insertScript = (job.insert_script || '').trim();

    const useVerification = job.use_before_insert !== 0;

    for (const row of rows) {
      let shouldInsert = true;
      if (useVerification && beforeScript) {
        const checkScript = substituteInScript(beforeScript, row);
        const result = await runOracleScript(oracleConfig, checkScript, row as Record<string, unknown>);
        const firstRow = (result.rows as Record<string, unknown>[])?.[0];
        if (firstRow) {
          const firstVal = Object.values(firstRow)[0];
          if (Number(firstVal) > 0) shouldInsert = false;
        }
      }
      if (shouldInsert && insertScript) {
        const script = substituteInScript(insertScript, row);
        await runOracleScript(oracleConfig, script);
        rowsInserted++;
      }
    }

    db.prepare(
      'UPDATE job_runs SET finished_at = CURRENT_TIMESTAMP, status = ?, rows_inserted = ? WHERE id = ?'
    ).run('success', rowsInserted, runId);

    if (job.email_on_success && job.email_config_id && job.success_recipients) {
      const emailConfigRow = db.prepare('SELECT * FROM email_config WHERE id = ?').get(job.email_config_id) as {
        host: string;
        port: number;
        secure: number;
        user_name: string;
        password: string;
        from_address: string;
      };
      if (emailConfigRow) {
        await sendEmail(
          {
            host: emailConfigRow.host,
            port: emailConfigRow.port,
            secure: !!emailConfigRow.secure,
            user: emailConfigRow.user_name,
            password: emailConfigRow.password,
            from: emailConfigRow.from_address,
          },
          job.success_recipients.split(',').map((e) => e.trim()).filter(Boolean),
          `[Scrapper Pro] Succes: ${job.name}`,
          buildJobSuccessEmail(job.name, rowsInserted, new Date().toISOString())
        );
      }
    }

    return { success: true, rowsInserted };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    db.prepare(
      'UPDATE job_runs SET finished_at = CURRENT_TIMESTAMP, status = ?, error_message = ? WHERE id = ?'
    ).run('error', errorMessage, runId);

    if (job.email_on_error && job.email_config_id && job.error_recipients) {
      const emailConfigRow = db.prepare('SELECT * FROM email_config WHERE id = ?').get(job.email_config_id) as {
        host: string;
        port: number;
        secure: number;
        user_name: string;
        password: string;
        from_address: string;
      };
      if (emailConfigRow) {
        await sendEmail(
          {
            host: emailConfigRow.host,
            port: emailConfigRow.port,
            secure: !!emailConfigRow.secure,
            user: emailConfigRow.user_name,
            password: emailConfigRow.password,
            from: emailConfigRow.from_address,
          },
          job.error_recipients.split(',').map((e) => e.trim()).filter(Boolean),
          `[Scrapper Pro] Eroare: ${job.name}`,
          buildJobErrorEmail(job.name, errorMessage, new Date().toISOString())
        ).catch(() => {});
      }
    }

    return { success: false, rowsInserted: 0, error: errorMessage };
  }
}
