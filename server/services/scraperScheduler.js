/**
 * Scheduler FALLBACK del scraper.
 *
 * El scraper primario es GitHub Actions (cron cada 20 min en :00, :20, :40 UTC).
 * Este scheduler in-process corre cada 20 min desfasado (:10, :30, :50 UTC)
 * y SOLO scrapea si no hubo un run en los últimos 25 min (de cualquier source).
 *
 * Como hay múltiples workers de Passenger (lsnode), todos disparan el cron
 * al mismo tiempo. Para evitar doble ejecución usamos un lock distribuido en
 * MySQL via UNIQUE KEY (scheduled_at, source).
 */
import cron from 'node-cron';
import db from '../db.js';
import { runScraperCycle } from './scraper.js';

const RECENT_RUN_THRESHOLD_MIN = 25;

function currentSlot() {
  const slot = new Date();
  slot.setSeconds(0, 0);
  // Redondear a múltiplo de 10 min para desambiguar workers concurrentes.
  slot.setMinutes(slot.getMinutes() - (slot.getMinutes() % 10));
  return slot;
}

async function recentSuccessfulRun() {
  const [rows] = await db.query(
    `SELECT id, source, started_at, status
       FROM scraper_runs
       WHERE started_at > NOW() - INTERVAL ? MINUTE
         AND status IN ('running', 'success')
       ORDER BY started_at DESC
       LIMIT 1`,
    [RECENT_RUN_THRESHOLD_MIN]
  );
  return rows[0] || null;
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
  const recent = await recentSuccessfulRun();
  if (recent) {
    console.log(
      `[Scheduler] Skip — último run ${recent.source} a las ${recent.started_at.toISOString()}`
    );
    return;
  }

  const scheduledAt = currentSlot();
  const runId = await tryAcquireSlot(scheduledAt);
  if (!runId) return; // Otro worker tomó este slot

  console.log(`[Scheduler] FALLBACK activo — slot ${scheduledAt.toISOString()} (run ${runId})`);
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

  // Desfasado de GitHub Actions: GH corre :00/:20/:40, fallback :10/:30/:50.
  cron.schedule('10,30,50 * * * *', () => {
    runOnce().catch((err) => console.error('[Scheduler] Error no controlado:', err));
  });

  console.log('[Scheduler] Fallback programado a :10/:30/:50 (corre solo si GH Actions no reportó)');
}
