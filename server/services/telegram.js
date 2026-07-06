/**
 * JuarezBravo.com — Bot de administración vía Telegram (webhook, no polling).
 *
 * Por qué webhook y no `bot.polling`: con múltiples instancias del servidor
 * Node corriendo (Passenger, cPanel), el polling de la librería estándar
 * dispara error 409 (varios procesos compitiendo por el mismo `getUpdates`).
 * Con webhook, Telegram nos empuja los updates directo a una ruta HTTP.
 *
 * Las sesiones conversacionales viven en MySQL (tabla `telegram_sessions`),
 * no en memoria del proceso, por la misma razón: puede haber varios workers.
 *
 * Env vars:
 *   TELEGRAM_BOT_TOKEN         (requerido — token de @BotFather)
 *   TELEGRAM_ALLOWED_CHAT_IDS  (chat IDs autorizados, separados por coma)
 *   SITE_URL                   (requerido — URL pública, ej. https://juarez-bravo.com)
 */
import { createHash } from 'crypto';
import cron from 'node-cron';
import axios from 'axios';
import db from '../db.js';
import {
  createArticle,
  getArticleById,
  getArticleBySlug,
  getRecentPublished,
  getCurrentHero,
  setHero,
  clearExpiredHeroes,
} from './articleStore.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE_URL  = (process.env.SITE_URL || '').replace(/\/$/, '');
const ALLOWED_CHAT_IDS = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);

const WEBHOOK_PATH = '/api/telegram-webhook';

// Telegram exige que secret_token sea [A-Za-z0-9_-]{1,256} — base64 puede
// traer '+', '/', '=' que no cumplen, así que derivamos con sha256-hex.
const SECRET_TOKEN = BOT_TOKEN
  ? createHash('sha256').update(BOT_TOKEN).digest('hex').slice(0, 32)
  : null;

const DEFAULT_AUTHOR = 'Redacción JuarezBravo';

const CATEGORIES = [
  { label: '🚨 Seguridad',        value: 'seguridad' },
  { label: '🏛️ Política',        value: 'politica' },
  { label: '⚽ Deportes',         value: 'deportes' },
  { label: '🎭 Entretenimiento',  value: 'entretenimiento' },
];

const HERO_DURATIONS = [
  { label: '1 hora',   minutes: 60 },
  { label: '2 horas',  minutes: 120 },
  { label: '6 horas',  minutes: 360 },
  { label: '12 horas', minutes: 720 },
  { label: '24 horas', minutes: 1440 },
  { label: '48 horas', minutes: 2880 },
];

const HELP_TEXT = `🤖 <b>JuarezBravo — Panel Telegram</b>

/nueva — Publicar una nota nueva (flujo guiado)
/hero — Cambiar la noticia destacada del home
/estado — Estado del importador de noticias
/cancelar — Cancelar lo que estés haciendo
/miid — Ver tu chat ID
/ayuda — Este mensaje`;

// ─── Utilidades ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

function normalizeAuthor(text) {
  const t = (text || '').trim();
  if (!t || /^redacci[oó]n$/i.test(t)) return DEFAULT_AUTHOR;
  return t;
}

