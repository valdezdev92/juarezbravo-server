/**
 * JuarezBravo.com — Scraper in-process
 *
 * Versión del scraper que corre dentro del server Express, programada por
 * node-cron. Usa MySQL para deduplicar URLs procesadas (en lugar del
 * processed.json del scraper standalone) y publica vía HTTP a localhost.
 */
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import db from '../db.js';

const BASE_URL                = 'https://puentelibre.mx';
const MAX_ARTICLES_PER_SECTION = 8;
const DELAY_MS                = 2500;

const SECTIONS = [
  { url: `${BASE_URL}/local/`,        defaultCategory: null },
  { url: `${BASE_URL}/deportes/`,     defaultCategory: 'deportes' },
  { url: `${BASE_URL}/espectaculos/`, defaultCategory: 'entretenimiento' },
  { url: `${BASE_URL}/nacional/`,     defaultCategory: 'politica' },
  { url: `${BASE_URL}/economia/`,     defaultCategory: 'politica' },
];

const VALID_CATEGORIES = ['seguridad', 'politica', 'deportes', 'entretenimiento'];

const HTTP_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (compatible; JuarezBravoBot/1.0)',
  'Accept-Language': 'es-MX,es;q=0.9',
};

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

// ─── Scraping ─────────────────────────────────────────────────────────────────

async function getArticleLinks(sectionUrl) {
  const { data } = await axios.get(sectionUrl, { headers: HTTP_HEADERS, timeout: 20_000 });
  const $ = cheerio.load(data);
  const seen = new Set();
  const links = [];

  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') || '';
    if (!href.startsWith('http')) href = `${BASE_URL}${href}`;
    if (
      href.includes('puentelibre.mx') &&
      href.split('/').filter(Boolean).length >= 4 &&
      !/\/(tag|autor|author|page|categoria|category|\?|#)/.test(href) &&
      !href.includes('/slugnoticia/') &&
      !seen.has(href)
    ) {
      seen.add(href);
      links.push(href);
    }
  });

  return links.slice(0, MAX_ARTICLES_PER_SECTION);
}

async function scrapeArticle(url) {
  const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: 20_000 });
  const $ = cheerio.load(data);

  const title =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().replace(/\s*[-|].*$/, '').trim() || '';

  const ogImage  = $('meta[property="og:image"]').attr('content') || '';
  const firstImg = $('img[src]').toArray()
    .map((el) => $(el).attr('src') || '')
    .find((src) => src.startsWith('http') && /\.(jpe?g|png|webp)/i.test(src)) || '';
  const imageUrl = ogImage || firstImg;

  $('nav, header, footer, aside, .sidebar, .widget, .related, .comments, .comment, script, style, noscript, .social, .share, .tags, .breadcrumb, .pagination, form, iframe, .advertisement, .ad, .banner').remove();

  const contentSelectors = ['.entry-content','.post-content','.td-post-content','.article-body','.article-content','.single-content','.post-body','.content-inner','.nota-texto','.cuerpo-nota','article'];
  let bodyParts = [];

  for (const sel of contentSelectors) {
    const container = $(sel).first();
    if (container.length) {
      container.find('p, blockquote').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 40) bodyParts.push(text);
      });
      if (bodyParts.length >= 2) break;
    }
  }

  if (bodyParts.length < 2) {
    bodyParts = [];
    $('p, blockquote').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 60) bodyParts.push(text);
    });
  }

  const seen = new Set();
  const body = bodyParts.filter((t) => { if (seen.has(t)) return false; seen.add(t); return true; }).join('\n\n');

  const match = url.match(/puentelibre\.mx\/([^/]+)\//);
  const sourceCategory = match?.[1] || 'local';

  return { title, body, imageUrl, sourceCategory, sourceUrl: url };
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
 * Ejecuta un ciclo del scraper. Devuelve los conteos finales.
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
    console.log(`[Scraper] ${publishedTitleSlugs.size} títulos existentes cargados para dedup`);
  } catch (err) {
    console.warn(`[Scraper] No se pudo cargar dedup de títulos: ${err.message}`);
  }

  for (const section of SECTIONS) {
    let links;
    try {
      links = await getArticleLinks(section.url);
    } catch (err) {
      console.error(`[Scraper] Sección ${section.url} falló: ${err.message}`);
      counts.errors++;
      continue;
    }

    for (const url of links) {
      if (await isProcessed(url)) continue;

      try {
        const article = await scrapeArticle(url);

        if (!article.title || article.body.length < 80) {
          await markProcessed(url);
          counts.skipped++;
          continue;
        }

        const titleSlug = slugify(article.title);
        if (publishedTitleSlugs.has(titleSlug)) {
          await markProcessed(url);
          counts.skipped++;
          continue;
        }
        publishedTitleSlugs.add(titleSlug);

        if (await hasPuenteLibreWatermark(article.imageUrl, openai)) {
          await markProcessed(url);
          counts.skipped++;
          await sleep(DELAY_MS);
          continue;
        }

        const rewritten = await rewriteArticle(
          article.title, article.body, article.sourceCategory, section.defaultCategory, openai
        );

        const slug = uniqueSlug(rewritten.title);
        await publishArticle(apiClient, {
          title:            rewritten.title,
          slug,
          excerpt:          rewritten.excerpt,
          body:             rewritten.body,
          cover_image:      article.imageUrl || null,
          category:         rewritten.category,
          status:           'published',
          published_at:     new Date().toISOString(),
          is_breaking_news: false,
          is_featured:      false,
          author:           'Redacción JuarezBravo',
          views:            0,
          tags:             [],
        });

        await markProcessed(url);
        counts.published++;
        console.log(`[Scraper] ✓ Publicado [${rewritten.category}] ${rewritten.title.slice(0, 70)}`);
      } catch (err) {
        console.error(`[Scraper] ✗ ${url}: ${err.message}`);
        await markProcessed(url);
        counts.errors++;
      }

      await sleep(DELAY_MS);
    }
  }

  return counts;
}
