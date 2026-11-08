import { z } from 'zod';
import { HttpError, type Actor } from './security';
export const photoBody = (value: ArrayBuffer | number[]) =>
  Array.isArray(value) ? Uint8Array.from(value) : value;
import { p1Mutation } from './p1-common';
export async function profilePhotosReady(db: D1Database) {
  return !!(await db
    .prepare(
      "SELECT 1 FROM sqlite_schema WHERE type='table' AND name='profile_photos'",
    )
    .first());
}
/** RIFF/WebP estático, quadrado e pequeno; canvas remove metadados antes do envio. */
export function profileImage(base64: string) {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, 'Foto WebP inválida.');
  }
  const fail = () => {
    throw new HttpError(
      400,
      'Use uma foto WebP quadrada, estática, de até 256 px e 40 KB.',
    );
  };
  if (bytes.length < 20 || bytes.length > 40960) return fail();
  const ascii = (offset: number, size: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + size));
  const view = new DataView(bytes.buffer);
  if (
    ascii(0, 4) !== 'RIFF' ||
    ascii(8, 4) !== 'WEBP' ||
    view.getUint32(4, true) !== bytes.length - 8
  )
    return fail();
  let canvas: number[] | undefined, image: number[] | undefined;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = ascii(offset, 4),
      length = view.getUint32(offset + 4, true),
      d = offset + 8;
    if (d + length > bytes.length) return fail();
    if (['ANIM', 'ANMF', 'EXIF', 'XMP '].includes(kind)) return fail();
    let dimensions: number[] | undefined;
    if (kind === 'VP8X') {
      if (length !== 10 || bytes[d] & 2 || canvas) return fail();
      dimensions = [
        1 + bytes[d + 4] + (bytes[d + 5] << 8) + (bytes[d + 6] << 16),
        1 + bytes[d + 7] + (bytes[d + 8] << 8) + (bytes[d + 9] << 16),
      ];
      canvas = dimensions;
    } else if (kind === 'VP8 ') {
      if (length < 10 || ascii(d + 3, 3) !== '\x9d\x01\x2a' || image)
        return fail();
      dimensions = [
        view.getUint16(d + 6, true) & 0x3fff,
        view.getUint16(d + 8, true) & 0x3fff,
      ];
      image = dimensions;
    } else if (kind === 'VP8L') {
      if (length < 5 || bytes[d] !== 0x2f || image) return fail();
      dimensions = [
        1 + ((bytes[d + 1] | (bytes[d + 2] << 8)) & 0x3fff),
        1 +
          (((bytes[d + 2] >> 6) | (bytes[d + 3] << 2) | (bytes[d + 4] << 10)) &
            0x3fff),
      ];
      image = dimensions;
    }
    if (
      dimensions &&
      (dimensions[0] < 1 ||
        dimensions[0] > 256 ||
        dimensions[0] !== dimensions[1])
    )
      return fail();
    offset = d + length + (length % 2);
    if (
      offset > bytes.length ||
      (offset !== bytes.length && offset + 8 > bytes.length)
    )
      return fail();
  }
  if (!image || (canvas && (canvas[0] !== image[0] || canvas[1] !== image[1])))
    return fail();
  return bytes;
}
export async function profilePhoto(
  req: Request,
  db: D1Database,
  a: Actor,
  id?: string,
) {
  if (
    !z.uuid().safeParse(id).success ||
    !(await db
      .prepare(
        'SELECT 1 FROM memberships WHERE organization_id=? AND user_id=?',
      )
      .bind(a.organization_id, id)
      .first())
  )
    throw new HttpError(404, 'Perfil não encontrado.');
  if (!(await profilePhotosReady(db)))
    throw new HttpError(503, 'Fotos de perfil ainda indisponíveis.');
  if (req.method === 'GET') {
    const row = await db
      .prepare(
        'SELECT photo FROM profile_photos WHERE organization_id=? AND id=?',
      )
      .bind(a.organization_id, id)
      .first<{ photo: ArrayBuffer | number[] | null }>();
    if (!row?.photo) throw new HttpError(404, 'Sem foto.');
    return new Response(photoBody(row.photo), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (!['PUT', 'DELETE'].includes(req.method))
    throw new HttpError(405, 'Método não permitido.');
  if (id !== a.user_id && (req.method !== 'DELETE' || a.role !== 'owner'))
    throw new HttpError(
      403,
      'Altere somente sua foto; administrador pode remover fotos da equipe.',
    );
  return p1Mutation(
    req,
    db,
    a,
    async (raw, nonce) => {
      const d = (
        req.method === 'DELETE'
          ? z.object({ version: z.number().int().min(0) }).strict()
          : z
              .object({
                version: z.number().int().min(0),
                base64: z.base64().max(54616),
              })
              .strict()
      ).parse(raw);
      const image =
        'base64' in d && typeof d.base64 === 'string'
          ? profileImage(d.base64)
          : null;
      return {
        id: id!,
        table: 'profile_photos',
        action: image ? 'profile.photo_saved' : 'profile.photo_removed',
        response: { ok: true },
        first: db
          .prepare(
            'INSERT INTO profile_photos(organization_id,id,photo,version,mutation_id) SELECT ?,?,?,1,? WHERE (?=0 OR EXISTS(SELECT 1 FROM profile_photos WHERE organization_id=? AND id=? AND version=?)) ON CONFLICT(organization_id,id) DO UPDATE SET photo=excluded.photo,version=profile_photos.version+1,mutation_id=excluded.mutation_id WHERE profile_photos.version=?',
          )
          .bind(
            a.organization_id,
            id,
            image,
            nonce,
            d.version,
            a.organization_id,
            id,
            d.version,
            d.version,
          ),
        rest: () => [],
      };
    },
    65536,
  );
}
