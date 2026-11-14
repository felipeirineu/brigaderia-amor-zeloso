import { Button } from '../../components/Button';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Failure } from '../operations/common';
import { readWorkbookSheets } from './readCustomersFile';
import {
  CATALOG_SHEETS,
  plain,
  planCatalog,
  resolveRecipes,
  type CatalogPlan,
} from '../../../shared/catalog-import';
import { customerRows } from '../../../shared/import-customers';

interface Product {
  id: string;
  name: string;
  variants: { id: string; active: number }[];
}
interface Named {
  id: string;
  name: string;
}
interface CustomerRow {
  index: number;
  status: string;
  message: string;
}
interface Preview {
  plan: CatalogPlan;
  newFlavors: CatalogPlan['flavors'];
  newSupplies: CatalogPlan['supplies'];
  newRecipes: CatalogPlan['recipes'];
  skipped: string[];
  problems: string[];
  customers: Record<string, string>[];
  customerRows: CustomerRow[];
}
const money = (c: number | null) =>
  c === null
    ? 'sem preço'
    : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const amount = (milli: number, unit: string) =>
  `${(milli / 1000).toLocaleString('pt-BR')} ${unit === 'unit' ? 'un.' : unit === 'ml' ? 'mL' : 'g'}`;

/**
 * Cadastro inicial a partir de uma planilha (abas Sabores, Insumos, Fichas e
 * Clientes). Nada é gravado até confirmar; cada linha passa pelas mesmas APIs,
 * regras e permissões do cadastro manual. O que já existe (mesmo nome) fica
 * como está, então repetir a importação não duplica.
 */
