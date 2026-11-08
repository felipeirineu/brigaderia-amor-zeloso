import assert from 'node:assert/strict';
import sharp from 'sharp';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
});
const request = (path, options = {}) =>
  t.request(path, { ...options, key: options.key ?? crypto.randomUUID() });
try {
  const { call, owner, operator, outside, customer } = await demoProject(t);
  const own = (await call('session', undefined, 'GET')).user_id,
    op = (await call('session', undefined, 'GET', operator)).user_id;
  const path = 'field/profile-photos/' + op;
  const image = await sharp({
    create: { width: 64, height: 64, channels: 3, background: '#321d10' },
  })
    .webp()
    .toBuffer();
  const { emptyPlace } = await import('../../shared/field.ts');
  await call(
    'field/customers/' + customer,
    { version: 0, data: emptyPlace() },
    'PUT',
  );
  await call(
    'field/customers/' + customer + '/photo',
    { version: 1, base64: image.toString('base64') },
    'PUT',
  );
  const site = await request('field/customers/' + customer + '/photo', {
    cookie: owner,
  });
  assert.deepEqual(
    Buffer.from(await site.arrayBuffer()),
    image,
    'fachada também converte BLOB para bytes HTTP',
  );
  const key = crypto.randomUUID(),
    body = { version: 0, base64: image.toString('base64') };
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await request(path, {
          cookie: operator,
          method: 'PUT',
          key,
          data: body,
        })
      ).status,
      200,
    );
  let profile = (await call('field/context', undefined, 'GET')).staff.find(
    (s) => s.id === op,
  );
  assert.equal(profile.photo_version, 1);
  assert.equal(profile.has_photo, 1);
  let response = await request(path, { cookie: owner });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal((await request(path)).status, 401);
  for (const method of ['GET', 'PUT', 'DELETE'])
    assert.equal(
      (
        await request(path, {
          cookie: outside,
          method,
          data:
            method === 'GET' ? undefined : { version: 1, base64: body.base64 },
        })
      ).status,
      404,
    );
  assert.equal(
    (
      await request('field/profile-photos/' + own, {
        cookie: operator,
        method: 'PUT',
        data: body,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request('field/profile-photos/' + own, {
        cookie: operator,
        method: 'DELETE',
        data: { version: 0 },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(path, {
        cookie: owner,
        method: 'PUT',
        data: { ...body, version: 1 },
      })
    ).status,
    403,
  );
  const race = await Promise.all(
    [0, 1].map(() =>
      request(path, {
        cookie: operator,
        method: 'PUT',
        data: { ...body, version: 1 },
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  // Corpo maior que o limite padrão do p1Mutation; WebP válido com chunk JUNK permitido.
  const chunk = Buffer.alloc(8 + 35000);
  chunk.write('JUNK');
  chunk.writeUInt32LE(35000, 4);
  const large = Buffer.concat([image, chunk]);
  large.writeUInt32LE(large.length - 8, 4);
  assert.equal(
    (
      await request(path, {
        cookie: operator,
        method: 'PUT',
        data: { version: 2, base64: large.toString('base64') },
      })
    ).status,
    200,
  );
  const badImage = await sharp({
    create: { width: 300, height: 300, channels: 3, background: '#321d10' },
  })
    .webp()
    .toBuffer();
  for (const base64 of [
    Buffer.from('nao e imagem').toString('base64'),
    badImage.toString('base64'),
    Buffer.alloc(40961).toString('base64'),
    '!',
  ]) {
    assert.equal(
      (
        await request(path, {
          cookie: operator,
          method: 'PUT',
          data: { version: 3, base64 },
        })
      ).status,
      400,
    );
  }
  assert.equal(
    (await call('field/context', undefined, 'GET')).staff.find(
      (s) => s.id === op,
    ).photo_version,
    3,
  );
  assert.equal(
    (
      await request(path, {
        cookie: owner,
        method: 'DELETE',
        data: { version: 3 },
      })
    ).status,
    200,
  );
  assert.equal((await request(path, { cookie: operator })).status, 404);
  profile = (await call('field/context', undefined, 'GET')).staff.find(
    (s) => s.id === op,
  );
  assert.equal(profile.photo_version, 4);
  assert.equal(profile.has_photo, 0);
  assert.equal(
    (
      await request(path, {
        cookie: operator,
        method: 'PUT',
        data: { ...body, version: 3 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(path, {
        cookie: operator,
        method: 'PUT',
        data: { ...body, version: 4 },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(path, {
        cookie: operator,
        method: 'DELETE',
        data: { version: 5 },
      })
    ).status,
    200,
  );
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  console.log(
    'OK fotos privadas: assinatura/dimensões/tamanho, corpo >32KB, CAS/idempotência, autor/owner/tenant, no-store e remoção.',
  );
} finally {
  await t.dispose();
}
const old = await runtime({
  migrationLimit: 16,
  fieldEnabled: true,
  mobileEnabled: true,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const { call, owner } = await demoProject(old);
  const session = await call('session', undefined, 'GET');
  assert.equal(
    (await call('field/context', undefined, 'GET')).profile_photos_ready,
    false,
  );
  assert.equal(
    (
      await old.request('field/profile-photos/' + session.user_id, {
        cookie: owner,
      })
    ).status,
    503,
  );
  console.log(
    'OK banco até 0016 mantém contexto sem fotos e endpoint indisponível.',
  );
} finally {
  await old.dispose();
}
