/**
 * JuarezBravo.com — News Scraper
 *
 * Scrapes puentelibre.mx, rewrites content with OpenAI,
 * checks images for watermarks, and publishes to Base44.
 */

import { createClient } from '@base44/sdk';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Clients ──────────────────────────────────────────────────────────────────

const base44 = createClient({
  appId: '6a1108d69522691f54677d57',
  serverUrl: 'https://juarez-bravo-pulse.base44.app',
  headers: {
    api_key: process.env.BASE44_API_KEY,
  },
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'https://puentelibre.mx';
const MAX_ARTICLES_PER_SECTION = 3;
const MAX_PROCESSED_HISTORY = 1000;
const DELAY_MS = 2500;

// Sections to scrape and their default category mapping
const SECTIONS = [
  { url: `${BASE_URL}/local/`,        defaultCategory: null },          // AI decides: seguridad o sociedad
  { url: `${BASE_URL}/deportes/`,     defaultCategory: 'deportes' },
  { url: `${BASE_URL}/espectaculos/`, defaultCategory: 'entretenimiento' },
  { url: `${BASE_URL}/nacional/`,     defaultCategory: 'politica' },
  { url: `${BASE_URL}/economia/`,     defaultCategory: 'politica' },
];

const VALID_CATEGORIES = ['seguridad', 'politica', 'deportes', 'entretenimiento'];

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; JuarezBravoBot/1.0)',
  'Accept-Language': 'es-MX,es;q=0.9',
};

// ─── State (processed URLs) ────────────────────────────────────────────────────

const PROCESSED_FILE = join(__dirname, 'processed.json');

function getProcessed() {
  if (!existsSync(PROCESSED_FILE)) return [];
  try {
    return JSON.parse(readFileSync(PROCESSED_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveProcessed(urls) {
  // Keep only the last N to avoid the file growing indefinitely
  const trimmed = urls.slice(-MAX_PROCESSED_HISTORY);
  writeFileSync(PROCESSED_FILE, JSON.stringify(trimmed, null, 2));
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
  const base = slugify(title);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sectionSlug(sectionUrl) {
  return sectionUrl.replace(BASE_URL, '').replace(/\//g, '') || 'local';
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

async function getArticleLinks(sectionUrl) {
  const { data } = await axios.get(sectionUrl, {
    headers: HTTP_HEADERS,
    timeout: 20_000,
  });

  const $ = cheerio.load(data);
  const seen = new Set();
  const links = [];

  // Collect every internal link on the page
  $('a[href]').each((_, el) => {
    let href = $(el).attr('href') || '';
    if (!href.startsWith('http')) href = `${BASE_URL}${href}`;

    if (
      href.includes('puentelibre.mx') &&
      // Must be a deep path like /section/article-slug/
      href.split('/').filter(Boolean).length >= 4 &&
      // Skip section index pages, tag pages, author pages, pagination
      !/\/(tag|autor|author|page|categoria|category|\?|#)/.test(href) &&
      // Skip the /slugnoticia/ duplicate URLs the site generates
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
  const { data } = await axios.get(url, {
    headers: HTTP_HEADERS,
    timeout: 20_000,
  });

  const $ = cheerio.load(data);

  // ── Title & Image — extract BEFORE any DOM cleanup ─────────────────────────
  // Title: h1 anywhere on the page, fallback to og:title meta
  const title =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().replace(/\s*[-|].*$/, '').trim() || // strip "Site Name" suffix
    '';

  // Image: prefer og:image (canonical, no crop artifacts), then first real img
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const firstImg =
    $('img[src]')
      .toArray()
      .map((el) => $(el).attr('src') || '')
      .find((src) => src.startsWith('http') && /\.(jpe?g|png|webp)/i.test(src)) || '';
  const imageUrl = ogImage || firstImg;

  // ── Remove noisy elements before body extraction ───────────────────────────
  // Note: we intentionally keep <article> and its inner <header> since
  // the site nests the h1 there — but we've already grabbed the title above.
  $(
    'nav, header, footer, aside, .sidebar, .widget, .related, ' +
    '.comments, .comment, script, style, noscript, .social, ' +
    '.share, .tags, .breadcrumb, .pagination, form, iframe, ' +
    '.advertisement, .ad, .banner'
  ).remove();

  // ── Body ──────────────────────────────────────────────────────────────────
  // Strategy 1: known CMS content wrappers
  const contentSelectors = [
    '.entry-content',
    '.post-content',
    '.td-post-content',
    '.article-body',
    '.article-content',
    '.single-content',
    '.post-body',
    '.content-inner',
    '.nota-texto',
    '.cuerpo-nota',
    'article',
  ];

  let bodyParts = [];

  for (const sel of contentSelectors) {
    const container = $(sel).first();
    if (container.length) {
      container.find('p, blockquote').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 40) bodyParts.push(text);
      });
      if (bodyParts.length >= 2) break; // found enough content
    }
  }

  // Strategy 2: fallback — collect ALL paragraphs and blockquotes on the page
  // with length > 60 chars (likely article body, not nav/widget snippets)
  if (bodyParts.length < 2) {
    bodyParts = [];
    $('p, blockquote').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 60) bodyParts.push(text);
    });
  }

  // Deduplicate consecutive identical lines
  const seen = new Set();
  const unique = bodyParts.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });

  const body = unique.join('\n\n');

  // ── Category ──────────────────────────────────────────────────────────────
  const match = url.match(/puentelibre\.mx\/([^/]+)\//);
  const sourceCategory = match?.[1] || 'local';

  return { title, body, imageUrl, sourceCategory, sourceUrl: url };
}

// ─── Watermark detection (specific to puentelibre.mx) ───────────────────────
//
// Strategy:
//  1. URL check  — if the image is hosted on puentelibre.mx, skip immediately.
//  2. Vision check — ask GPT-4o specifically whether the image shows the
//     "Puente Libre" / "puentelibre.mx" logo or watermark text. Generic watermark
//     detection produces too many false positives with other outlets' CDNs.

const BLOCKED_IMAGE_DOMAINS = ['puentelibre.mx', 'puentelibre.com'];

function imageFromBlockedDomain(imageUrl) {
  try {
    const { hostname } = new URL(imageUrl);
    return BLOCKED_IMAGE_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}

async function hasPuenteLibreWatermark(imageUrl) {
  if (!imageUrl) return false;

  // Fast path: image is served directly from puentelibre.mx CDN
  if (imageFromBlockedDomain(imageUrl)) {
    console.log('     ⚠ Image hosted on puentelibre.mx — skipping');
    return true;
  }

  // Vision check: look ONLY for Puente Libre branding, not generic watermarks
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Look at this image carefully.',
                'Does it contain a visible watermark, logo, or text that says "Puente Libre", "puentelibre.mx", or "puentelibre.com"?',
                'Answer only YES or NO. Do NOT flag watermarks from other outlets.',
              ].join(' '),
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 5,
    });

    const answer = response.choices[0]?.message?.content?.trim().toUpperCase() ?? 'NO';
    return answer.startsWith('YES');
  } catch (err) {
    console.warn(`  ⚠ Watermark check failed (${err.message}) — allowing image`);
    return false;
  }
}

// ─── OpenAI — Article rewriting ───────────────────────────────────────────────

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
      {
        role: 'user',
        content: `Título original: ${title}\n\nContenido:\n${body.slice(0, 4000)}`,
      },
    ],
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  // Validate category
  if (!VALID_CATEGORIES.includes(parsed.category)) {
    parsed.category = defaultCategory || 'seguridad';
  }

  return parsed;
}

