import { rm } from 'node:fs/promises';
import { publishArticleToFacebook } from './facebook.js';
import { publishArticleToInstagram } from './instagram.js';
import { createSocialImage } from './socialImage.js';

function truncate(text, limit) {
  if (limit <= 0) return '';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).toWellFormed().trimEnd()}…`;
}

function formatPostCaption(title, excerpt, url, limit = Infinity) {
  const heading = [truncate(title, limit - url.length - 2), url].filter(Boolean).join('\n\n');
  return [heading, truncate(excerpt, limit - heading.length - 2)].filter(Boolean).join('\n\n');
}

export async function publishArticleOnSocialMedia(article) {
  if (!article.slug) return;

  let image;
  try {
    const siteUrl = new URL(process.env.SITE_URL || 'https://juarez-bravo.com');
    const url = new URL(`/noticias/${encodeURIComponent(article.slug)}`, siteUrl).href;
    const title = article.title || '';
    const post = {
      title,
      url,
      caption: (limit) => formatPostCaption(title, article.excerpt || '', url, limit),
      getImage: article.cover_image
        ? () => (image ??= createSocialImage(article.cover_image, siteUrl))
        : null,
    };

    await Promise.allSettled([publishArticleToFacebook(post), publishArticleToInstagram(post)]);
  } catch (error) {
    console.error('[Redes] No se pudo preparar la publicación:', error.message);
  } finally {
    // Las dos plataformas ya descargaron la copia o terminaron su intento.
    const output = await image?.catch(() => null);
    if (output) {
      await rm(output.file, { force: true }).catch((error) => {
        console.error('[Redes] No se pudo limpiar la imagen temporal:', error.message);
      });
    }
  }
}
