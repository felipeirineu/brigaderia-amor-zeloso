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
  ['F6EAD8', '1B120C'],
  ['F6EAD8', '261A12'],
  ['C9B49F', '3A2A1E'],
  ['261A12', 'F6EAD8'],
  ['12251A', '90D5A6'],
  ['A2E1B5', '1C3928'],
  ['FFC6A2', '47291C'],
  ['FFB4AA', '48241F'],
  ['E2BD82', '261A12'],
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
const css = await readFile('src/theme.css', 'utf8');
assert(css.includes('--az-gold: #b8915b'));
assert(css.includes('--az-choc: #321d10'));
assert(css.includes("[data-theme='dark']"));
console.log('Assets PWA/touch/favicon e contraste: OK.');
