import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function parseRow(row) {
  return { ...row, is_active: Boolean(row.is_active) };
}

// GET /api/ticker
router.get('/', async (req, res) => {
  try {
    const { is_active, sort, limit } = req.query;
    const conditions = [];
    const params     = [];

    if (is_active !== undefined) {
      conditions.push('is_active = ?');
      params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
    }

    const where   = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const desc    = sort?.startsWith('-');
    const field   = sort ? (desc ? sort.slice(1) : sort) : 'order';
    const safeCol = ['order', 'created_at', 'headline'].includes(field) ? field : 'order';
    const orderBy = `ORDER BY \`${safeCol}\` ${desc ? 'DESC' : 'ASC'}`;
    const lim     = Math.min(parseInt(limit) || 100, 500);

    const [rows] = await db.query(
      `SELECT * FROM breaking_news_ticker ${where} ${orderBy} LIMIT ${lim}`,
      params
    );

    res.json(rows.map(parseRow));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ticker
router.post('/', requireAuth, async (req, res) => {
  try {
    const { headline, url, order, is_active } = req.body;
    const id = randomUUID();

    await db.query(
      'INSERT INTO breaking_news_ticker (id, headline, url, `order`, is_active) VALUES (?, ?, ?, ?, ?)',
      [id, headline, url || null, order ?? 0, is_active !== false ? 1 : 0]
    );

    const [rows] = await db.query('SELECT * FROM breaking_news_ticker WHERE id = ?', [id]);
    res.status(201).json(parseRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/ticker/:id
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const FIELDS  = ['headline', 'url', 'order', 'is_active'];
    const updates = [];
    const params  = [];

    for (const field of FIELDS) {
      if (!(field in req.body)) continue;
      updates.push(`\`${field}\` = ?`);
      params.push(field === 'is_active' ? (req.body[field] ? 1 : 0) : (req.body[field] ?? null));
    }

    if (!updates.length) return res.status(400).json({ error: 'Sin campos para actualizar' });

    params.push(id);
    await db.query(`UPDATE breaking_news_ticker SET ${updates.join(', ')} WHERE id = ?`, params);

    const [rows] = await db.query('SELECT * FROM breaking_news_ticker WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'No encontrado' });
    res.json(parseRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ticker/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM breaking_news_ticker WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