function toHtmlBody(text) {
  const t = (text || '').trim();
  if (/<[a-z][\s\S]*>/i.test(t)) return t; // ya trae HTML, se respeta tal cual
  return t
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatDateTime(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Extrae slug o id de un link pegado por el usuario (o el texto suelto). */
function extractArticleRef(text) {
  const t = (text || '').trim();
  let m = t.match(/\/noticias\/([a-z0-9-]+)/i);
  if (m) return { type: 'slug', value: m[1] };
  m = t.match(/\/articulos\/([0-9a-f-]{36})/i);
  if (m) return { type: 'id', value: m[1] };
  if (/^[0-9a-f-]{36}$/i.test(t)) return { type: 'id', value: t };
  return { type: 'slug', value: t };
}

async function resolveArticleRef(text) {
  const ref = extractArticleRef(text);
  return ref.type === 'id' ? getArticleById(ref.value) : getArticleBySlug(ref.value);
}

function isAllowed(chatId) {
  // Whitelist vacía = permitir a todos. Solo para desarrollo local — en
  // producción TELEGRAM_ALLOWED_CHAT_IDS SIEMPRE debe estar configurada.
  if (ALLOWED_CHAT_IDS.length === 0) return true;
  return ALLOWED_CHAT_IDS.includes(String(chatId));
}

// ─── Cliente HTTP de Telegram ───────────────────────────────────────────────

const telegramApi = BOT_TOKEN
  ? axios.create({ baseURL: `https://api.telegram.org/bot${BOT_TOKEN}`, timeout: 15_000 })
  : null;

async function tg(method, payload) {
  if (!telegramApi) return null;
  try {
    const { data } = await telegramApi.post(`/${method}`, payload);
    return data;
  } catch (err) {
    console.error(`[Telegram] ${method} falló:`, err.response?.data || err.message);
    return null;
  }
}

function sendMessage(chatId, text, extra = {}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

function editMessageText(chatId, messageId, text, extra = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra });
}

function answerCallbackQuery(id, text) {
  return tg('answerCallbackQuery', { callback_query_id: id, text });
}

async function registerWebhook() {
  const url = `${SITE_URL}${WEBHOOK_PATH}`;
  const result = await tg('setWebhook', {
    url,
    secret_token: SECRET_TOKEN,
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
  });
  if (result?.ok) {
    console.log(`[Telegram] Webhook registrado: ${url}`);
  } else {
    console.error('[Telegram] setWebhook falló:', result);
  }
}

// ─── Sesiones (persistidas en DB) ───────────────────────────────────────────

async function ensureSessionsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS telegram_sessions (
      chat_id    VARCHAR(50) NOT NULL PRIMARY KEY,
      step       VARCHAR(50) NOT NULL DEFAULT 'idle',
      data       JSON        NOT NULL,
      updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getSession(chatId) {
  const [rows] = await db.query(
    'SELECT step, data FROM telegram_sessions WHERE chat_id = ?',
    [String(chatId)]
  );
  if (!rows[0]) return { step: 'idle', data: {} };
  return { step: rows[0].step, data: rows[0].data ? JSON.parse(rows[0].data) : {} };
}

async function setSession(chatId, step, data) {
  await db.query(
    `INSERT INTO telegram_sessions (chat_id, step, data) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE step = VALUES(step), data = VALUES(data)`,
    [String(chatId), step, JSON.stringify(data || {})]
  );
}

async function clearSession(chatId) {
  await setSession(chatId, 'idle', {});
}

// ─── Cron: expirar hero vencido ─────────────────────────────────────────────

function startHeroExpiryCron() {
  cron.schedule('* * * * *', async () => {
    try {
      const cleared = await clearExpiredHeroes();
      if (cleared > 0) console.log(`[Telegram] Hero expirado en ${cleared} artículo(s)`);
    } catch (err) {
      console.error('[Telegram] Error limpiando hero expirado:', err.message);
    }
  });
}

// ─── /nueva — flujo de publicación ──────────────────────────────────────────

async function startNuevaFlow(chatId) {
  await setSession(chatId, 'nueva_title', {});
  return sendMessage(chatId, '📝 <b>Nota nueva</b>\n\nEnvíame el título.');
}

async function handleNuevaText(chatId, session, text) {
  const { step, data } = session;

  if (step === 'nueva_title') {
    data.title = text;
    await setSession(chatId, 'nueva_category', data);
    return sendMessage(chatId, '📂 Elige la categoría:', {
      reply_markup: {
        inline_keyboard: CATEGORIES.map((c) => [{ text: c.label, callback_data: `nueva:cat:${c.value}` }]),
      },
    });
  }

  if (step === 'nueva_category') {
    return sendMessage(chatId, '👆 Usa los botones de arriba para elegir la categoría.');
  }

  if (step === 'nueva_author') {
    data.author = normalizeAuthor(text);
    await setSession(chatId, 'nueva_excerpt', data);
    return sendMessage(chatId, '✏️ Envíame el extracto (1-2 oraciones que resuman la nota).');
  }

  if (step === 'nueva_excerpt') {
    data.excerpt = text;
    await setSession(chatId, 'nueva_body', data);
    return sendMessage(chatId, '📄 Envíame el cuerpo de la nota (texto plano o HTML).');
  }

  if (step === 'nueva_body') {
    data.body = text;
    await setSession(chatId, 'nueva_image', data);
    return sendMessage(chatId, '🖼️ Envíame la URL de la imagen de portada, o escribe "sin imagen".');
  }

  if (step === 'nueva_image') {
    data.cover_image = /^sin imagen$/i.test(text.trim()) ? null : text.trim();
    await setSession(chatId, 'nueva_confirm', data);
    return sendNuevaPreview(chatId, data);
  }

  if (step === 'nueva_confirm') {
    return sendMessage(chatId, '👆 Usa los botones de arriba para confirmar o cancelar.');
  }
}

async function sendNuevaPreview(chatId, data) {
  const cat = CATEGORIES.find((c) => c.value === data.category)?.label || data.category;
  const preview = `<b>Vista previa</b>

<b>Título:</b> ${escapeHtml(data.title)}
<b>Categoría:</b> ${escapeHtml(cat)}
<b>Autor:</b> ${escapeHtml(data.author)}
<b>Extracto:</b> ${escapeHtml(data.excerpt)}
<b>Imagen:</b> ${data.cover_image ? '✅ sí' : '— sin imagen'}

<b>Cuerpo:</b>
${escapeHtml(data.body.slice(0, 500))}${data.body.length > 500 ? '…' : ''}`;

  return sendMessage(chatId, preview, {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Publicar ahora', callback_data: 'nueva:confirm:yes' },
        { text: '❌ Cancelar',       callback_data: 'nueva:confirm:no' },
      ]],
    },
  });
}

