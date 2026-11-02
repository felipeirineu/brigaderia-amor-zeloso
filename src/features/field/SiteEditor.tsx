import { RouteInfo } from './RouteInfo';
import { drainRoutes } from './route-queue';
import { Button } from '../../components/Button';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useField, SiteAvatar } from './FieldContext';
import { PlaceFields } from './PlaceFields';
import {
  emptyPlace,
  instagramProfile,
  distance,
  type Place,
} from '../../../shared/field';
import { api } from '../api';
import { useRemote, Failure } from '../operations/common';
import { compressPhoto } from './photo';
function Editor({
  customer,
  company = false,
}: {
  customer: { id: string; name: string };
  company?: boolean;
}) {
  const ctx = useField()!,
    site = ctx.data?.sites.find((s) => s.id === customer.id),
    current = company ? ctx.data?.company : site;
  const [draft, setDraft] = useState<Place | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const value = draft ?? current?.data ?? emptyPlace();
  async function save() {
    setBusy(true);
    setError('');
    try {
      const saved = await api<{ routes_queued?: boolean }>(
        company ? 'field/company' : 'field/customers/' + customer.id,
        'PUT',
        {
          data: { ...value, instagram: instagramProfile(value.instagram) },
          version: current?.version ?? 0,
        },
        crypto.randomUUID(),
      );
      let complete = true;
      if (saved.routes_queued)
        try {
          complete = await drainRoutes();
        } catch {
          complete = false;
        }
      await ctx.refresh();
      setDraft(null);
      if (!complete) {
        setNotice(
          'Localização salva. Ainda há rotas pendentes; use Calcular próximas rotas.',
        );
        return;
      }
      setNotice('Localização salva. Novos pedidos poderão usar este endereço.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function photo(file?: File) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const base64 = await compressPhoto(file);
      await api(`field/customers/${customer.id}/photo`, 'PUT', {
        version: site!.version,
        base64,
      });
      await ctx.refresh();
      setNotice('Foto comprimida salva.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h1 className={company ? 'mobile-context-title' : undefined}>
        {company ? 'Endereço da empresa' : customer.name}
      </h1>
      <Failure message={error} />
      <p role="status">{notice}</p>
      {company && !!ctx.data?.routing?.remaining && (
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void drainRoutes()
              .then((done) =>
                setNotice(
                  done
                    ? 'Rotas atualizadas.'
                    : 'Ainda há rotas pendentes. Tente depois.',
                ),
              )
              .then(ctx.refresh)
              .catch(() =>
                setNotice('Fila indisponível. A localização está preservada.'),
              )
              .finally(() => setBusy(false));
          }}
        >
          Calcular próximas rotas ({ctx.data.routing.remaining})
        </Button>
      )}
      {!company && <RouteInfo id={customer.id} />}
      <PlaceFields value={value} onChange={setDraft} />
      {!company && (
        <>
          <label>
            Instagram
            <input
              value={value.instagram}
              placeholder="@perfil"
              onChange={(e) =>
                setDraft({ ...value, instagram: e.target.value })
              }
            />
          </label>
          {value.instagram && (
            <a
              href={
                'https://www.instagram.com/' +
                encodeURIComponent(value.instagram.replace(/^@/, '')) +
                '/'
              }
              target="_blank"
              rel="noreferrer"
            >
              Abrir Instagram
            </a>
          )}
        </>
      )}
      <Button
        className="primary-action"
        disabled={busy || !ctx.data}
        onClick={() => void save()}
        variant="primary"
        loading={busy}
      >
        Salvar localização
      </Button>
      {!company && (
        <>
          <h2>Foto do estabelecimento</h2>
          <SiteAvatar id={customer.id} name={customer.name} />
          <p>
            Salve a localização primeiro. A foto fica privada e será reduzida
            para até 40 KB.
          </p>
          <label>
            Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={busy || !site}
              onChange={(e) => void photo(e.target.files?.[0])}
            />
          </label>
          <label>
            Escolher da galeria
            <input
              type="file"
              accept="image/*"
              disabled={busy || !site}
              onChange={(e) => void photo(e.target.files?.[0])}
            />
          </label>
          {!!site?.has_photo && (
            <Button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void api(`field/customers/${customer.id}/photo`, 'PUT', {
                  version: site.version,
                  base64: null,
                })
                  .then(() => ctx.refresh())
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
              loading={busy}
            >
              Remover foto
            </Button>
          )}
        </>
      )}
    </section>
  );
}
export function SiteEditor() {
  const { id } = useParams(),
    c = useRemote<{ id: string; name: string }>('customers/' + id);
  return c.data ? (
    <Editor key={id} customer={c.data} />
  ) : (
    <Failure message={c.error} />
  );
}
export function CompanyEditor() {
  const ctx = useField();
  return ctx?.data?.role === 'owner' ? (
    <Editor company customer={{ id: 'company', name: '' }} />
  ) : (
    <p>Somente administrador configura o endereço da empresa.</p>
  );
}
export function SiteInfo({ id, name }: { id: string; name: string }) {
  const ctx = useField(),
    site = ctx?.data?.sites.find((s) => s.id === id),
    km = site && ctx?.data ? distance(ctx.data.company.data, site.data) : null;
  return ctx ? (
    <>
      <SiteAvatar id={id} name={name} />
      {km !== null && (
        <p>
          ≈ {km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em
          linha reta
        </p>
      )}
      {site?.data.instagram && (
        <a
          href={`https://www.instagram.com/${encodeURIComponent(site.data.instagram)}/`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir Instagram
        </a>
      )}
      <Button
        className="button"
        to={`/gestao/clientes/${id}/local`}
        variant="ghost"
      >
        Localização, foto e Instagram
      </Button>
    </>
  ) : null;
}
