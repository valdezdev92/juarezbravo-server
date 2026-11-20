// Los enlaces de la cabecera admiten rutas internas y URLs HTTP(S).
export function tickerUrl(value) {
  const url = value?.trim();
  if (!url || /[\\\u0000-\u0020\u007f]/.test(url)) return null;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (!/^https?:\/\//i.test(url)) return null;

  try {
    const parsed = new URL(url);
    if (['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password) {
      return parsed.href;
    }
  } catch {
    return null;
  }
  return null;
}
