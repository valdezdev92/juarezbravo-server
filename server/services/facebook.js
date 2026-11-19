const FB_API_VERSION = 'v21.0';

function getConfig() {
  return {
    pageId:    process.env.FACEBOOK_PAGE_ID,
    pageToken: process.env.FACEBOOK_PAGE_TOKEN,
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

export async function publishArticleToFacebook(post) {
  const { pageId, pageToken } = getConfig();
  if (!pageId || !pageToken) {
    console.log('[Facebook] No configurado (faltan FACEBOOK_PAGE_ID o FACEBOOK_PAGE_TOKEN)');
    return null;
  }

  try {
    const message = post.caption();
    let body = { message, link: post.url };
    if (post.getImage) {
      const { url } = await post.getImage();
      const photo = await fbPost(`${pageId}/photos`, { url, published: 'false' });
      body = { message, 'attached_media[0]': JSON.stringify({ media_fbid: photo.id }) };
    }

    const result = await fbPost(`${pageId}/feed`, body);
    const postId = result.post_id || result.id;
    console.log(`[Facebook] ✓ Publicado (${postId}): "${post.title.slice(0, 80)}"`);
    return postId;
  } catch (err) {
    console.error(`[Facebook] ✗ Error publicando "${post.title.slice(0, 60)}": ${err.message}`);
    return null;
  }
}
