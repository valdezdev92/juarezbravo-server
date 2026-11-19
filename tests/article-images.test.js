import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { writeFile, unlink, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { getArticleImage, isPublicImageAddress, resizeArticleImage } from '../server/services/articleImages.js';

test('genera miniaturas WebP sin agrandar imágenes pequeñas', async () => {
  const source = await sharp({ create: { width: 1000, height: 600, channels: 3, background: '#bb2233' } }).png().toBuffer();
  const small = await resizeArticleImage(source, 160);
  const metadata = await sharp(small).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 160);
  assert.equal(metadata.height, 96);
  assert.ok(small.length < source.length);
  assert.equal((await sharp(await resizeArticleImage(small, 1280)).metadata()).width, 160);
  await assert.rejects(() => resizeArticleImage(source, 999), /Tamaño/);
});

test('cachea imágenes locales y comparte las solicitudes concurrentes', async () => {
  const filename = `test-thumbnail-${process.pid}.png`;
  const source = `/uploads/${filename}`;
  const original = new URL(`../server/uploads/${filename}`, import.meta.url);
  const hash = createHash('sha256').update(source).digest('hex');
  const cached = new URL(`../server/image-cache/${hash}-480.webp`, import.meta.url);
  await writeFile(original, await sharp({ create: { width: 640, height: 400, channels: 3, background: 'white' } }).png().toBuffer());
  try {
    const [first, second] = await Promise.all([getArticleImage(source, 480), getArticleImage(source, 480)]);
    assert.equal(first, second);
    const before = await stat(cached);
    assert.equal((await sharp(first).metadata()).width, 480);
    await getArticleImage(source, 480);
    assert.equal((await stat(cached)).mtimeMs, before.mtimeMs);
  } finally {
    await unlink(original);
    await unlink(cached).catch(() => {});
  }
});

test('bloquea imágenes de redes privadas, protocolos alternativos y rutas fuera de uploads', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '172.16.0.1', '192.168.1.1', '::1', '::ffff:127.0.0.1', 'fe80::1', 'fc00::1']) {
    assert.equal(isPublicImageAddress(address), false, address);
  }
  assert.equal(isPublicImageAddress('8.8.8.8'), true);
  assert.equal(isPublicImageAddress('2606:4700:4700::1111'), true);
  for (const url of ['http://127.0.0.1/x', 'http://[::1]/x', 'file:///etc/passwd', 'http://user:pass@example.com/x', '/uploads/../db.js']) {
    await assert.rejects(() => getArticleImage(url, 160));
  }
});
