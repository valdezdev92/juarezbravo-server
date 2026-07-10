async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Confirma que una URL de imagen realmente carga (200 + Content-Type image/*)
 * antes de dejar publicar una nota con ella. Las imágenes de fuentes externas
 * (scraper) se caen o cambian de URL con frecuencia, y una nota publicada con
 * una imagen rota se ve peor que una nota sin imagen.
 *
 * Un fallo de conexión (timeout, DNS, host inalcanzable) NO se trata como
 * imagen inválida: solo indica que este servidor no pudo verificarla en este
 * momento (p.ej. la red del host bloquea salida hacia ese dominio), no que la
 * imagen esté rota. Únicamente una respuesta HTTP real (404, tipo de
 * contenido incorrecto, etc.) marca la imagen como inválida.
 */
export async function isImageUrlValid(url, timeoutMs = 8000) {
  if (!url) return false;
  try {
    let res = await fetchWithTimeout(url, { method: 'HEAD', redirect: 'follow' }, timeoutMs);
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, { method: 'GET', redirect: 'follow' }, timeoutMs);
    }
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch (err) {
    console.warn(`[ImageCheck] No se pudo conectar para verificar "${url}" (${err.message}) — se asume válida`);
    return true;
  }
}