async function handleNuevaCategory(chatId, session, value) {
  if (session.step !== 'nueva_category') return;
  if (!CATEGORIES.some((c) => c.value === value)) return;
  const data = { ...session.data, category: value };
  await setSession(chatId, 'nueva_author', data);
  return sendMessage(chatId, `✅ Categoría: ${value}\n\n🖋️ ¿Quién firma la nota? (escribe "Redacción" para el autor por defecto)`);
}

async function handleNuevaConfirm(chatId, session, confirmed) {
  if (session.step !== 'nueva_confirm') return;
  await clearSession(chatId);

  if (!confirmed) {
    return sendMessage(chatId, '❌ Publicación cancelada.');
  }

  const { data } = session;
  try {
    const article = await createArticle({
      title:            data.title,
      slug:             uniqueSlug(data.title),
      excerpt:          data.excerpt,
      body:             toHtmlBody(data.body),
      cover_image:      data.cover_image || null,
      category:         data.category,
      status:           'published',
      published_at:     new Date().toISOString(),
      is_breaking_news: false,
      is_featured:      false,
      author:           data.author,
      views:            0,
      tags:             [],
    });
    return sendMessage(chatId, `✅ <b>Publicado</b>\n${SITE_URL}/noticias/${article.slug}`);
  } catch (err) {
    console.error('[Telegram] Error publicando nota:', err.message);
    return sendMessage(chatId, `⚠️ Error al publicar: ${escapeHtml(err.message)}`);
  }
}

// ─── /hero — cambiar la noticia destacada ───────────────────────────────────

async function handleHeroCommand(chatId, arg) {
  if (arg) {
    const article = await resolveArticleRef(arg);
    if (!article) return sendMessage(chatId, '⚠️ No encontré ninguna nota con ese link.');
    return sendHeroDurationPicker(chatId, article);
  }

  const current = await getCurrentHero();
  const currentText = current
    ? `⭐ Hero actual: <b>${escapeHtml(current.title)}</b>${current.featured_until ? `\nHasta: ${formatDateTime(current.featured_until)}` : '\n(permanente)'}`
    : 'ℹ️ No hay ninguna nota marcada como hero ahora mismo.';

  return sendMessage(chatId, currentText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 Ver últimas 10 noticias', callback_data: 'hero:list' }],
        [{ text: '🔗 Tengo el link del artículo', callback_data: 'hero:link' }],
      ],
    },
  });
}

async function showHeroList(chatId, messageId) {
  const recent = await getRecentPublished(10);
  if (!recent.length) {
    return editMessageText(chatId, messageId, 'No hay notas publicadas todavía.');
  }
  return editMessageText(chatId, messageId, '📋 Elige la nota:', {
    reply_markup: {
      inline_keyboard: recent.map((a) => [{
        text: a.title.slice(0, 60),
        callback_data: `hero:pick:${a.id}`,
      }]),
    },
  });
}

