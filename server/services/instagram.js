const IG_API_VERSION = 'v21.0';

function getConfig() {
  return {
    igUserId:    process.env.INSTAGRAM_USER_ID,
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_TOKEN,
  };
}

async function igPost(path, body) {
  const { accessToken } = getConfig();
  const url = `https://graph.facebook.com/${IG_API_VERSION}/${path}`;
  const params = new URLSearchParams({ ...body, access_token: accessToken });

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Instagram API error (HTTP ${res.status})`);
  }
  return data;
}

async function igGetStatus(containerId) {
  const { accessToken } = getConfig();
  const url = `https://graph.facebook.com/${IG_API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Instagram API error (HTTP ${res.status})`);
  }
  return data.status_code;
}

/**
 * Instagram procesa la imagen del contenedor de forma asíncrona: publicarlo
 * de inmediato después de crearlo puede fallar con "Media ID is not
 * available" si todavía no terminó. Se espera a status_code === 'FINISHED'
 * antes de publicar, con un tope de tiempo por si Instagram nunca lo logra.
 */
async function waitUntilContainerReady(containerId, { timeoutMs = 30000, intervalMs = 1500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const statusCode = await igGetStatus(containerId);
    if (statusCode === 'FINISHED') return;
    if (statusCode === 'ERROR') {
      throw new Error('Instagram no pudo procesar la imagen del contenedor');
    }
    if (Date.now() >= deadline) {
      throw new Error(`Tiempo de espera agotado procesando el contenedor (status: ${statusCode})`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

/**
 * Publica un artículo en Instagram. La API Graph de Instagram exige imagen
 * (no admite publicaciones de solo texto/enlace como Facebook), así que los
 * artículos sin cover_image se omiten. El flujo son dos pasos: crear el
 * contenedor de medios y luego publicarlo.
 */
export async function publishArticleToInstagram(post) {
  const { igUserId, accessToken } = getConfig();
  if (!igUserId || !accessToken) {
    console.log('[Instagram] No configurado (faltan INSTAGRAM_USER_ID o INSTAGRAM_ACCESS_TOKEN)');
    return null;
  }
  if (!post.getImage) {
    console.log(`[Instagram] Sin imagen de portada, se omite: "${post.title.slice(0, 60)}"`);
    return null;
  }

  try {
    const { url } = await post.getImage();
    const container = await igPost(`${igUserId}/media`, {
      image_url: url,
      caption: post.caption(2200),
    });
    await waitUntilContainerReady(container.id);
    const result = await igPost(`${igUserId}/media_publish`, {
      creation_id: container.id,
    });

    console.log(`[Instagram] ✓ Publicado (${result.id}): "${post.title.slice(0, 80)}"`);
    return result.id;
  } catch (err) {
    console.error(`[Instagram] ✗ Error publicando "${post.title.slice(0, 60)}": ${err.message}`);
    return null;
  }
}
