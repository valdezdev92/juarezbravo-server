import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../server/db.js';
import ticker from '../server/routes/ticker.js';
import { tickerUrl } from '../shared/ticker.js';

const originalQuery = db.query;
const previousSecret = process.env.JWT_SECRET;
const queries = [];
let server, base, headers;

before(async () => {
  process.env.JWT_SECRET = 'ticker-tests-only';
  headers = {
    Authorization: `Bearer ${jwt.sign({ username: 'editor' }, process.env.JWT_SECRET)}`,
    'Content-Type': 'application/json',
  };
  db.query = async (sql, params) => {
    queries.push({ sql, params });
    return [[
      { id: 'legacy', headline: 'Titular anterior', url: null, is_active: 1, order: 0, ends_at: null },
      { id: 'linked', headline: 'Titular vinculado', article_id: 'article', article_slug: 'slug', is_active: 1, order: 1, ends_at: null },
    ]];
  };
  const app = express();
  app.use(express.json());
  app.use('/ticker', ticker);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/ticker`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  db.query = originalQuery;
  await db.end();
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

test('la cabecera usa la vigencia UTC y publica únicamente enlaces disponibles', async () => {
  const response = await fetch(`${base}?limit=30`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const { sql, params } = queries.at(-1);
  assert.match(sql, /WHERE t\.is_active = 1/);
  assert.match(sql, /t\.starts_at IS NULL OR t\.starts_at <= UTC_TIMESTAMP\(\)/);
  assert.match(sql, /t\.ends_at IS NULL OR t\.ends_at > UTC_TIMESTAMP\(\)/);
  assert.match(sql, /t\.article_id IS NULL OR \(a\.status = 'published'/);
  assert.deepEqual(params, [30]);
  const [legacy, linked] = await response.json();
  assert.equal(legacy.ends_at, null);
  assert.equal(linked.url, '/noticias/slug');
  assert.equal('article_id' in linked, false);
});

test('la lista completa y las escrituras requieren una sesión editorial', async () => {
  const queryCount = queries.length;
  assert.equal((await fetch(`${base}/admin`)).status, 401);
  assert.equal((await fetch(base, { method: 'POST' })).status, 401);
  assert.equal(queries.length, queryCount);
  assert.equal((await fetch(`${base}/admin`, { headers })).status, 200);
});

test('rechaza ventanas invertidas y enlaces inválidos antes de guardar', async () => {
  const queryCount = queries.length;
  for (const body of [
    { headline: ' ', url: '/noticias/slug' },
    { headline: 'Titular', url: 'javascript:alert(1)' },
    { headline: 'Titular', starts_at: '2027-03-02T00:00:00Z', ends_at: '2027-03-01T00:00:00Z' },
    { headline: 'Titular', ends_at: 'mañana' },
  ]) {
    const response = await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
  assert.equal(queries.length, queryCount);
});

test('normaliza enlaces web y conserva rutas internas', () => {
  assert.equal(tickerUrl('https://example.com'), 'https://example.com/');
  assert.equal(tickerUrl('/noticias/slug'), '/noticias/slug');
  for (const url of ['https:example.com', '//example.com', '/\\example.com', 'https://user@example.com']) {
    assert.equal(tickerUrl(url), null);
  }
});
