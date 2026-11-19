import { Router } from 'express';
import db from '../db.js';
import { getArticleImage, IMAGE_WIDTHS } from '../services/articleImages.js';

const router = Router();
router.get('/:id/:width.webp', async (req, res) => {
  const width = Number(req.params.width);
  if (!IMAGE_WIDTHS.includes(width)) return res.status(400).end();
  try {
    const [[article]] = await db.query("SELECT cover_image FROM articles WHERE id = ? AND status = 'published' LIMIT 1", [req.params.id]);
    if (!article?.cover_image) return res.status(404).end();
    const filepath = await getArticleImage(article.cover_image, width);
    res.set('Cache-Control', 'public, max-age=86400');
    res.sendFile(filepath);
  } catch {
    // El frontend reintenta con el original. Los fallos no se cachean.
    res.set('Cache-Control', 'no-store');
    res.status(502).end();
  }
});
export default router;
