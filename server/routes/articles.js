import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { createArticle, parseRow } from '../services/articleStore.js';
import { isImageUrlValid } from '../services/imageCheck.js';
import { publishArticleOnSocialMedia } from '../services/socialPost.js';
import { getHomeArticles, listArticles } from '../services/articleQueries.js';

const router = Router();

// GET /api/articles
router.get('/', async (req, res) => {
  try {
    res.json(await listArticles(req.query));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/home', async (_req, res, next) => {
  try { res.json(await getHomeArticles()); } catch (err) { next(err); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const [rows] = await db.query(
      `SELECT * FROM articles WHERE status = 'published' AND (slug = ? OR id = ?) LIMIT 1`, [slug, slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(parseRow(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/articles/:id/view  (sin auth — incrementa contador de vistas)
router.post('/:id/view', async (req, res) => {
  try {
    await db.query("UPDATE articles SET views = views + 1 WHERE id = ? AND status = 'published'", [req.params.id]);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// POST /api/articles
router.post('/', requireAuth, async (req, res) => {
  try {
    const article = await createArticle(req.body);
    res.status(201).json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/articles/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const FIELDS  = [
      'title','slug','excerpt','body','cover_image','category','tags',
      'status','is_breaking_news','is_featured','author','published_at','views',
    ];

    // Igual que al crear: no se permite dejar publicada una nota sin imagen
    // de portada válida (o con una imagen rota) — se guarda como borrador.
    if (req.body.status === 'published') {
      let coverImage = req.body.cover_image;
      if (!('cover_image' in req.body)) {
        const [rows] = await db.query('SELECT cover_image FROM articles WHERE id = ?', [id]);
        coverImage = rows[0]?.cover_image;
      }
      if (!(await isImageUrlValid(coverImage))) {
        req.body.status = 'draft';
      }
    }

    const updates = [];
    const params  = [];

    for (const field of FIELDS) {
      if (!(field in req.body)) continue;
      updates.push(`${field} = ?`);
      if (field === 'tags')                            params.push(JSON.stringify(req.body[field] || []));
      else if (field === 'is_breaking_news' || field === 'is_featured')
                                                       params.push(req.body[field] ? 1 : 0);
      else                                             params.push(req.body[field] ?? null);
    }

    if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });

    params.push(id);
    const update = `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`;
    let newlyPublished = false;
    if (req.body.status === 'published') {
      // Solo la actualización que cambia el estado debe publicar en redes.
      const [transition] = await db.query(`${update} AND status <> 'published'`, params);
      newlyPublished = transition.affectedRows > 0;
    }
    if (!newlyPublished) await db.query(update, params);

    const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    const article = parseRow(rows[0]);
    if (newlyPublished && article.status === 'published') {
      void publishArticleOnSocialMedia(article);
    }
    res.json(article);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/articles/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM articles WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