export function ImportCatalog() {
  const [sheets, setSheets] = useState<Record<string, unknown[][] | undefined>>(
      {},
    ),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [progress, setProgress] = useState(''),
    [busy, setBusy] = useState(false),
    pending = useRef(false);

  async function file(f?: File) {
    if (!f) return;
    setBusy(true);
    setError('');
    setNotice('');
    setPreview(null);
    try {
      setSheets(await readWorkbookSheets(f, Object.values(CATALOG_SHEETS)));
    } catch (e) {
      setSheets({});
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function show() {
    setBusy(true);
    setError('');
    try {
      const plan = planCatalog({
        flavors: sheets[CATALOG_SHEETS.flavors],
        supplies: sheets[CATALOG_SHEETS.supplies],
        recipes: sheets[CATALOG_SHEETS.recipes],
      });
      const [products, supplies, recipes] = await Promise.all([
        api<Product[]>('products?active=all'),
        api<{ items: Named[] }>('p1/supplies'),
        api<{ items: Named[] }>('p1/recipes'),
      ]);
      const has = (list: { name: string }[], name: string) =>
        list.some((x) => plain(x.name) === plain(name));
      const skipped: string[] = [];
      const keep = <T extends { name: string }>(
        list: T[],
        existing: { name: string }[],
        what: string,
      ) =>
        list.filter((x) => {
          if (!has(existing, x.name)) return true;
          skipped.push(`${what} "${x.name}" já existe: mantido como está.`);
          return false;
        });
      const newFlavors = keep(plan.flavors, products, 'Sabor'),
        newSupplies = keep(plan.supplies, supplies.items, 'Insumo'),
        newRecipes = keep(plan.recipes, recipes.items, 'Ficha');
      const problems = [
        ...plan.problems,
        ...resolveRecipes(
          { ...plan, recipes: newRecipes },
          [...products.map((p) => p.name), ...plan.flavors.map((f) => f.name)],
          [
            ...supplies.items.map((s) => s.name),
            ...plan.supplies.map((s) => s.name),
          ],
        ),
      ];
      let customers: Record<string, string>[] = [],
        rows: CustomerRow[] = [];
      const sheet = sheets[CATALOG_SHEETS.customers];
      if (sheet && sheet.length > 1) {
        try {
          customers = customerRows(sheet);
          rows = (
            await api<{ rows: CustomerRow[] }>(
              'p1/customer-import/preview',
              'POST',
              { rows: customers },
            )
          ).rows;
          for (const r of rows)
            if (r.status === 'invalid')
              problems.push(`Clientes, linha ${r.index + 2}: ${r.message}`);
        } catch (e) {
          problems.push('Clientes: ' + (e as Error).message);
        }
      }
      setPreview({
        plan,
        newFlavors,
        newSupplies,
        newRecipes,
        skipped,
        problems,
        customers,
        customerRows: rows,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const done: string[] = [];
    try {
      for (const [i, f] of preview.newFlavors.entries()) {
        setProgress(`Sabores ${i + 1} de ${preview.newFlavors.length}…`);
        await api(
          'products',
          'POST',
          {
            name: f.name,
            description: f.description,
            photo_key: f.photo_key,
            variants: [f.variant],
          },
          crypto.randomUUID(),
        );
      }
      if (preview.newFlavors.length)
        done.push(`${preview.newFlavors.length} sabores`);
      for (const [i, s] of preview.newSupplies.entries()) {
        setProgress(`Insumos ${i + 1} de ${preview.newSupplies.length}…`);
        await api(
          'p1/supplies',
          'POST',
          {
            name: s.name,
            unit: s.unit,
            pack_quantity_milli: s.pack_quantity_milli,
            pack_cost_cents: s.pack_cost_cents,
          },
          crypto.randomUUID(),
        );
      }
      if (preview.newSupplies.length)
        done.push(`${preview.newSupplies.length} insumos`);
      if (preview.newRecipes.length) {
        const [products, supplies] = await Promise.all([
          api<Product[]>('products?active=all'),
          api<{ items: Named[] }>('p1/supplies'),
        ]);
        for (const [i, r] of preview.newRecipes.entries()) {
          setProgress(`Fichas ${i + 1} de ${preview.newRecipes.length}…`);
          const product = products.find(
            (p) => plain(p.name) === plain(r.flavor),
          );
          const variant =
            product?.variants.find((v) => v.active) ?? product?.variants[0];
          if (!variant) throw Error(`Sabor "${r.flavor}" sem embalagem.`);
          await api(
            'p1/recipes',
            'POST',
            {
              name: r.name,
              variant_id: variant.id,
              yield_units: r.yield_units,
              packaging_cents: r.packaging_cents,
              labor_cents: r.labor_cents,
              overhead_cents: r.overhead_cents,
              margin_bps: r.margin_bps,
              components: r.components.map((c) => ({
                supply_id: supplies.items.find(
                  (s) => plain(s.name) === plain(c.supply),
                )!.id,
                quantity_milli: c.quantity_milli,
              })),
            },
            crypto.randomUUID(),
          );
        }
        done.push(`${preview.newRecipes.length} fichas`);
      }
      const ready = preview.customerRows
        .filter((r) => r.status === 'ready')
        .map((r) => r.index);
      if (ready.length) {
        setProgress('Clientes…');
        const r = await api<{ rows: { status: string }[] }>(
          'p1/customer-import/confirm',
          'POST',
          { rows: preview.customers, selected: ready },
          crypto.randomUUID(),
        );
        done.push(
          `${r.rows.filter((x) => x.status === 'created').length} clientes`,
        );
      }
      setNotice(
        done.length
          ? `Cadastro concluído: ${done.join(', ')}.`
          : 'Nada novo para cadastrar: tudo já existia.',
      );
      setPreview(null);
      setSheets({});
    } catch (e) {
      setError(
        (e as Error).message +
          (done.length
            ? ` Já gravado: ${done.join(', ')}. Corrija e importe de novo; o que já existe não se repete.`
            : ''),
      );
    } finally {
      setProgress('');
      pending.current = false;
      setBusy(false);
    }
  }

  const found = Object.entries(sheets).filter(([, v]) => v && v.length > 1);
  const total = preview
    ? preview.newFlavors.length +
      preview.newSupplies.length +
      preview.newRecipes.length +
      preview.customerRows.filter((r) => r.status === 'ready').length
    : 0;
  return (
    <section className="panel">
      <h1 className="mobile-context-title">Importar cadastro inicial</h1>
      <p>
        Uma planilha XLSX com as abas <b>Sabores</b>, <b>Insumos</b>,{' '}
        <b>Fichas</b> e <b>Clientes</b> (todas opcionais, até 50 linhas cada,
        sem fórmulas). Nada é gravado até você confirmar. O que já existe com o
        mesmo nome fica como está, então importar de novo não duplica.
      </p>
      <label>
        Planilha de cadastro inicial
        <input
          type="file"
          accept=".xlsx"
          disabled={busy}
          onChange={(e) => void file(e.target.files?.[0])}
        />
      </label>
      <Failure message={error} />
      <p role="status">{progress || notice}</p>
      {found.length > 0 && !preview && (
        <Button disabled={busy} loading={busy} onClick={() => void show()}>
          Ver prévia ({found.map(([n]) => n).join(', ')})
        </Button>
      )}
      {preview && (
        <div className="catalog-preview">
          {preview.problems.length > 0 && (
            <div role="alert" className="form-error">
              <p>
                <b>Corrija a planilha antes de importar:</b>
              </p>
              <ul>
                {preview.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          <h2>Sabores novos ({preview.newFlavors.length})</h2>
          <ul>
            {preview.newFlavors.map((f) => (
              <li key={f.name}>
                {f.name} · {f.variant.label} · {f.variant.weight_grams} g ·{' '}
                {f.variant.units_per_box} un. · {money(f.variant.price_cents)}
                {f.photo_key ? ' · com foto' : ''}
              </li>
            ))}
          </ul>
          <h2>Insumos novos ({preview.newSupplies.length})</h2>
          <ul>
            {preview.newSupplies.map((s) => (
              <li key={s.name}>
                {s.name} · {amount(s.pack_quantity_milli, s.unit)} ·{' '}
                {money(s.pack_cost_cents)}
              </li>
            ))}
          </ul>
          <h2>Fichas novas ({preview.newRecipes.length})</h2>
          <ul>
            {preview.newRecipes.map((r) => (
              <li key={r.name}>
                {r.name} · rende {r.yield_units} · {r.components.length} insumos
                · outros custos {money(r.overhead_cents)}
              </li>
            ))}
          </ul>
          {preview.customerRows.length > 0 && (
            <>
              <h2>
                Clientes novos (
                {
                  preview.customerRows.filter((r) => r.status === 'ready')
                    .length
                }
                )
              </h2>
              <ul>
                {preview.customerRows.map((r) => (
                  <li key={r.index}>
                    {preview.customers[r.index]?.name} · {r.message}
                  </li>
                ))}
              </ul>
            </>
          )}
          {preview.skipped.length > 0 && (
            <details>
              <summary>Já cadastrados ({preview.skipped.length})</summary>
              <ul>
                {preview.skipped.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </details>
          )}
          <Button
            className="primary-action"
            variant="primary"
            loading={busy}
            disabled={busy || preview.problems.length > 0 || !total}
            onClick={() => void confirm()}
          >
            {total
              ? `Confirmar cadastro de ${total} itens`
              : 'Nada novo para cadastrar'}
          </Button>
        </div>
      )}
    </section>
  );
}
