/**
 * Scheduler del importador de noticias.
 *
 * Corre cada 10 minutos dentro del propio server (ya no depende de GitHub
 * Actions ni de scrapear una página externa: las noticias se obtienen de la
 * API de NoticiasMessenger). Cada ciclo publica hasta NEWS_BATCH_SIZE
 * noticias, de la más antigua a la más nueva.
 *
 * Como hay múltiples workers de Passenger (lsnode), todos disparan el cron
 * al mismo tiempo. Para evitar doble ejecución usamos un lock distribuido en
 * MySQL via UNIQUE KEY (scheduled_at, source).
 */
import cron from 'node-cron';
import db from '../db.js';
import { runScraperCycle } from './scraper.js';

function currentSlot() {
  const slot = new Date();
  slot.setSeconds(0, 0);
  slot.setMinutes(slot.getMinutes() - (slot.getMinutes() % 10));
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
  if (!runId) return; // Otro worker tomó este slot

  console.log(`[Scheduler] Ciclo ${scheduledAt.toISOString()} (run ${runId})`);
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
  if (!process.env.OPENAI_API_KEY || !process.env.NEWS_API_TOKEN) {
    console.log('[Scheduler] OPENAI_API_KEY o NEWS_API_TOKEN ausentes, no se programa');
    return;
  }

  cron.schedule('*/10 * * * *', () => {
    runOnce().catch((err) => console.error('[Scheduler] Error no controlado:', err));
  });

  console.log('[Scheduler] Importador de noticias programado cada 10 minutos');
}
