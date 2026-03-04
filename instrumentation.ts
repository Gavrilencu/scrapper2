export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startScheduler } = await import('./src/lib/scheduler');
      startScheduler();
    } catch (err) {
      console.error('[Scrapper Pro] Scheduler init failed (app will run without cron):', err);
    }
  }
}

