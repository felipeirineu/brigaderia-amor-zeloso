// Todos os valores são DEMONSTRAÇÃO, em D1 efêmero; nenhum cadastro real.
import assert from 'node:assert/strict';
import { runtime } from '../helpers/runtime.mjs';
import { demoProject } from '../helpers/demo-project.mjs';
const t = await runtime({
  financeEnabled: true,
  p1Enabled: true,
  mobileEnabled: true,
  fieldEnabled: true,
  toolsEnabled: true,
});
try {
  const { call, owner, operator, outside, makeOrder } = await demoProject(t);
  const oldOrder = await makeOrder();
  const before = await call('orders/' + oldOrder, undefined, 'GET');
  const request = (
    path,
    method = 'GET',
    data,
    cookie = owner,
    key = crypto.randomUUID(),
  ) => t.request(path, { cookie, method, data, key });
  const data = {
    weight_grams: 15,
    dough_weight_grams: 13,
    units_per_kit: 25,
    price_cents: 12345,
    max_flavors: 5,
    packaging_supply_id: null,
  };
  assert.deepEqual(await call('p1/kits', undefined, 'GET'), []);
  assert.deepEqual(await call('p1/kit-settings', undefined, 'GET'), {
    limit_flavors: true,
    version: 0,
  });
  const custom = await call('p1/kits', {
    ...data,
    weight_grams: 20,
    units_per_kit: 6,
    max_flavors: 6,
  });
  assert.equal(
    (await call('p1/kits/' + custom.id, undefined, 'GET')).units_per_kit,
    6,
  );
  const key = crypto.randomUUID(),
    kit = await call('p1/kits', data, 'POST', owner, key);
  assert.equal((await call('p1/kits', data, 'POST', owner, key)).id, kit.id);
  assert.equal((await call('p1/kits', undefined, 'GET')).length, 2);
  assert.equal(
    (await request('p1/kits', 'POST', data)).status,
    409,
    'combinação duplicada',
  );
  for (const change of [
    { weight_grams: 0 },
    { weight_grams: 501 },
    { units_per_kit: 0 },
    { units_per_kit: 501 },
    { max_flavors: 26 },
    { max_flavors: 0 },
    { price_cents: -1 },
    { dough_weight_grams: 16 },
    { weight_grams: 23.5 },
  ])
    assert.equal(
      (await request('p1/kits', 'POST', { ...data, ...change })).status,
      400,
    );
  assert.equal(
    (
      await request(
        'p1/kits/' + kit.id,
        'PUT',
        { ...data, version: 1 },
        operator,
      )
    ).status,
    403,
  );
  assert.equal((await request('p1/kits', 'POST', data, operator)).status, 403);
  for (const method of ['GET', 'PUT'])
    assert.equal(
      (
        await request(
          'p1/kits/' + kit.id,
          method,
          method === 'PUT' ? { ...data, version: 1 } : undefined,
          outside,
        )
      ).status,
      404,
    );
  const packaging = await call('p1/supplies', {
    name: 'Embalagem DEMONSTRAÇÃO',
    unit: 'unit',
    pack_quantity_milli: 50000,
    pack_cost_cents: null,
  });
  const grams = await call('p1/supplies', {
    name: 'Insumo DEMONSTRAÇÃO',
    unit: 'g',
    pack_quantity_milli: 1000000,
    pack_cost_cents: 100,
  });
  assert.equal(
    (
      await request('p1/kits/' + kit.id, 'PUT', {
        ...data,
        packaging_supply_id: grams.id,
        version: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request('p1/kits/' + kit.id, 'PUT', {
        ...data,
        packaging_supply_id: crypto.randomUUID(),
        version: 1,
      })
    ).status,
    404,
  );
  const results = await Promise.all([
    request('p1/kits/' + kit.id, 'PUT', {
      ...data,
      packaging_supply_id: packaging.id,
      version: 1,
    }),
    request('p1/kits/' + kit.id, 'PUT', {
      ...data,
      price_cents: 54321,
      version: 1,
    }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  let current = await call('p1/kits/' + kit.id, undefined, 'GET');
  assert.equal(current.version, 2);
  const archiveKey = crypto.randomUUID(),
    archived = {
      ...data,
      version: 2,
      active: false,
      packaging_supply_id: packaging.id,
    };
  await call('p1/kits/' + kit.id, archived, 'PUT', owner, archiveKey);
  await call('p1/kits/' + kit.id, archived, 'PUT', owner, archiveKey);
  current = await call('p1/kits/' + kit.id, undefined, 'GET');
  assert.equal(current.version, 3);
  assert.equal(current.active, 0);
  const changed = await Promise.all([
    request('p1/kit-settings', 'PUT', { limit_flavors: false, version: 0 }),
    request('p1/kit-settings', 'PUT', { limit_flavors: true, version: 0 }),
  ]);
  assert.deepEqual(changed.map((r) => r.status).sort(), [200, 409]);
  const setting = await call('p1/kit-settings', undefined, 'GET');
  assert.equal(setting.version, 1);
  const settingKey = crypto.randomUUID();
  await call(
    'p1/kit-settings',
    { limit_flavors: false, version: 1 },
    'PUT',
    owner,
    settingKey,
  );
  await call(
    'p1/kit-settings',
    { limit_flavors: false, version: 1 },
    'PUT',
    owner,
    settingKey,
  );
  assert.deepEqual(await call('p1/kit-settings', undefined, 'GET', operator), {
    limit_flavors: false,
    version: 2,
  });
  assert.deepEqual(await call('p1/kit-settings', undefined, 'GET', outside), {
    limit_flavors: true,
    version: 0,
  });
  assert.equal(
    (
      await request(
        'p1/kit-settings',
        'PUT',
        { limit_flavors: true, version: 2 },
        operator,
      )
    ).status,
    403,
  );
  assert.equal((await request('p1/kits/' + kit.id + '/invalido')).status, 404);
  assert.equal(
    (
      await t.db
        .prepare(
          "SELECT COUNT(*) n FROM audit_events WHERE action='kit.flavor_limit_changed'",
        )
        .first()
    ).n,
    2,
  );
  assert.equal(
    (await t.db.prepare('PRAGMA foreign_key_check').all()).results.length,
    0,
  );
  const after = await call('orders/' + oldOrder, undefined, 'GET');
  assert.deepEqual(after, before, 'cadastro não modifica snapshots antigos');
  assert.equal(
    (await t.db.prepare('SELECT COUNT(*) n FROM products').first()).n,
    1,
    'nenhum produto virtual criado para o kit',
  );
  // Kit padrão em todos os estabelecimentos: só administrador, só
  // estabelecimentos ativos, preserva o resto do cadastro B2B e repete sem efeito.
  {
    const active = (await call('p1/kits', undefined, 'GET')).find(
      (k) => k.active,
    );
    const mk = async (name, phone) =>
      (await call('customers', { name, phone, email: '', notes: '' })).id;
    const shop = await mk('Loja DEMONSTRAÇÃO kit', '+5511900000301'),
      person = await mk('Pessoa DEMONSTRAÇÃO kit', '+5511900000302'),
      closed = await mk('Inativa DEMONSTRAÇÃO kit', '+5511900000303');
    await t.db.batch([
      t.db
        .prepare("UPDATE customers SET customer_type='person' WHERE id=?")
        .bind(person),
      t.db.prepare('UPDATE customers SET active=0 WHERE id=?').bind(closed),
    ]);
    const profile = await call(
      'finance/customers/' + shop + '/profile',
      undefined,
      'GET',
    );
    await call(
      'finance/customers/' + shop + '/profile',
      {
        version: profile.version,
        data: { ...profile.data, responsible: 'Responsável DEMONSTRAÇÃO' },
      },
      'PUT',
    );
    assert.equal(
      (await request('p1/kit-default', 'POST', { kit_id: active.id }, operator))
        .status,
      403,
    );
    assert.equal(
      (await request('p1/kit-default', 'POST', { kit_id: active.id }, outside))
        .status,
      404,
      'kit de outra organização',
    );
    const done = await call('p1/kit-default', { kit_id: active.id });
    assert.ok(done.changed >= 1 && done.establishments >= 1);
    const kitOf = async (id) =>
      (await call('finance/customers/' + id + '/profile', undefined, 'GET'))
        .data.default_kit_id ?? null;
    assert.equal(await kitOf(shop), active.id);
    assert.equal(await kitOf(person), null, 'pessoa física fica de fora');
    assert.equal(await kitOf(closed), null, 'inativo fica de fora');
    assert.equal(
      (await call('finance/customers/' + shop + '/profile', undefined, 'GET'))
        .data.responsible,
      'Responsável DEMONSTRAÇÃO',
    );
    assert.equal(
      (await call('p1/kit-default', { kit_id: active.id })).changed,
      0,
      'repetir não muda nada',
    );
    assert.ok(
      (
        await t.db
          .prepare(
            "SELECT COUNT(*) n FROM audit_events WHERE action='kit.default_all'",
          )
          .first()
      ).n >= 2,
    );
  }
  console.log(
    'OK R15-A kits/configuração: CAS concorrente, idempotência, embalagem/unidade, limites de cadastro, organização, papéis, auditoria e legado intacto.',
  );
} finally {
  await t.dispose();
}
const legacy = await runtime({
  migrationLimit: 18,
  financeEnabled: true,
  p1Enabled: true,
});
try {
  const { owner, call, makeOrder } = await demoProject(legacy);
  const id = await makeOrder();
  assert.equal(
    (await legacy.request('p1/kits', { cookie: owner })).status,
    503,
  );
  assert.equal(
    (await call('orders/' + id, undefined, 'GET')).status,
    'confirmed',
  );
  console.log(
    'OK R15-A banco até0018 preserva gestão e mantém kits indisponíveis.',
  );
} finally {
  await legacy.dispose();
}
