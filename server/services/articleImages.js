import { createHash } from 'node:crypto';
import { lookup } from 'node:dns';
import { mkdir, readFile, rename, stat, writeFile, unlink } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import sharp from 'sharp';

const serverRoot = fileURLToPath(new URL('../', import.meta.url));
const cacheRoot = path.join(serverRoot, 'image-cache');
const MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_WIDTHS = [160, 480, 800, 1280];
const pending = new Map();

// Las imágenes remotas nunca pueden acceder a localhost o a redes privadas,
// incluyendo destinos de redirecciones y direcciones resueltas por DNS.
const privateNetworks = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
]) privateNetworks.addSubnet(network, prefix);
const publicIPv6 = new BlockList();
publicIPv6.addSubnet('2000::', 3, 'ipv6');
privateNetworks.addSubnet('2001:db8::', 32, 'ipv6');
privateNetworks.addSubnet('2002::', 16, 'ipv6');
privateNetworks.addSubnet('2001::', 32, 'ipv6');

export function isPublicImageAddress(address) {
  const family = isIP(address);
  if (family === 4) return !privateNetworks.check(address, 'ipv4');
  return family === 6 && publicIPv6.check(address, 'ipv6') && !privateNetworks.check(address, 'ipv6');
}

function safeLookup(hostname, options, callback) {
  lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some(entry => !isPublicImageAddress(entry.address))) {
      return callback(new Error('Destino de imagen no permitido'));
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}
const httpAgent = new http.Agent({ lookup: safeLookup, maxSockets: 4 });
const httpsAgent = new https.Agent({ lookup: safeLookup, maxSockets: 4 });

async function readSource(source) {
  if (source.startsWith('/uploads/')) {
    const filename = source.slice('/uploads/'.length);
    if (!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(filename)) throw new Error('Archivo no permitido');
    const filepath = path.join(serverRoot, 'uploads', filename);
    const info = await stat(filepath);
    if (info.size > MAX_BYTES) throw new Error('Imagen demasiado grande');
    return readFile(filepath);
  }
  let url = new URL(source);
  const deadline = Date.now() + 8000;
  for (let redirects = 0; redirects <= 3; redirects++) {
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        (isIP(hostname) && !isPublicImageAddress(hostname))) throw new Error('URL de imagen no permitida');
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Tiempo de imagen agotado');
    const response = await axios.get(url.href, {
      responseType: 'arraybuffer', timeout: remaining, maxContentLength: MAX_BYTES,
      maxRedirects: 0, httpAgent, httpsAgent, proxy: false,
      validateStatus: status => status >= 200 && status < 400,
    });
    if (response.status >= 300) {
      if (!response.headers.location) throw new Error('Redirección sin destino');
      url = new URL(response.headers.location, url);
      continue;
    }
    if (!response.headers['content-type']?.startsWith('image/')) throw new Error('Contenido no es imagen');
    return response.data;
  }
  throw new Error('Demasiadas redirecciones');
}

export async function resizeArticleImage(buffer, width) {
  if (!IMAGE_WIDTHS.includes(width)) throw new Error('Tamaño no permitido');
  return sharp(buffer, { limitInputPixels: 40_000_000, animated: false })
    .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
}

export async function getArticleImage(source, width) {
  if (!IMAGE_WIDTHS.includes(width)) throw new Error('Tamaño no permitido');
  const hash = createHash('sha256').update(source).digest('hex');
  const filepath = path.join(cacheRoot, `${hash}-${width}.webp`);
  try { await stat(filepath); return filepath; } catch (err) { if (err.code !== 'ENOENT') throw err; }
  if (!pending.has(filepath)) {
    const task = (async () => {
      const buffer = await resizeArticleImage(await readSource(source), width);
      await mkdir(cacheRoot, { recursive: true });
      const temporary = `${filepath}.${process.pid}.tmp`;
      try { await writeFile(temporary, buffer); await rename(temporary, filepath); }
      finally { await unlink(temporary).catch(() => {}); }
      return filepath;
    })().finally(() => pending.delete(filepath));
    pending.set(filepath, task);
  }
  return pending.get(filepath);
}
