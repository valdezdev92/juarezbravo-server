import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { getArticleById, parseRow } from '../services/articleStore.js';
import { listArticles } from '../services/articleQueries.js';

const router = Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try { res.json(await listArticles(req.query, true)); } catch (err) { next(err); }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const [[stats]] = await db.query(`SELECT COUNT(*) AS total,
      COALESCE(SUM(status = 'published'), 0) AS published,
      COALESCE(SUM(status = 'draft'), 0) AS drafts,
      COALESCE(SUM(is_breaking_news = 1), 0) AS breaking,
      COALESCE(SUM(views), 0) AS totalViews FROM articles`);
    const [recent] = await db.query(`SELECT id, title, slug, status, category, is_breaking_news, created_at
      FROM articles ORDER BY created_at DESC, id DESC LIMIT 6`);
    res.json({ ...Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Number(value)])), recent: recent.map(parseRow) });
  } catch (err) { next(err); }
});

router.get('/tags', async (_req, res, next) => {
  try {
    // Solo leemos las etiquetas; nunca los cuerpos del archivo completo.
    const [rows] = await db.query('SELECT tags FROM articles WHERE tags IS NOT NULL');
    const counts = new Map();
    for (const row of rows) {
      for (const tag of parseRow(row).tags) counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    res.json([...counts.entries()].sort((a, b) => b[1] - a[1]));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const article = await getArticleById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(article);
  } catch (err) { next(err); }
});

export default router;
