/**
 * Scheduler del chequeo de imágenes rotas — corre cada 30 minutos.
 *
 * Mismo lock distribuido que scraperScheduler.js: hay múltiples workers de
 * Passenger (lsnode) y todos disparan el cron al mismo tiempo, así que se usa
 * un UNIQUE KEY en MySQL sobre el slot programado para que solo uno ejecute.
 */
import cron from 'node-cron';
import db from '../db.js';
import { runImageHealthCheck } from './imageHealthCheck.js';

function currentSlot() {
  const slot = new Date();
  slot.setSeconds(0, 0);
  slot.setMinutes(slot.getMinutes() - (slot.getMinutes() % 30));
  return slot;
}

async function tryAcquireSlot(scheduledAt) {
  try {
    const [result] = await db.query(
      'INSERT INTO image_health_runs (scheduled_at) VALUES (?)',
      [scheduledAt]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null; // otro worker tomó este slot
    throw err;
  }
}

async function finishRun(runId, status, counts, errorMessage = null) {
  await db.query(
    `UPDATE image_health_runs
        SET finished_at = NOW(), status = ?, checked_count = ?, removed_count = ?, error_message = ?
      WHERE id = ?`,
    [status, counts.checked, counts.removed, errorMessage, runId]
  );
}

async function runOnce() {
  const scheduledAt = currentSlot();
  const runId = await tryAcquireSlot(scheduledAt);
  if (!runId) return;

  console.log(`[ImageHealth] Ciclo ${scheduledAt.toISOString()} (run ${runId})`);
  const start = Date.now();

  try {
    const counts = await runImageHealthCheck();
    await finishRun(runId, 'success', counts);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(
      `[ImageHealth] ✓ Run ${runId} OK en ${elapsed}s — revisadas: ${counts.checked}, despublicadas: ${counts.removed}`
    );
  } catch (err) {
    await finishRun(runId, 'error', { checked: 0, removed: 0 }, err.message);
    console.error(`[ImageHealth] ✗ Run ${runId} falló: ${err.message}`);
  }
}

export function startImageHealthScheduler() {
  if (process.env.IMAGE_HEALTH_SCHEDULE_DISABLED === 'true') {
    console.log('[ImageHealth] Deshabilitado por env var IMAGE_HEALTH_SCHEDULE_DISABLED');
    return;
  }

  cron.schedule('*/30 * * * *', () => {
    runOnce().catch((err) => console.error('[ImageHealth] Error no controlado:', err));
  });

  console.log('[ImageHealth] Chequeo de imágenes rotas programado cada 30 minutos');
}
