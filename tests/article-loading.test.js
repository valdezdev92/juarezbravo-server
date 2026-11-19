import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../server/db.js';
import publicRouter from '../server/routes/articles.js';
import adminRouter from '../server/routes/adminArticles.js';
import imagesRouter from '../server/routes/images.js';
import { buildArticleQuery } from '../server/services/articleQueries.js';
import { parseRow } from '../server/services/articleStore.js';
import { QueryClient } from '@tanstack/react-query';
import { articleKeys, invalidateArticles } from '../src/lib/article-queries.js';

// Aislamos MySQL: estas pruebas verifican el contrato HTTP y el acceso a datos,
// no sustituyen EXPLAIN ni las pruebas de la migración en el servidor MySQL.
const fixtures = Array.from({ length: 530 }, (_, index) => ({
  id: `article-${index}`, slug: `noticia-${index}`, title: `Noticia ${index}`,
  status: index === 0 ? 'draft' : 'published', category: index % 2 ? 'seguridad' : 'deportes',
  body: `<p>Texto completo ${index}</p>`, tags: index % 2 ? '["juarez"]' : ['deporte'],
  cover_image: '/uploads/test-missing-image.png',
  is_featured: index === 529 ? 1 : 0, is_breaking_news: 0,
  featured_until: null, views: 1, created_at: new Date(2026, 0, 1),
}));
const queries = [];
const originalQuery = db.query;
const previousSecret = process.env.JWT_SECRET;
let server, base, headers;

