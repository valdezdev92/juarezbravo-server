/**
 * Acceso a la tabla `articles`, compartido entre la ruta HTTP (server/routes/articles.js)
 * y el importador (server/services/scraper.js). El importador NO debe llamarse a sí
 * mismo por HTTP (127.0.0.1) — bajo Phusion Passenger (cPanel) ese socket no es
 * alcanzable desde el propio proceso y toda publicación falla con ECONNREFUSED.
 */
import { randomUUID } from 'crypto';
import db from '../db.js';
import { publishArticleToFacebook } from './facebook.js';
import { publishArticleToInstagram } from './instagram.js';
import { isImageUrlValid } from './imageCheck.js';

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
    is_breaking_news, is_featured, author, published_at, views,
  } = data;

  let status = data.status || 'draft';

  // Una nota publicada sin imagen (o con una imagen rota/inaccesible) se ve
  // peor que una nota sin publicar — se guarda como borrador en su lugar.
  if (status === 'published' && !(await isImageUrlValid(cover_image))) {
    console.warn(`[Articles] "${(title || '').slice(0, 70)}" no tiene una imagen de portada válida — se guarda como borrador en vez de publicarse.`);
    status = 'draft';
  }

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
      status,
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
    publishArticleToInstagram(article).catch(() => {});
  }

  return article;
}

export async function listRecentTitles(limit = 500) {
  const [rows] = await db.query(
    `SELECT title FROM articles ORDER BY published_at DESC LIMIT ${Number(limit) || 500}`
  );
  return rows;
}

export async function getArticleById(id) {
  const [rows] = await db.query('SELECT * FROM articles WHERE id = ?', [id]);
  return rows[0] ? parseRow(rows[0]) : null;
}

export async function getArticleBySlug(slug) {
  const [rows] = await db.query('SELECT * FROM articles WHERE slug = ?', [slug]);
  return rows[0] ? parseRow(rows[0]) : null;
}

export async function getRecentPublished(limit = 10) {
  const [rows] = await db.query(
    `SELECT id, title, slug, category, published_at
       FROM articles
      WHERE status = 'published'
      ORDER BY published_at DESC
      LIMIT ${Number(limit) || 10}`
  );
  return rows;
}

export async function getCurrentHero() {
  const [rows] = await db.query(
    `SELECT * FROM articles WHERE is_featured = 1 ORDER BY updated_at DESC LIMIT 1`
  );
  return rows[0] ? parseRow(rows[0]) : null;
}

/**
 * Asigna el hero a `id` y quita el flag a cualquier otro artículo.
 * `featuredUntil` es un Date o null (permanente).
 */
export async function setHero(id, featuredUntil) {
  await db.query(
    `UPDATE articles SET is_featured = 0, featured_until = NULL WHERE is_featured = 1 AND id != ?`,
    [id]
  );
  await db.query(
    `UPDATE articles SET is_featured = 1, featured_until = ? WHERE id = ?`,
    [featuredUntil || null, id]
  );
  return getArticleById(id);
}

/**
 * Quita el flag de hero a artículos cuyo featured_until ya venció.
 * Devuelve cuántos se limpiaron (para logging del cron).
 */
export async function clearExpiredHeroes() {
  const [result] = await db.query(
    `UPDATE articles
        SET is_featured = 0, featured_until = NULL
      WHERE is_featured = 1
        AND featured_until IS NOT NULL
        AND featured_until <= NOW()`
  );
  return result.affectedRows;
}
