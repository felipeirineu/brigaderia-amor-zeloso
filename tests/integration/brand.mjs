import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
function luminance(hex) {
  const values = hex
    .match(/[\da-f]{2}/gi)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
for (const [fg, bg] of [
  ['FFFFFF', '2B7A49'],
  ['321D10', 'F9ECD7'],
  ['321D10', 'F1E2CC'],
  ['F9ECD7', '3E2B1E'],
  ['725D53', 'FBF8F3'],
  ['76532F', 'F9ECD7'],
  ['F9ECD7', '321D10'],
]) {
  const ratio =
    (Math.max(luminance(fg), luminance(bg)) + 0.05) /
    (Math.min(luminance(fg), luminance(bg)) + 0.05);
  assert(ratio >= 4.5);
  console.log(`AA #${fg} / #${bg}: ${ratio.toFixed(2)}:1`);
}
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]) {
  const meta = await sharp('public/icons/' + name).metadata();
  assert.equal(meta.width, size);
  assert.equal(meta.height, size);
}
const ico = await readFile('public/favicon.ico');
assert.equal(ico.readUInt16LE(2), 1);
const css = await readFile('src/styles.css', 'utf8');
assert(css.includes('--gold: #b8915b'));
assert(css.includes('--chocolate: #321d10'));
console.log('Assets PWA/touch/favicon e contraste: OK.');
