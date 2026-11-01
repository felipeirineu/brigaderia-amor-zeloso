import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
const source = 'docs/marca/logo-brigaderia-amor-zeloso.png';
const cream = '#F9ECD7';
await mkdir('public/icons', { recursive: true });
await mkdir('public/brand', { recursive: true });
async function icon(size, name, scale) {
  const inner = Math.round(size * scale);
  const content = await sharp(source)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: cream },
  })
    .composite([{ input: content, gravity: 'centre' }])
    .png()
    .toFile('public/icons/' + name);
}
await icon(192, 'icon-192.png', 0.92);
await icon(512, 'icon-512.png', 0.92);
await icon(512, 'maskable-512.png', 0.7);
await icon(180, 'apple-touch-icon.png', 0.9);
await icon(32, 'favicon-32.png', 0.96);
await sharp(source)
  .resize(400, 400, { fit: 'inside' })
  .webp({ quality: 88 })
  .toFile('public/brand/logo.webp');
const png = await sharp('public/icons/favicon-32.png').png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([header, png]));
console.log('Ícones derivados do logo aprovado, sem alterar seu conteúdo.');