async function askHeroLink(chatId, messageId) {
  await setSession(chatId, 'hero_awaiting_link', {});
  return editMessageText(chatId, messageId, '🔗 Pega el link de la nota (o su slug).');
}

async function handleHeroLinkText(chatId, text) {
  await clearSession(chatId);
  const article = await resolveArticleRef(text);
  if (!article) return sendMessage(chatId, '⚠️ No encontré ninguna nota con ese link.');
  return sendHeroDurationPicker(chatId, article);
}

async function sendHeroDurationPicker(chatId, article, messageId) {
  const rows = HERO_DURATIONS.map((d) => ([{
    text: d.label, callback_data: `hero:dur:${article.id}:${d.minutes}`,
  }]));
  rows.push([{ text: '♾️ Permanente (sin límite)', callback_data: `hero:dur:${article.id}:perm` }]);
  rows.push([{ text: '❌ Cancelar', callback_data: 'hero:cancel' }]);

  const text = `⏱️ ¿Por cuánto tiempo destacamos:\n<b>${escapeHtml(article.title)}</b>?`;
  const extra = { reply_markup: { inline_keyboard: rows } };

  return messageId ? editMessageText(chatId, messageId, text, extra) : sendMessage(chatId, text, extra);
}

async function showHeroDurationPicker(chatId, messageId, articleId) {
  const article = await getArticleById(articleId);
  if (!article) return editMessageText(chatId, messageId, '⚠️ Esa nota ya no existe.');
  return sendHeroDurationPicker(chatId, article, messageId);
}

async function applyHeroDuration(chatId, messageId, data) {
  // data = "hero:dur:<id>:<minutes|perm>"
  const rest  = data.slice('hero:dur:'.length);
  const sep   = rest.lastIndexOf(':');
  const id    = rest.slice(0, sep);
  const spec  = rest.slice(sep + 1);

  const featuredUntil = spec === 'perm'
    ? null
    : new Date(Date.now() + Number(spec) * 60_000).toISOString();

  const article = await setHero(id, featuredUntil);
  if (!article) return editMessageText(chatId, messageId, '⚠️ Esa nota ya no existe.');

  const durText = featuredUntil ? `hasta ${formatDateTime(featuredUntil)}` : 'de forma permanente';
  return editMessageText(
    chatId, messageId,
    `⭐ <b>${escapeHtml(article.title)}</b> ahora es el hero (${durText}).\n${SITE_URL}/noticias/${article.slug}`
  );
}

// ─── /estado — estado del importador ────────────────────────────────────────

async function handleEstadoCommand(chatId) {
  try {
    const [lastRows] = await db.query(
      `SELECT started_at, finished_at, status, published_count, skipped_count, error_count
         FROM scraper_runs ORDER BY started_at DESC LIMIT 1`
    );
    const [successRows] = await db.query(
      `SELECT started_at, published_count FROM scraper_runs
        WHERE status = 'success' ORDER BY started_at DESC LIMIT 1`
    );
    const [lastArticle] = await getRecentPublished(1);

    const last    = lastRows[0];
    const success = successRows[0];

    const text = `📡 <b>Estado del importador</b>

${last ? `Última corrida: ${formatDateTime(last.started_at)} (${last.status})
  Publicadas: ${last.published_count} · Omitidas: ${last.skipped_count} · Errores: ${last.error_count}` : 'Sin corridas registradas.'}

${success ? `Última corrida exitosa: ${formatDateTime(success.started_at)}` : ''}

${lastArticle ? `📰 Última nota publicada:\n${escapeHtml(lastArticle.title)}\n${formatDateTime(lastArticle.published_at)}` : ''}`;

    return sendMessage(chatId, text);
  } catch (err) {
    console.error('[Telegram] Error en /estado:', err.message);
    return sendMessage(chatId, `⚠️ No pude leer el estado: ${escapeHtml(err.message)}`);
  }
}

// ─── Enrutamiento de mensajes y callbacks ───────────────────────────────────

function stripCommand(text) {
  return text.replace(/^\/\w+(@\w+)?\s*/, '').trim();
}

