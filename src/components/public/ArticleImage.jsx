import { useState } from 'react';

export default function ArticleImage({ article, sizes, loading = 'lazy', className, alt = '', onError, priority = false }) {
  const [useOriginal, setUseOriginal] = useState(false);
  // Una portada nueva obtiene URLs nuevas aunque el artículo mantenga el ID.
  let version = 0;
  for (const char of article.cover_image || '') version = (Math.imul(version, 31) + char.charCodeAt(0)) | 0;
  const imageUrl = width => `/api/images/${encodeURIComponent(article.id)}/${width}.webp?v=${version >>> 0}`;
  return (
    <img
      src={useOriginal ? article.cover_image : imageUrl(800)}
      srcSet={useOriginal ? undefined : [160, 480, 800, 1280].map(width => `${imageUrl(width)} ${width}w`).join(', ')}
      sizes={useOriginal ? undefined : sizes}
      loading={loading === 'eager' ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      alt={alt}
      className={className}
      onError={() => { if (!useOriginal) setUseOriginal(true); else onError?.(); }}
    />
  );
}
