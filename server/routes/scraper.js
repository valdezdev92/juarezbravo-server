import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/scraper/status
// Devuelve el último run y minutos desde el último run exitoso.
// Lo usa GitHub Actions como fallback: si server ya scrapeó hace poco, salta.
router.get('/status', async (_req, res) => {
  try {
    const [lastRows] = await db.query(
      `SELECT id, source, scheduled_at, started_at, finished_at, status,
              published_count, skipped_count, error_count
         FROM scraper_runs
         ORDER BY started_at DESC
         LIMIT 1`
    );

    const [successRows] = await db.query(
      `SELECT started_at, finished_at, published_count
         FROM scraper_runs
         WHERE status = 'success'
         ORDER BY started_at DESC
         LIMIT 1`
    );

    const lastSuccess = successRows[0] || null;
    const minutesSinceSuccess = lastSuccess
      ? Math.floor((Date.now() - new Date(lastSuccess.started_at).getTime()) / 60000)
      : null;

    res.json({
      last_run:                     lastRows[0] || null,
      last_success:                 lastSuccess,
      last_success_minutes_ago:     minutesSinceSuccess,
      now:                          new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