async function handleMessage(message) {
  const chatId = message.chat?.id;
  const text   = (message.text || '').trim();
  if (!chatId || !text) return;

  // /miid responde siempre, sin checar permisos — así un admin nuevo descubre su ID.
  if (/^\/miid(@\w+)?$/i.test(text)) {
    return sendMessage(chatId, `🆔 Tu chat ID es: <code>${chatId}</code>`);
  }

  if (!isAllowed(chatId)) {
    if (text.startsWith('/')) {
      return sendMessage(chatId, `⛔ Sin permiso.\nTu chat ID es: <code>${chatId}</code>`);
    }
    return; // texto libre de no autorizados: ignorar silenciosamente
  }

  if (/^\/(start|ayuda)(@\w+)?$/i.test(text)) {
    await clearSession(chatId);
    return sendMessage(chatId, HELP_TEXT);
  }

  if (/^\/cancelar(@\w+)?$/i.test(text)) {
    await clearSession(chatId);
    return sendMessage(chatId, '🚫 Sesión cancelada.');
  }

  if (/^\/nueva(@\w+)?$/i.test(text)) {
    return startNuevaFlow(chatId);
  }

  if (/^\/hero(@\w+)?/i.test(text)) {
    return handleHeroCommand(chatId, stripCommand(text));
  }

  if (/^\/estado(@\w+)?$/i.test(text)) {
    return handleEstadoCommand(chatId);
  }

  const session = await getSession(chatId);

  if (session.step === 'hero_awaiting_link') {
    return handleHeroLinkText(chatId, text);
  }

  if (session.step.startsWith('nueva_')) {
    return handleNuevaText(chatId, session, text);
  }

  if (text.startsWith('/')) {
    return sendMessage(chatId, '🤔 No reconozco ese comando. Usa /ayuda para ver la lista.');
  }
  // texto libre sin sesión activa: ignorar
}

async function handleCallbackQuery(cq) {
  const chatId    = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  const data      = cq.data || '';
  if (!chatId) return;

  if (!isAllowed(chatId)) {
    return answerCallbackQuery(cq.id, '⛔ Sin permiso');
  }

  answerCallbackQuery(cq.id).catch(() => {});

  if (data.startsWith('nueva:cat:')) {
    const session = await getSession(chatId);
    return handleNuevaCategory(chatId, session, data.slice('nueva:cat:'.length));
  }
  if (data === 'nueva:confirm:yes' || data === 'nueva:confirm:no') {
    const session = await getSession(chatId);
    return handleNuevaConfirm(chatId, session, data === 'nueva:confirm:yes');
  }

  if (data === 'hero:list')            return showHeroList(chatId, messageId);
  if (data === 'hero:link')            return askHeroLink(chatId, messageId);
  if (data.startsWith('hero:pick:'))   return showHeroDurationPicker(chatId, messageId, data.slice('hero:pick:'.length));
  if (data.startsWith('hero:dur:'))    return applyHeroDuration(chatId, messageId, data);
  if (data === 'hero:cancel')          return editMessageText(chatId, messageId, '🚫 Cancelado.');
}

async function handleUpdate(update) {
  try {
    if (update.callback_query) return await handleCallbackQuery(update.callback_query);
    if (update.message)        return await handleMessage(update.message);
  } catch (err) {
    console.error('[Telegram] Error procesando update:', err);
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

export function setupTelegramWebhook(app) {
  if (!BOT_TOKEN || !SITE_URL) {
    console.log('[Telegram] TELEGRAM_BOT_TOKEN o SITE_URL ausentes, bot desactivado');
    return;
  }

  app.post(WEBHOOK_PATH, (req, res) => {
    if (req.headers['x-telegram-bot-api-secret-token'] !== SECRET_TOKEN) {
      return res.sendStatus(401);
    }
    res.sendStatus(200); // Telegram reintenta si no respondemos rápido
    handleUpdate(req.body);
  });

  ensureSessionsTable().catch((err) => console.error('[Telegram] No se pudo crear tabla de sesiones:', err.message));
  registerWebhook().catch((err) => console.error('[Telegram] No se pudo registrar webhook:', err.message));
  startHeroExpiryCron();

  console.log(`[Telegram] Bot configurado, webhook en ${WEBHOOK_PATH}`);
}
