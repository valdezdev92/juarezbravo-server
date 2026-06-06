/**
 * JuarezBravo.com — News Scraper
 *
 * Scrapes puentelibre.mx, rewrites content with OpenAI,
 * and publishes to the self-hosted API (Node.js + MySQL).
 */

import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL       = process.env.API_URL || 'http://localhost:3000';
const SCRAPER_KEY   = process.env.SCRAPER_API_KEY;
const openai        = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── API Client ───────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'x-api-key': SCRAPER_KEY, 'Content-Type': 'application/json' },
  timeout: 30_000,
});

async function publishArticle(data) {
  const res = await apiClient.post('/articles', data);
  return res.data;
}

async function getRecentTitles() {
  const res = await apiClient.get('/articles?sort=-published_at&limit=500');
  return res.data;
}

// ─── Scraper Config ───────────────────────────────────────────────────────────

const BASE_URL              = 'https://puentelibre.mx';
const MAX_ARTICLES_PER_SECTION = 3;
const MAX_PROCESSED_HISTORY = 1000;
const DELAY_MS              = 2500;

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

// ─── State (processed URLs) ───────────────────────────────────────────────────

const PROCESSED_FILE = join(__dirname, 'processed.json');

function getProcessed() {
  if (!existsSync(PROCESSED_FILE)) return [];
  try { return JSON.parse(readFileSync(PROCESSED_FILE, 'utf8')); } catch { return []; }
}

function saveProcessed(urls) {
  writeFileSync(PROCESSED_FILE, JSON.stringify(urls.slice(-MAX_PROCESSED_HISTORY), null, 2));
}

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

const BLOCKED_IMAGE_DOMAINS = ['puentelibre.mx', 'puentelibre.com'];

function imageFromBlockedDomain(imageUrl) {
  try {
    const { hostname } = new URL(imageUrl);
    return BLOCKED_IMAGE_DOMAINS.some((d) => hostname.includes(d));
  } catch { return false; }
}

async function hasPuenteLibreWatermark(imageUrl) {
  if (!imageUrl) return false;
  if (imageFromBlockedDomain(imageUrl)) {
    console.log('     ⚠ Image hosted on puentelibre.mx — skipping');
    return true;
  }
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
  } catch (err) {
    console.warn(`  ⚠ Watermark check failed (${err.message}) — allowing image`);
    return false;
  }
}

// ─── OpenAI rewriting ─────────────────────────────────────────────────────────

async function rewriteArticle(title, body, sourceCategory, defaultCategory) {
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🗞  JuarezBravo Scraper — ${new Date().toISOString()}\n`);

  if (!SCRAPER_KEY) {
    console.error('SCRAPER_API_KEY no está configurada. Abortando.');
    process.exit(1);
  }

  const processed = getProcessed();
  let published = 0, skipped = 0, errors = 0;

  const publishedTitleSlugs = new Set();
  try {
    const recent = await getRecentTitles();
    for (const a of recent) publishedTitleSlugs.add(slugify(a.title));
    console.log(`   ℹ Loaded ${publishedTitleSlugs.size} existing titles for dedup\n`);
  } catch (err) {
    console.warn(`  ⚠ Could not fetch existing titles for dedup: ${err.message}\n`);
  }

  for (const section of SECTIONS) {
    console.log(`📂 Section: ${section.url}`);

    let links;
    try {
      links = await getArticleLinks(section.url);
      console.log(`   Found ${links.length} article(s)`);
    } catch (err) {
      console.error(`   ✗ Failed to fetch section: ${err.message}`);
      errors++;
      continue;
    }

    for (const url of links) {
      if (processed.includes(url)) {
        console.log(`   ⤷ Already processed: ${url}`);
        continue;
      }

      console.log(`\n   ↳ ${url}`);

      try {
        const article = await scrapeArticle(url);

        if (!article.title) {
          console.log('     ✗ No title found — skipping');
          processed.push(url); skipped++; continue;
        }
        if (article.body.length < 80) {
          console.log('     ✗ Insufficient body content — skipping');
          processed.push(url); skipped++; continue;
        }

        console.log(`     Title: ${article.title.slice(0, 70)}…`);

        const titleSlug = slugify(article.title);
        if (publishedTitleSlugs.has(titleSlug)) {
          console.log('     ⤷ Duplicate title — already published, skipping');
          processed.push(url); skipped++; continue;
        }
        publishedTitleSlugs.add(titleSlug);

        const watermark = await hasPuenteLibreWatermark(article.imageUrl);
        if (watermark) {
          console.log('     ✗ Puente Libre watermark detected — skipping article');
          processed.push(url); skipped++;
          await sleep(DELAY_MS); continue;
        }

        const rewritten = await rewriteArticle(
          article.title, article.body, article.sourceCategory, section.defaultCategory
        );
        console.log(`     ✓ Rewritten → [${rewritten.category}] ${rewritten.title.slice(0, 60)}…`);

        const slug = uniqueSlug(rewritten.title);
        await publishArticle({
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
        console.log(`     ✓ Published: /noticias/${slug}`);

        processed.push(url);
        published++;
      } catch (err) {
        console.error(`     ✗ Error: ${err.message}`);
        processed.push(url);
        errors++;
      }

      await sleep(DELAY_MS);
    }
  }

  saveProcessed(processed);
  console.log(`\n✅ Done — Published: ${published} | Skipped: ${skipped} | Errors: ${errors}\n`);

  const code = published === 0 && errors > 0 && skipped === 0 ? 1 : 0;
  process.exit(code);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
