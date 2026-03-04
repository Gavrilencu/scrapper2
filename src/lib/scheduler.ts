import cron from 'node-cron';
import { getDb } from './db';
import { runJob } from './job-runner';

let scheduled: cron.ScheduledTask[] = [];

function cronToSchedule(expr: string): string {
  return expr.trim() || '* * * * *';
}

export function startScheduler() {
  const db = getDb();
  const jobs = db.prepare('SELECT id, cron_expression FROM jobs WHERE active = 1').all() as { id: number; cron_expression: string }[];
  for (const job of jobs) {
    const expr = cronToSchedule(job.cron_expression);
    if (!cron.validate(expr)) continue;
    const task = cron.schedule(expr, () => runJob(job.id).catch((e) => console.error('Job run error', job.id, e)));
    scheduled.push(task);
  }
}

export function reloadScheduler() {
  scheduled.forEach((t) => t.stop());
  scheduled = [];
  startScheduler();
}

export function stopScheduler() {
  scheduled.forEach((t) => t.stop());
  scheduled = [];
}
