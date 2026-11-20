import db from '../db.js';
import { parseRow } from './articleStore.js';

// Los cuerpos completos se consultan únicamente al abrir el detalle/editor.
export const SUMMARY_COLUMNS = `id, title, slug, excerpt, cover_image, category, tags,
  status, is_breaking_news, is_featured, featured_until, author, published_at,
  views, created_at, updated_at`;

export const HOME_CATEGORIES = ['seguridad', 'politica', 'deportes', 'entretenimiento'];

const SORT_FIELDS = {
  published_at: 'published_at', created_at: 'created_at',
  created_date: 'created_at', title: 'title', views: 'views',
};

function integer(value, fallback, max) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function buildArticleQuery(query = {}, admin = false) {
  const conditions = [];
  const params = [];
  const add = (sql, value) => { conditions.push(sql); params.push(value); };
  if (!admin) add('status = ?', 'published');
  else if (['published', 'draft'].includes(query.status)) add('status = ?', query.status);
  if (admin && query.placement === 'breaking') conditions.push('is_breaking_news = 1');
  if (admin && query.placement === 'featured') conditions.push("is_featured = 1 AND (featured_until IS NULL OR featured_until > UTC_TIMESTAMP())");
  for (const field of ['category', 'slug', 'id']) {
    if (typeof query[field] === 'string' && query[field]) add(`${field} = ?`, query[field]);
  }
  if (typeof query.exclude === 'string' && query.exclude) add('id != ?', query.exclude);
  if (typeof query.tag === 'string' && query.tag) add('JSON_CONTAINS(tags, ?)', JSON.stringify(query.tag));
  if (typeof query.search === 'string' && query.search.trim()) {
    // Prefijos por palabra, sin permitir operadores booleanos suministrados por el cliente.
    const words = query.search.slice(0, 200).match(/[\p{L}\p{N}]+/gu) || [];
    if (words.length) add('MATCH(title, excerpt, body) AGAINST (? IN BOOLEAN MODE)', words.map(word => `+${word}*`).join(' '));
    else conditions.push('1 = 0');
  }
  const sort = typeof query.sort === 'string' ? query.sort : (admin ? '-created_at' : '-published_at');
  const descending = sort.startsWith('-');
  const field = SORT_FIELDS[sort.replace(/^-/, '')] || (admin ? 'created_at' : 'published_at');
  const direction = descending ? 'DESC' : 'ASC';
  const page = integer(query.page, 1, 1_000_000);
  const pageSize = integer(query.limit, 24, 100);
  return {
    where: `WHERE ${conditions.length ? conditions.join(' AND ') : '1 = 1'}`,
    params, order: `${field} ${direction}, id ${direction}`,
    page, pageSize, offset: (page - 1) * pageSize,
  };
}

export async function listArticles(query, admin = false) {
  const { where, params, order, page, pageSize, offset } = buildArticleQuery(query, admin);
  const [rows] = await db.query(
    `SELECT ${SUMMARY_COLUMNS} FROM articles ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, pageSize + 1, offset]
  );
  const result = { items: rows.slice(0, pageSize).map(parseRow), page, pageSize, hasMore: rows.length > pageSize };
  if (admin) {
    const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM articles ${where}`, params);
    result.total = Number(count.total);
  }
  return result;
}

export async function getHomeArticles() {
  const [recent, hero, ...categories] = await Promise.all([
    db.query(`SELECT ${SUMMARY_COLUMNS} FROM articles WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 27`),
    db.query(`SELECT ${SUMMARY_COLUMNS} FROM articles WHERE status = 'published' AND is_featured = 1
      AND (featured_until IS NULL OR featured_until > UTC_TIMESTAMP()) ORDER BY published_at DESC, id DESC LIMIT 1`),
    ...HOME_CATEGORIES.map(category => db.query(
      `SELECT ${SUMMARY_COLUMNS} FROM articles WHERE status = 'published' AND category = ? ORDER BY published_at DESC, id DESC LIMIT 5`, [category]
    )),
  ]);
  const lead = hero[0][0];
  return {
    articles: (lead ? [lead, ...recent[0].filter(row => row.id !== lead.id)] : recent[0]).map(parseRow),
    categories: Object.fromEntries(HOME_CATEGORIES.map((category, index) => [category, categories[index][0].map(parseRow)])),
  };
}
