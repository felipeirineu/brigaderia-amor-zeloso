import { Button } from '../../components/Button';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Failure } from '../operations/common';
import { composeAddress, type Place } from '../../../shared/field';
import { locatedNotice, mergeLocated, reverseLookup } from './locate';

export function PlaceFields({
  value,
  onChange,
  onName,
  hideLocation = false,
}: {
  hideLocation?: boolean;
  value: Place;
  onChange: (p: Place) => void;
  onName?: (name: string) => void;
}) {
  const [q, setQ] = useState(''),
    [suggestions, setSuggestions] = useState<Place[]>([]),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    waiting = useRef(false),
    last = useRef(0);
  const located = value.latitude !== null && value.longitude !== null,
    legacy = !value.street && value.address.trim();
  // Mudar rua ou cidade apaga a localização guardada, para o mapa não levar
  // a um destino antigo. Número, complemento e referência não apagam.
  const set = (patch: Partial<Place>, move = false) =>
    onChange({
      ...value,
      ...patch,
      ...(move ? { latitude: null, longitude: null } : {}),
    });
  async function search() {
    if (waiting.current || Date.now() - last.current < 1100) return;
    waiting.current = true;
    last.current = Date.now();
    setBusy(true);
    setError('');
    try {
      setSuggestions(await api<Place[]>('field/search', 'POST', { q }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      waiting.current = false;
      setBusy(false);
    }
  }
  function locate() {
    setError('');
    setNotice('');
    if (!navigator.geolocation) {
      setError('Localização indisponível. Preencha o endereço.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const coords = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        };
        const found = await reverseLookup(coords);
        onChange(mergeLocated(value, coords, found));
        setNotice(locatedNotice(!!found));
        setBusy(false);
      },
      () => {
        setError(
          'Sem permissão ou sinal de localização. Preencha o endereço manualmente.',
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  const preview = composeAddress(value);
  return (
    <fieldset className="place-fields">
      <legend>Endereço</legend>
      {!hideLocation && (
        <>
          <p>
            Está no local? Toque para preencher pelo mapa. Confira antes de
            salvar.
          </p>
          <Button type="button" disabled={busy} onClick={locate} loading={busy}>
            Usar minha localização
          </Button>
        </>
      )}
      <details className="place-search">
        <summary>Buscar pelo nome ou endereço</summary>
        <label>
          Buscar estabelecimento
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSuggestions([]);
            }}
          />
        </label>
        <Button
          type="button"
          disabled={busy || q.trim().length < 3}
          onClick={() => void search()}
          loading={busy}
        >
          Buscar sugestões
        </Button>
        <p className="place-credit">
          Busca gratuita · ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{' '}
          · Photon. Confira o resultado.
        </p>
        {suggestions.map((p, i) => (
          <Button
            type="button"
            key={i}
            onClick={() => {
              onChange({
                ...value,
                ...p,
                complement: value.complement,
                reference: value.reference,
                instagram: value.instagram,
              });
              onName?.(p.name);
              setSuggestions([]);
            }}
          >
            {p.name} · {p.address}
          </Button>
        ))}
      </details>
      <Failure message={error} />
      {notice && <p role="status">{notice}</p>}
      {legacy && (
        <p className="place-legacy">
          <strong>Endereço anterior:</strong> {value.address}
          <br />
          Distribua nos campos abaixo. Enquanto a rua estiver vazia, este texto
          continua sendo usado.
        </p>
      )}
      <label>
        Rua/Avenida
        <input
          autoComplete="address-line1"
          maxLength={200}
          value={value.street ?? ''}
          onChange={(e) => set({ street: e.target.value }, true)}
        />
      </label>
      <div className="place-number">
        <label>
          Número
          <input
            inputMode="numeric"
            maxLength={20}
            disabled={!!value.no_number}
            value={value.no_number ? '' : (value.number ?? '')}
            onChange={(e) => set({ number: e.target.value })}
          />
        </label>
        <label className="place-sn">
          <input
            type="checkbox"
            checked={!!value.no_number}
            onChange={(e) =>
              set({
                no_number: e.target.checked,
                ...(e.target.checked ? { number: '' } : {}),
              })
            }
          />{' '}
          Sem número (S/N)
        </label>
      </div>
      <label>
        Complemento (opcional)
        <input
          maxLength={120}
          placeholder="Apto, bloco, loja"
          value={value.complement ?? ''}
          onChange={(e) => set({ complement: e.target.value })}
        />
      </label>
      <label>
        Bairro
        <input
          maxLength={150}
          value={value.neighborhood}
          onChange={(e) => set({ neighborhood: e.target.value })}
        />
      </label>
      <label>
        Cidade
        <input
          autoComplete="address-level2"
          maxLength={120}
          value={value.city ?? ''}
          onChange={(e) => set({ city: e.target.value }, true)}
        />
      </label>
      <label>
        Ponto de referência (opcional)
        <input
          maxLength={200}
          placeholder="Ex.: em frente à farmácia"
          value={value.reference ?? ''}
          onChange={(e) => set({ reference: e.target.value })}
        />
      </label>
      {preview && (
        <p className="place-preview">
          <strong>Vai aparecer assim:</strong> {preview}
          {value.reference ? ' · Ref.: ' + value.reference : ''}
        </p>
      )}
      <div className="place-located">
        {located ? (
          <>
            <span>📍 Localização guardada</span>
            <Button
              variant="ghost"
              href={`https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver no mapa
            </Button>
            <Button type="button" variant="ghost" onClick={() => set({}, true)}>
              Remover localização
            </Button>
          </>
        ) : (
          <span>Sem localização guardada: o mapa usa o endereço.</span>
        )}
      </div>
      <details className="place-coords">
        <summary>Coordenadas (avançado)</summary>
        <label>
          Latitude
          <input
            inputMode="decimal"
            value={value.latitude ?? ''}
            onChange={(e) =>
              set({
                latitude: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Longitude
          <input
            inputMode="decimal"
            value={value.longitude ?? ''}
            onChange={(e) =>
              set({
                longitude:
                  e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </label>
      </details>
    </fieldset>
  );
}
