/**
 * JuarezBravo.com — Importador de noticias
 *
 * Obtiene las noticias desde la API propia de NoticiasMessenger (ya no se
 * scrapea puentelibre.mx ni se depende de GitHub Actions). Cada noticia
 * sigue pasando por OpenAI para: (1) verificar marca de agua en la imagen y
 * (2) reescribir título/cuerpo antes de publicarla.
 *
 * Config vía env:
 *   NEWS_API_URL    (default: https://sysatelier.online/NoticiasMessenger/API/consulta.php)
 *   NEWS_API_TOKEN   (requerido)
 *   NEWS_API_MEDIO   (default: PuenteLibre)
 *   NEWS_API_LIMIT   (default: 100 — cuántas noticias trae la API por consulta)
 *   NEWS_BATCH_SIZE  (default: 10 — cuántas se publican por ciclo, de la más antigua a la más nueva)
 */
import OpenAI from 'openai';
import axios from 'axios';
import { createHash } from 'crypto';
import db from '../db.js';

const NEWS_API_URL   = process.env.NEWS_API_URL || 'https://sysatelier.online/NoticiasMessenger/API/consulta.php';
const NEWS_API_MEDIO  = process.env.NEWS_API_MEDIO || 'PuenteLibre';
const NEWS_API_LIMIT  = parseInt(process.env.NEWS_API_LIMIT, 10) || 100;
const NEWS_BATCH_SIZE = parseInt(process.env.NEWS_BATCH_SIZE, 10) || 10;

const DELAY_MS = 2500;

// Mapea el segmento de sección en la URL fuente (p.ej. puentelibre.mx/deportes/...)
// a la categoría interna. `null` deja que la IA elija entre VALID_CATEGORIES.
const CATEGORY_MAP = {
  local:        null,
  deportes:     'deportes',
  espectaculos: 'entretenimiento',
  nacional:     'politica',
  economia:     'politica',
  internacional: 'politica',
};

const VALID_CATEGORIES = ['seguridad', 'politica', 'deportes', 'entretenimiento'];

