import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const uploads = new URL('../uploads/', import.meta.url);
const outputDirectory = new URL('social/', uploads);
const watermark = new URL('../assets/juarez-bravo-watermark.png', import.meta.url);
const maxDownloadSize = 16 * 1024 * 1024;
const background = '#142235';

async function readCover(coverImage, siteUrl) {
  const url = new URL(coverImage, siteUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('La portada debe usar una URL HTTP o HTTPS');
  }

  const localFile = /^\/uploads\/([\w-][\w.-]*)$/.exec(url.pathname);
  if (localFile && url.host === siteUrl.host) {
    return readFile(new URL(localFile[1], uploads));
  }

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxDownloadSize) {
    await response.body?.cancel();
    throw new Error(`No se pudo descargar la portada o excede el tamaño máximo (HTTP ${response.status})`);
  }

  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maxDownloadSize) throw new Error('La portada excede el tamaño máximo de descarga');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

export async function createSocialImage(coverImage, siteUrl) {
  const { default: sharp } = await import('sharp');
  const source = await readCover(coverImage, siteUrl);
  const { data: photo, info } = await sharp(source, { limitInputPixels: 40_000_000 })
    .autoOrient()
    .resize({ width: 1080, height: 1350, fit: 'inside', withoutEnlargement: true })
    .flatten({ background })
    .toColourspace('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Instagram admite JPEG con relación de aspecto de 4:5 a 1.91:1.
  const width = Math.max(info.width, 320, Math.ceil(info.height * 0.8));
  const height = Math.max(info.height, Math.ceil(width / 1.91));
  const shortEdge = Math.min(width, height);
  const inset = Math.round(shortEdge * 0.035);
  const { data: logo, info: logoInfo } = await sharp(await readFile(watermark))
    .resize({ height: Math.round(shortEdge * 0.24) })
    .png()
    .toBuffer({ resolveWithObject: true });

  const image = await sharp({ create: { width, height, channels: 3, background } })
    .composite([
      {
        input: photo,
        raw: { width: info.width, height: info.height, channels: info.channels },
        left: Math.floor((width - info.width) / 2),
        top: Math.floor((height - info.height) / 2),
      },
      { input: logo, left: width - logoInfo.width - inset, top: height - logoInfo.height - inset },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();

  await mkdir(outputDirectory, { recursive: true });
  const name = `${randomUUID()}.jpg`;
  const file = new URL(name, outputDirectory);
  const url = new URL(`/uploads/social/${name}`, siteUrl).href;
  try {
    await writeFile(file, image, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') await rm(file, { force: true }).catch(() => {});
    throw error;
  }
  return { file, url };
}
