import { Button } from '../../components/Button';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../api';
import { Failure } from '../operations/common';
import { composeAddress, type Place } from '../../../shared/field';
import { locatedNotice, mergeLocated, reverseLookup } from './locate';

// Relógio só usado em eventos e temporizadores (nunca durante a renderização).
const clock = () => Date.now();

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
    [searching, setSearching] = useState(false),
    listId = useId(),
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
  // Sugestões enquanto digita: espera uma pausa curta, respeita o limite de
  // uma consulta por segundo do serviço gratuito e ignora respostas antigas.
  const serial = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      serial.current++;
    },
    [],
  );
  function schedule(text: string, delay = 700) {
    if (timer.current) clearTimeout(timer.current);
    const mine = ++serial.current;
    if (text.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const gap = Math.max(delay, 1100 - (clock() - last.current));
    timer.current = setTimeout(() => void search(text, mine), gap);
  }
  async function search(text: string, mine: number) {
    if (waiting.current) return schedule(text, 400);
    waiting.current = true;
    last.current = clock();
    setError('');
    try {
      const found = await api<Place[]>('field/search', 'POST', { q: text });
      if (mine === serial.current) {
        setSuggestions(found);
        setSearching(false);
      }
    } catch (e) {
      if (mine !== serial.current) return;
      // Limite momentâneo do serviço: tenta de novo sozinho, sem erro na tela.
      if ((e as { status?: number }).status === 429)
        timer.current = setTimeout(() => void search(text, mine), 1200);
      else {
        setError((e as Error).message);
        setSearching(false);
      }
    } finally {
      waiting.current = false;
    }
  }
  function choose(p: Place) {
    if (timer.current) clearTimeout(timer.current);
    serial.current++;
    onChange({
      ...value,
      ...p,
      no_number: false,
      complement: value.complement,
      reference: value.reference,
      instagram: value.instagram,
    });
    onName?.(p.name);
    setSuggestions([]);
    setSearching(false);
    setQ('');
    setNotice(
      'Endereço preenchido pela sugestão. Confira a rua e o número antes de salvar.',
    );
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
        const { found, status } = await reverseLookup(coords);
        onChange(mergeLocated(value, coords, found));
        setNotice(locatedNotice(status));
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
      <div className="place-search">
        <label>
          Buscar endereço ou estabelecimento
          <input
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Ex.: Shopping, Rua das Flores 120"
            aria-controls={listId}
            aria-autocomplete="list"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              schedule(e.target.value);
            }}
          />
        </label>
        {(searching ||
          (q.trim().length >= 3 && !suggestions.length && !error)) && (
          <p className="place-credit" role="status">
            {searching
              ? 'Procurando…'
              : 'Nenhuma sugestão. Preencha os campos abaixo.'}
          </p>
        )}
        {suggestions.length > 0 && (
          <ul
            id={listId}
            className="place-suggestions"
            aria-label="Sugestões de endereço"
          >
            {suggestions.map((p, i) => (
              <li key={i}>
                <Button type="button" variant="ghost" onClick={() => choose(p)}>
                  <span className="place-suggestion-name">
                    {p.name || p.street || p.address}
                  </span>
                  <span className="place-suggestion-address">{p.address}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="place-credit">
          Sugestões gratuitas · ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap
          </a>{' '}
          · Photon. Confira o resultado.
        </p>
      </div>
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
        CEP (opcional)
        <input
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          maxLength={9}
          value={value.postcode ?? ''}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, '').slice(0, 8);
            set({
              postcode: d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d,
            });
          }}
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