before(async () => {
  process.env.JWT_SECRET = 'article-loading-tests-only';
  headers = { Authorization: `Bearer ${jwt.sign({ username: 'editor' }, process.env.JWT_SECRET)}` };
  db.query = async (sql, params = []) => {
    queries.push({ sql, params });
    let rows = fixtures;
    if (sql.includes("status = 'published'") || (sql.includes('status = ?') && params[0] === 'published')) rows = rows.filter(row => row.status === 'published');
    else if (sql.includes('status = ?') && params[0] === 'draft') rows = rows.filter(row => row.status === 'draft');
    if (sql.includes('(slug = ? OR id = ?)')) rows = rows.filter(row => row.slug === params[0] || row.id === params[1]);
    else if (sql.includes('WHERE id = ?')) rows = rows.filter(row => row.id === params[0]);
    if (sql.includes('category = ?')) rows = rows.filter(row => row.category === params[sql.includes('status = ?') ? 1 : 0]);
    if (sql.includes('is_featured = 1')) rows = rows.filter(row => row.is_featured);
    if (sql.includes('COUNT(*) AS total') && !sql.includes('SUM(')) return [[{ total: rows.length }]];
    if (sql.includes('SUM(')) return [[{ total: 530, published: 529, drafts: 1, breaking: 0, totalViews: 530 }]];
    if (sql.startsWith('SELECT tags ')) return [rows.map(({ tags }) => ({ tags }))];
    if (sql.includes('LIMIT ? OFFSET ?')) rows = rows.slice(params.at(-1), params.at(-1) + params.at(-2));
    else if (sql.match(/LIMIT (\d+)/)) rows = rows.slice(0, Number(sql.match(/LIMIT (\d+)/)[1]));
    if (!sql.startsWith('SELECT *')) rows = rows.map(({ body: _body, ...summary }) => summary);
    return [rows];
  };
  const app = express();
  app.use('/api/articles', publicRouter);
  app.use('/api/admin/articles', adminRouter);
  app.use('/api/images', imagesRouter);
  app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.query = originalQuery;
  await db.end();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('ningún listado público acepta leer borradores, incluso con un JWT administrativo', async () => {
  for (const options of [{}, { headers }]) {
    const response = await fetch(`${base}/api/articles?status=draft&limit=100`, options);
    assert.equal(response.status, 200);
    const page = await response.json();
    assert.ok(page.items.length > 0);
    assert.ok(page.items.every(article => article.status === 'published' && !('body' in article)));
  }
});

test('los borradores son 404 por slug e ID en el detalle público', async () => {
  for (const key of ['noticia-0', 'article-0']) {
    assert.equal((await fetch(`${base}/api/articles/${key}`)).status, 404);
  }
  const response = await fetch(`${base}/api/articles/noticia-1`);
  assert.equal((await response.json()).body, fixtures[1].body);
});

test('las miniaturas solo admiten anchos conocidos y noticias publicadas; los fallos no se cachean', async () => {
  assert.equal((await fetch(`${base}/api/images/article-1/999.webp`)).status, 400);
  assert.equal((await fetch(`${base}/api/images/article-0/160.webp`)).status, 404);
  const response = await fetch(`${base}/api/images/article-1/160.webp`);
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('todas las lecturas administrativas requieren autenticación y no se cachean', async () => {
  for (const suffix of ['', '/stats', '/tags', '/article-0']) {
    const count = queries.length;
    const response = await fetch(`${base}/api/admin/articles${suffix}`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(queries.length, count);
  }
  assert.equal((await fetch(`${base}/api/admin/articles`, { headers: { Authorization: 'Bearer invalido' } })).status, 401);
});

test('la paginación pública devuelve páginas distintas y acota tamaños inválidos', async () => {
  const first = await (await fetch(`${base}/api/articles?limit=24&page=1`)).json();
  const second = await (await fetch(`${base}/api/articles?limit=24&page=2`)).json();
  assert.equal(first.items.length, 24);
  assert.equal(second.page, 2);
  assert.equal(second.hasMore, true);
  assert.ok(!second.items.some(article => first.items.some(previous => previous.id === article.id)));
  const bad = buildArticleQuery({ page: '-2', limit: '-10', sort: '-DROP TABLE articles' });
  assert.equal(bad.offset, 0);
  assert.equal(bad.pageSize, 24);
  assert.equal(buildArticleQuery({ limit: 2000 }).pageSize, 100);
  assert.ok(!bad.order.includes('DROP'));
});

test('el administrador pagina todo el archivo y abre un borrador o una nota anterior a las últimas 500', async () => {
  const page = await (await fetch(`${base}/api/admin/articles?limit=25&page=22`, { headers })).json();
  assert.equal(page.items.length, 5);
  assert.equal(page.total, 530);
  assert.equal(page.hasMore, false);
  assert.ok(page.items.every(article => !('body' in article)));
  for (const index of [0, 529]) {
    const article = await (await fetch(`${base}/api/admin/articles/article-${index}`, { headers })).json();
    assert.equal(article.body, fixtures[index].body);
  }
});

test('portada incluye un hero antiguo y resúmenes por categoría en una sola respuesta', async () => {
  const home = await (await fetch(`${base}/api/articles/home`)).json();
  assert.equal(home.articles[0].id, 'article-529');
  assert.equal(home.articles.filter(row => row.id === 'article-529').length, 1);
  assert.ok(home.articles.length <= 28);
  assert.ok(home.articles.every(row => !('body' in row) && row.status === 'published'));
  assert.equal(home.categories.seguridad.length, 5);
  assert.equal(home.categories.deportes.length, 5);
});

test('estadísticas y etiquetas cubren todo el archivo, sin descargar los cuerpos', async () => {
  const stats = await (await fetch(`${base}/api/admin/articles/stats`, { headers })).json();
  assert.equal(stats.total, 530);
  assert.equal(stats.recent.length, 6);
  const tags = await (await fetch(`${base}/api/admin/articles/tags`, { headers })).json();
  assert.deepEqual(tags, [['deporte', 265], ['juarez', 265]]);
});

test('búsqueda usa FULLTEXT con parámetros y acepta acentos y prefijos', () => {
  const query = buildArticleQuery({ search: 'Juárez +políti* -"seguridad"' });
  assert.match(query.where, /MATCH\(title, excerpt, body\) AGAINST \(\? IN BOOLEAN MODE\)/);
  assert.deepEqual(query.params, ['published', '+Juárez* +políti* +seguridad*']);
  assert.ok(!query.where.includes('LIKE'));
  assert.match(buildArticleQuery({ search: '***' }).where, /1 = 0/);
});

test('tags funciona con el JSON nativo de MySQL y el texto de MariaDB', () => {
  assert.deepEqual(parseRow({ tags: ['juarez'] }).tags, ['juarez']);
  assert.deepEqual(parseRow({ tags: '["juarez"]' }).tags, ['juarez']);
});

test('editar o eliminar invalida portada, categorías, búsquedas, relacionados, etiquetas y administrador', async () => {
  const client = new QueryClient();
  const keys = [articleKeys.home, articleKeys.list({ category: 'seguridad' }), articleKeys.list({ tag: 'juarez' }),
    articleKeys.list({ search: 'juarez' }), articleKeys.detail('noticia'), articleKeys.related('seguridad', 'id'),
    articleKeys.adminList({ page: 2 }), articleKeys.adminDetail('id'), articleKeys.stats, articleKeys.tags];
  for (const key of keys) client.setQueryData(key, { example: true });
  client.setQueryData(['ticker'], []);
  await invalidateArticles(client);
  assert.ok(keys.every(key => client.getQueryState(key).isInvalidated));
  assert.equal(client.getQueryState(['ticker']).isInvalidated, false);
  client.clear();
});
