const FB_API_VERSION = 'v21.0';

function getConfig() {
  return {
    pageId:    process.env.FACEBOOK_PAGE_ID,
    pageToken: process.env.FACEBOOK_PAGE_TOKEN,
    siteUrl:   process.env.SITE_URL || 'https://juarez-bravo.com',
  };
}

async function fbPost(path, body) {
  const { pageToken } = getConfig();
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${path}`;
  const params = new URLSearchParams({ ...body, access_token: pageToken });

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Facebook API error (HTTP ${res.status})`);
  }
  return data;
}

export async function publishArticleToFacebook(article) {
  const { pageId, pageToken, siteUrl } = getConfig();
  if (!pageId || !pageToken) {
    console.log('[Facebook] No configurado (faltan FACEBOOK_PAGE_ID o FACEBOOK_PAGE_TOKEN)');
    return null;
  }

  const url     = `${siteUrl}/noticias/${article.slug}`;
  const message = [article.title, article.excerpt, url].filter(Boolean).join('\n\n');

  try {
    const result = article.cover_image
      ? await fbPost(`${pageId}/photos`, { url: article.cover_image, caption: message })
      : await fbPost(`${pageId}/feed`,   { message, link: url });

    const postId = result.post_id || result.id;
    console.log(`[Facebook] ✓ Publicado (${postId}): "${article.title.slice(0, 80)}"`);
    return postId;
  } catch (err) {
    console.error(`[Facebook] ✗ Error publicando "${article.title.slice(0, 60)}": ${err.message}`);
    return null;
  }
}
