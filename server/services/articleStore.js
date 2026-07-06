/**
 * Acceso a la tabla `articles`, compartido entre la ruta HTTP (server/routes/articles.js)
 * y el importador (server/services/scraper.js). El importador NO debe llamarse a sí
 * mismo por HTTP (127.0.0.1) — bajo Phusion Passenger (cPanel) ese socket no es
 * alcanzable desde el propio proceso y toda publicación falla con ECONNREFUSED.
 */
import { randomUUID } from 'crypto';
import db from '../db.js';
import { publishArticleToFacebook } from './facebook.js';

export function parseRow(row) {
  return {
    ...row,
    tags:             row.tags ? JSON.parse(row.tags) : [],
    is_breaking_news: Boolean(row.is_breaking_news),
    is_featured:      Boolean(row.is_featured),
    created_date:     row.created_at, // compatibilidad con llamadas que usan created_date
  };
}

export async function createArticle(data) {
  const {
    title, slug, excerpt, body, cover_image, category, tags,
    status, is_breaking_news, is_featured, author, published_at, views,
  } = data;

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

  return article;
}

export async function listRecentTitles(limit = 500) {
  const [rows] = await db.query(
    `SELECT title FROM articles ORDER BY published_at DESC LIMIT ${Number(limit) || 500}`
  );
  return rows;
}
