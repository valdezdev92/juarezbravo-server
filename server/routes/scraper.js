import { Router } from 'express';
import db from '../db.js';

const router = Router();

// POST /api/scraper/heartbeat
// GitHub Actions (scraper primario) reporta cada run aquí. El scheduler
// in-process del server consulta scraper_runs para saber si saltar su slot.
router.post('/heartbeat', async (req, res) => {
  if (req.header('x-api-key') !== process.env.SCRAPER_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const {
    scheduled_at,
    status = 'success',
    published_count = 0,
    skipped_count = 0,
    error_count = 0,
    error_message = null,
  } = req.body || {};

  if (!scheduled_at) {
    return res.status(400).json({ error: 'scheduled_at required' });
  }

  try {
    await db.query(
      `INSERT INTO scraper_runs
         (source, scheduled_at, started_at, finished_at, status,
          published_count, skipped_count, error_count, error_message)
       VALUES ('github', ?, NOW(), NOW(), ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         finished_at     = NOW(),
         status          = VALUES(status),
         published_count = VALUES(published_count),
         skipped_count   = VALUES(skipped_count),
         error_count     = VALUES(error_count),
         error_message   = VALUES(error_message)`,
      [scheduled_at, status, published_count, skipped_count, error_count, error_message]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scraper/status
// Estado del scraping (consumido por monitoring y debugging).
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
