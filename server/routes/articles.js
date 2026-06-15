import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publishArticleToFacebook } from '../services/facebook.js';

const router = Router();

const ALLOWED_SORT_FIELDS = {
  published_at: 'published_at',
  created_at:   'created_at',
  created_date: 'created_at', // alias base44
  title:        'title',
  views:        'views',
};

function buildSort(sortParam) {
  if (!sortParam) return 'created_at DESC';
  const desc  = sortParam.startsWith('-');
  const field = desc ? sortParam.slice(1) : sortParam;
  const col   = ALLOWED_SORT_FIELDS[field] ?? 'created_at';
  return `${col} ${desc ? 'DESC' : 'ASC'}`;
}

function parseRow(row) {
  return {
    ...row,
    tags:             row.tags ? JSON.parse(row.tags) : [],
    is_breaking_news: Boolean(row.is_breaking_news),
    is_featured:      Boolean(row.is_featured),
    created_date:     row.created_at, // compatibilidad con llamadas que usan created_date
  };
}

// GET /api/articles
router.get('/', async (req, res) => {
  try {
    const { status, category, slug, sort, limit, search, tag } = req.query;
    const conditions = [];
    const params     = [];

    if (status)   { conditions.push('status = ?');   params.push(status); }
    if (category) { conditions.push('category = ?'); params.push(category); }
    if (slug)     { conditions.push('slug = ?');     params.push(slug); }
    if (tag)      { conditions.push("JSON_CONTAINS(tags, ?)"); params.push(JSON.stringify(tag)); }
    if (search) {
      conditions.push('(title LIKE ? OR excerpt LIKE ? OR body LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY ${buildSort(sort)}`;
    const lim     = Math.min(parseInt(limit) || 100, 2000);

    const [rows] = await db.query(
      `SELECT * FROM articles ${where} ${orderBy} LIMIT ${lim}`,
      params
    );

    res.json(rows.map(parseRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/articles/:id/view  (sin auth — incrementa contador de vistas)
router.post('/:id/view', async (req, res) => {
  try {
    await db.query('UPDATE articles SET views = views + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// POST /api/articles
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title, slug, excerpt, body, cover_image, category, tags,
      status, is_breaking_news, is_featured, author, published_at, views,
    } = req.body;

    const id = randomUUID();

    await db.query(
      `INSERT INTO articles
         (id, title, slug, excerpt, body, cover_image, category, tags,
          status, is_breaking_news, is_featured, author, published_at, views)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, slug || null, excerpt || null, body || null,
        cover_image || null, category || null,
        JSON.stringify(tags || []),
        status || 'draft',
        is_breaking_news ? 1 : 0,
        is_featured      ? 1 : 0,
        author || null,
        published_at || null,
        views || 0,
      ]
    );

    const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    const article = parseRow(rows[0]);

    if (article.status === 'published') {
      publishArticleToFacebook(article).catch(() => {});
    }

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
    await db.query(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseRow(rows[0]));
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
