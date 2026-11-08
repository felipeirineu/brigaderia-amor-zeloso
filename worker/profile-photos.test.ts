import { expect, it } from 'vitest';
import sharp from 'sharp';
import { profileImage } from './profile-photos';
it('aceita WebP lossy/lossless/alpha quadrados e preserva bytes', async () => {
  for (const settings of [{ lossless: false }, { lossless: true }]) {
    const photo = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 50, g: 29, b: 16, alpha: 0.5 },
      },
    })
      .webp(settings)
      .toBuffer();
    expect(Buffer.from(profileImage(photo.toString('base64')))).toEqual(photo);
  }
});
it('recusa cabeçalho falso, imagem não quadrada/grande, animação e metadados', async () => {
  for (const [width, height] of [
    [64, 32],
    [257, 257],
  ]) {
    const photo = await sharp({
      create: { width, height, channels: 3, background: '#321d10' },
    })
      .webp()
      .toBuffer();
    expect(() => profileImage(photo.toString('base64'))).toThrow();
  }
  expect(() => profileImage('!')).toThrow();
  expect(() =>
    profileImage(Buffer.from('RIFF\0\0\0\0WEBP').toString('base64')),
  ).toThrow();
  const photo = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#321d10' },
  })
    .webp()
    .toBuffer();
  for (const kind of ['ANIM', 'ANMF', 'EXIF', 'XMP ']) {
    const extra = Buffer.alloc(8);
    extra.write(kind);
    const bytes = Buffer.concat([photo, extra]);
    bytes.writeUInt32LE(bytes.length - 8, 4);
    expect(() => profileImage(bytes.toString('base64'))).toThrow();
  }
});
