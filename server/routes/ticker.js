import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { tickerUrl } from '../../shared/ticker.js';

const router = Router();
const fields = z.object({
  headline: z.string().trim().min(1).max(500),
  url: z.string().trim().max(1000).nullable().optional(),
  article_id: z.string().min(1).max(36).nullable().optional(),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
  order: z.number().int().min(0).max(2_147_483_647).optional(),
});

const articleJoin = 'LEFT JOIN articles a ON a.id = t.article_id';
const publishedLink = "a.status = 'published' AND a.slug IS NOT NULL AND a.slug <> ''";
const ordered = 't.`order` ASC, t.id ASC';

function parseRow(row) {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    url: row.article_id
      ? (row.article_slug ? `/noticias/${encodeURIComponent(row.article_slug)}` : null)
      : tickerUrl(row.url),
  };
}

const selectAdmin = `SELECT t.*, a.title AS article_title,
  CASE WHEN ${publishedLink} THEN a.slug END AS article_slug
  FROM breaking_news_ticker t ${articleJoin}`;

function readFields(schema, body) {
  const parsed = schema.safeParse(body);
  if (!parsed.success || !Object.keys(parsed.data).length) return null;
  const data = parsed.data;
  if ('url' in data) {
    const url = tickerUrl(data.url);
    if (data.url && (!url || url.length > 1000)) return null;
    data.url = url;
  }
  for (const field of ['starts_at', 'ends_at']) {
    if (data[field]) {
      const date = new Date(data[field]);
      if (date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) return null;
      date.setUTCMilliseconds(0);
      data[field] = date;
    }
  }
  return data;
}

function validWindow(start, end) {
  return !start || !end || start.getTime() < end.getTime();
}

async function isPublishedArticle(id, connection = db) {
  if (!id) return true;
  const [rows] = await db.query(`SELECT 1 FROM articles a WHERE a.id = ? AND ${publishedLink}`, [id]);
  return rows.length > 0;
}

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// La banda pública contiene únicamente titulares visibles en este momento.
router.get('/', async (req, res, next) => {
  try {
    const limit = Number(req.query.limit);
    const size = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 500) : 100;
    const [rows] = await db.query(`SELECT t.id, t.headline, t.url, t.article_id, t.ends_at, t.is_active, t.\`order\`,
      CASE WHEN ${publishedLink} THEN a.slug END AS article_slug
      FROM breaking_news_ticker t ${articleJoin}
      WHERE t.is_active = 1
        AND (t.starts_at IS NULL OR t.starts_at <= UTC_TIMESTAMP())
        AND (t.ends_at IS NULL OR t.ends_at > UTC_TIMESTAMP())
        AND (t.article_id IS NULL OR (${publishedLink}))
      ORDER BY ${ordered} LIMIT ?`, [size]);
    res.json(rows.map(row => {
      const { id, headline, url, ends_at, order, is_active } = parseRow(row);
      return { id, headline, url, ends_at, order, is_active };
    }));
  } catch (err) { next(err); }
});

router.get('/admin', requireAuth, async (_req, res, next) => {
  try {
    const [rows] = await db.query(`${selectAdmin} ORDER BY ${ordered}`);
    res.json(rows.map(parseRow));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = readFields(fields, req.body);
    if (!data) return res.status(400).json({ error: 'Revisa el titular, el enlace y las fechas.' });
    const { headline, url, article_id, starts_at, ends_at, is_active, order } = data;
    if (!validWindow(starts_at, ends_at)) {
      return res.status(400).json({ error: 'El fin debe ser posterior al inicio.' });
    }
    if (!(await isPublishedArticle(article_id))) {
      return res.status(400).json({ error: 'Selecciona una noticia publicada con enlace público.' });
    }

    const id = randomUUID();
    await db.query(
      `INSERT INTO breaking_news_ticker (id, headline, url, article_id, starts_at, ends_at, is_active, \`order\`)
       SELECT ?, ?, ?, ?, ?, ?, ?, COALESCE(?, MAX(\`order\`) + 1, 0) FROM breaking_news_ticker`,
      [id, headline, article_id ? null : url ?? null, article_id ?? null,
        starts_at ?? null, ends_at ?? null, is_active !== false ? 1 : 0, order ?? null]
    );
    const [[row]] = await db.query(`${selectAdmin} WHERE t.id = ?`, [id]);
    res.status(201).json(parseRow(row));
  } catch (err) { next(err); }
});

// Un movimiento usa el orden actual en la base y guarda todas las posiciones juntas.
router.post('/:id/move', requireAuth, async (req, res, next) => {
  const direction = req.body?.direction;
  if (direction !== -1 && direction !== 1) {
    return res.status(400).json({ error: 'Dirección inválida.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id, `order` FROM breaking_news_ticker ORDER BY `order`, id FOR UPDATE');
    const index = rows.findIndex(row => row.id === req.params.id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= rows.length) {
      await connection.rollback();
      return res.status(409).json({ error: 'El orden cambió. Actualiza la lista e inténtalo de nuevo.' });
    }
    [rows[index], rows[destination]] = [rows[destination], rows[index]];
    const updates = rows.map((row, order) => ({ ...row, newOrder: order })).filter(row => row.order !== row.newOrder);
    if (updates.length) {
      const positions = updates.map(() => 'WHEN ? THEN ?').join(' ');
      await connection.query(
        `UPDATE breaking_news_ticker SET \`order\` = CASE id ${positions} END WHERE id IN (?)`,
        [...updates.flatMap(row => [row.id, row.newOrder]), updates.map(row => row.id)]
      );
    }
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    connection?.release();
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  const data = readFields(fields.partial(), req.body);
  if (!data) return res.status(400).json({ error: 'Revisa el titular, el enlace y las fechas.' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const { id } = req.params;
    const [[current]] = await connection.query('SELECT * FROM breaking_news_ticker WHERE id = ? FOR UPDATE', [id]);
    if (!current) {
      await connection.rollback();
      return res.status(404).json({ error: 'Titular no encontrado.' });
    }

    const merged = { ...current, ...data };
    if (!validWindow(merged.starts_at, merged.ends_at)) {
      await connection.rollback();
      return res.status(400).json({ error: 'El fin debe ser posterior al inicio.' });
    }
    if (merged.article_id !== current.article_id && !(await isPublishedArticle(merged.article_id, connection))) {
      await connection.rollback();
      return res.status(400).json({ error: 'Selecciona una noticia publicada con enlace público.' });
    }
    if (merged.article_id && ('url' in data || 'article_id' in data)) data.url = null;

    const updates = Object.entries(data);
    await connection.query(
      `UPDATE breaking_news_ticker SET ${updates.map(([field]) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
      [...updates.map(([, value]) => value), id]
    );
    const [[row]] = await connection.query(`${selectAdmin} WHERE t.id = ?`, [id]);
    await connection.commit();
    res.json(parseRow(row));
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    connection?.release();
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await db.query('DELETE FROM breaking_news_ticker WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
