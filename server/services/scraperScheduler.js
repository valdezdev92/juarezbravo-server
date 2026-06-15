/**
 * Programador del scraper interno.
 *
 * Corre cada 20 min (:00, :20, :40). Como hay múltiples workers de Passenger
 * (lsnode), todos disparan el cron al mismo tiempo. Para evitar doble ejecución
 * usamos un lock distribuido en MySQL via UNIQUE KEY (scheduled_at, source):
 * solo el primer INSERT gana, los demás reciben ER_DUP_ENTRY y se rinden.
 */
import cron from 'node-cron';
import db from '../db.js';
import { runScraperCycle } from './scraper.js';

const SCHEDULE_MINUTES = 20;

function currentSlot() {
  const slot = new Date();
  slot.setSeconds(0, 0);
  slot.setMinutes(slot.getMinutes() - (slot.getMinutes() % SCHEDULE_MINUTES));
  return slot;
}

async function tryAcquireSlot(scheduledAt) {
  try {
    const [result] = await db.query(
      'INSERT INTO scraper_runs (source, scheduled_at) VALUES (?, ?)',
      ['server', scheduledAt]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function finishRun(runId, status, counts, errorMessage = null) {
  await db.query(
    `UPDATE scraper_runs
       SET finished_at = NOW(),
           status = ?,
           published_count = ?,
           skipped_count = ?,
           error_count = ?,
           error_message = ?
     WHERE id = ?`,
    [status, counts.published, counts.skipped, counts.errors, errorMessage, runId]
  );
}

async function runOnce() {
  const scheduledAt = currentSlot();
  const runId = await tryAcquireSlot(scheduledAt);

  if (!runId) {
    // Otro worker tomó este slot
    return;
  }

  console.log(`[Scheduler] Corriendo slot ${scheduledAt.toISOString()} (run ${runId})`);
  const start = Date.now();

  try {
    const counts = await runScraperCycle();
    await finishRun(runId, 'success', counts);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `[Scheduler] ✓ Run ${runId} OK en ${elapsed}s — ` +
      `pub: ${counts.published}, skip: ${counts.skipped}, err: ${counts.errors}`
    );
  } catch (err) {
    await finishRun(runId, 'error', { published: 0, skipped: 0, errors: 0 }, err.message);
    console.error(`[Scheduler] ✗ Run ${runId} falló: ${err.message}`);
  }
}

export function startScraperScheduler() {
  if (process.env.SCRAPER_SCHEDULE_DISABLED === 'true') {
    console.log('[Scheduler] Deshabilitado por env var SCRAPER_SCHEDULE_DISABLED');
    return;
  }
  if (!process.env.OPENAI_API_KEY || !process.env.SCRAPER_API_KEY) {
    console.log('[Scheduler] OPENAI_API_KEY o SCRAPER_API_KEY ausentes, no se programa');
    return;
  }

  // Cada 20 min, en :00, :20 y :40
  cron.schedule(`*/${SCHEDULE_MINUTES} * * * *`, () => {
    runOnce().catch((err) => console.error('[Scheduler] Error no controlado:', err));
  });

  console.log(`[Scheduler] Scraper programado cada ${SCHEDULE_MINUTES} min (server-side)`);
}