// ─── Base44 — Publishing ──────────────────────────────────────────────────────

async function publishArticle(rewritten, imageUrl) {
  const slug = uniqueSlug(rewritten.title);

  await base44.entities.Article.create({
    title: rewritten.title,
    slug,
    excerpt: rewritten.excerpt,
    body: rewritten.body,
    cover_image: imageUrl,
    category: rewritten.category,
    status: 'published',
    published_at: new Date().toISOString(),
    is_breaking_news: false,
    is_featured: false,
    author: 'Redacción JuarezBravo',
    views: 0,
    tags: [],
  });

  return slug;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log(`\n🗞  JuarezBravo Scraper — ${new Date().toISOString()}\n`);

  const processed = getProcessed();
  let published = 0;
  let skipped = 0;
  let errors = 0;

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
        // 1. Scrape
        const article = await scrapeArticle(url);

        if (!article.title) {
          console.log('     ✗ No title found — skipping');
          processed.push(url);
          skipped++;
          continue;
        }

        if (article.body.length < 80) {
          console.log('     ✗ Insufficient body content — skipping');
          processed.push(url);
          skipped++;
          continue;
        }

        console.log(`     Title: ${article.title.slice(0, 70)}…`);

        // 2. Watermark check (puentelibre.mx specific)
        const watermark = await hasPuenteLibreWatermark(article.imageUrl);
        if (watermark) {
          console.log('     ✗ Puente Libre watermark detected — skipping article');
          processed.push(url);
          skipped++;
          await sleep(DELAY_MS);
          continue;
        }

        // 3. Rewrite with OpenAI
        const rewritten = await rewriteArticle(
          article.title,
          article.body,
          article.sourceCategory,
          section.defaultCategory
        );
        console.log(`     ✓ Rewritten → [${rewritten.category}] ${rewritten.title.slice(0, 60)}…`);

        // 4. Publish to Base44
        const slug = await publishArticle(rewritten, article.imageUrl);
        console.log(`     ✓ Published: /noticias/${slug}`);

        processed.push(url);
        published++;
      } catch (err) {
        console.error(`     ✗ Error: ${err.message}`);
        // Still mark as processed to avoid retrying a permanently broken URL
        processed.push(url);
        errors++;
      }

      await sleep(DELAY_MS);
    }
  }

  saveProcessed(processed);

  console.log(`\n✅ Done — Published: ${published} | Skipped: ${skipped} | Errors: ${errors}\n`);

  // Force exit — the Base44 SDK keeps sockets open and Node.js won't exit on its own
  const code = published === 0 && errors > 0 && skipped === 0 ? 1 : 0;
  process.exit(code);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