const BLOCKED_IMAGE_DOMAINS = ['puentelibre.mx', 'puentelibre.com'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function uniqueSlug(title) {
  return `${slugify(title)}-${Date.now().toString(36)}`;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function hashUrl(url) {
  return createHash('sha256').update(url).digest('hex');
}

async function isProcessed(url) {
  const [rows] = await db.query(
    'SELECT 1 FROM scraper_processed_urls WHERE url_hash = ? LIMIT 1',
    [hashUrl(url)]
  );
  return rows.length > 0;
}

async function markProcessed(url) {
  await db.query(
    'INSERT IGNORE INTO scraper_processed_urls (url, url_hash) VALUES (?, ?)',
    [url.slice(0, 1000), hashUrl(url)]
  );
}

// ─── Obtención de noticias vía API ────────────────────────────────────────────

function sourceCategoryFromLink(link) {
  const match = (link || '').match(/puentelibre\.mx\/([^/]+)\//);
  return match?.[1] || 'local';
}

function cleanContenido(raw) {
  let text = raw || '';

  // Todo lo que venga después de "Las Más Leídas" es contenido relacionado, no de la nota.
  const idx = text.indexOf('Las Más Leídas');
  if (idx !== -1) text = text.slice(0, idx);

  const seen = new Set();
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .filter((p) => !/^\.[a-zA-Z0-9_-]+\s*\{/.test(p))   // reglas CSS sueltas del scraping origen
    .filter((p) => !/^https?:\/\//.test(p))
    .filter((p) => {
      // el primer párrafo suele repetirse (uno trae "Por: Redacción <fecha>" al final)
      const key = p.replace(/\s*Por:\s*Redacción.*$/i, '').trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n\n');
}

async function fetchNoticias() {
  const token = process.env.NEWS_API_TOKEN;
  if (!token) throw new Error('NEWS_API_TOKEN no configurada');

  const { data } = await axios.get(NEWS_API_URL, {
    params: { token, medio: NEWS_API_MEDIO, limit: NEWS_API_LIMIT },
    timeout: 20_000,
  });

  if (!data?.ok) throw new Error(data?.error || 'Respuesta inválida de la API de noticias');

  const noticias = (data.noticias || []).map((n) => ({
    title:          n.titulo || '',
    body:           cleanContenido(n.contenido),
    imageUrl:       n.imagen || '',
    sourceUrl:      n.link,
    sourceCategory: sourceCategoryFromLink(n.link),
    publishedAt:    n.fecha_pub,
  }));

  // De la más antigua a la más nueva — así se van agregando en ese orden.
  noticias.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

  return noticias;
}

// ─── Watermark detection ──────────────────────────────────────────────────────

function imageFromBlockedDomain(imageUrl) {
  try {
    const { hostname } = new URL(imageUrl);
    return BLOCKED_IMAGE_DOMAINS.some((d) => hostname.includes(d));
  } catch { return false; }
}

async function hasPuenteLibreWatermark(imageUrl, openai) {
  if (!imageUrl) return false;
  if (imageFromBlockedDomain(imageUrl)) return true;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this image carefully. Does it contain a visible watermark, logo, or text that says "Puente Libre", "puentelibre.mx", or "puentelibre.com"? Answer only YES or NO. Do NOT flag watermarks from other outlets.' },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      }],
      max_tokens: 5,
    });
    const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? 'NO';
    return answer.startsWith('YES');
  } catch {
    return false;
  }
}

// ─── OpenAI rewriting ─────────────────────────────────────────────────────────

async function rewriteArticle(title, body, sourceCategory, defaultCategory, openai) {
  const categoryHint = defaultCategory
    ? `La categoría de origen es "${sourceCategory}", mapéala a: ${defaultCategory}.`
    : `La categoría de origen es "${sourceCategory}" (noticias locales de Juárez). Elige la categoría más apropiada.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Eres editor de JuarezBravo.com, portal de noticias de Ciudad Juárez, México.
Tu tarea: reescribir artículos con palabras distintas preservando todos los datos, hechos y cifras.
Usa tono periodístico profesional en español mexicano.

Responde ÚNICAMENTE en JSON válido con esta estructura exacta:
{
  "title": "Titular reescrito (máx 120 chars)",
  "excerpt": "Resumen de 2-3 oraciones",
  "body": "Cuerpo completo en HTML usando <p>, <h2>, <h3>, <blockquote>",
  "category": "una de: seguridad | politica | deportes | entretenimiento"
}

${categoryHint}`,
      },
      { role: 'user', content: `Título original: ${title}\n\nContenido:\n${body.slice(0, 4000)}` },
    ],
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  if (!VALID_CATEGORIES.includes(parsed.category)) {
    parsed.category = defaultCategory || 'seguridad';
  }
  return parsed;
}

// ─── API client (publica vía localhost) ───────────────────────────────────────

function buildApiClient() {
  const port      = process.env.PORT || 3000;
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) throw new Error('SCRAPER_API_KEY no configurada');

  return axios.create({
    baseURL: `http://127.0.0.1:${port}/api`,
    headers: { 'x-api-key': scraperKey, 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
}

async function getRecentTitles(apiClient) {
  const res = await apiClient.get('/articles?sort=-published_at&limit=500');
  return res.data;
}

async function publishArticle(apiClient, data) {
  const res = await apiClient.post('/articles', data);
  return res.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Ejecuta un ciclo del importador. Devuelve los conteos finales.
 * NO captura sus propias excepciones — el caller decide qué hacer.
 */
export async function runScraperCycle() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }

  const apiClient = buildApiClient();
  const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const counts = { published: 0, skipped: 0, errors: 0 };

  const publishedTitleSlugs = new Set();
  try {
    const recent = await getRecentTitles(apiClient);
    for (const a of recent) publishedTitleSlugs.add(slugify(a.title));
    console.log(`[Importador] ${publishedTitleSlugs.size} títulos existentes cargados para dedup`);
  } catch (err) {
    console.warn(`[Importador] No se pudo cargar dedup de títulos: ${err.message}`);
  }

  const noticias = await fetchNoticias();

  let attempted = 0;
  for (const noticia of noticias) {
    if (attempted >= NEWS_BATCH_SIZE) break;

    const { sourceUrl } = noticia;
    if (!sourceUrl || (await isProcessed(sourceUrl))) continue;

    attempted++;

    try {
      if (!noticia.title || noticia.body.length < 80) {
        await markProcessed(sourceUrl);
        counts.skipped++;
        continue;
      }

      const titleSlug = slugify(noticia.title);
      if (publishedTitleSlugs.has(titleSlug)) {
        await markProcessed(sourceUrl);
        counts.skipped++;
        continue;
      }
      publishedTitleSlugs.add(titleSlug);

      if (await hasPuenteLibreWatermark(noticia.imageUrl, openai)) {
        await markProcessed(sourceUrl);
        counts.skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      const defaultCategory = CATEGORY_MAP[noticia.sourceCategory] ?? null;
      const rewritten = await rewriteArticle(
        noticia.title, noticia.body, noticia.sourceCategory, defaultCategory, openai
      );

      const slug = uniqueSlug(rewritten.title);
      await publishArticle(apiClient, {
        title:            rewritten.title,
        slug,
        excerpt:          rewritten.excerpt,
        body:             rewritten.body,
        cover_image:      noticia.imageUrl || null,
        category:         rewritten.category,
        status:           'published',
        published_at:     new Date().toISOString(),
        is_breaking_news: false,
        is_featured:      false,
        author:           'Redacción JuarezBravo',
        views:            0,
        tags:             [],
      });

      await markProcessed(sourceUrl);
      counts.published++;
      console.log(`[Importador] ✓ Publicado [${rewritten.category}] ${rewritten.title.slice(0, 70)}`);
    } catch (err) {
      console.error(`[Importador] ✗ ${sourceUrl}: ${err.message}`);
      const isTransient =
        ['ECONNABORTED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'].includes(err.code) ||
        (err.response?.status >= 500 && err.response?.status < 600);
      if (!isTransient) {
        await markProcessed(sourceUrl);
      }
      counts.errors++;
    }

    await sleep(DELAY_MS);
  }

  return counts;
}
