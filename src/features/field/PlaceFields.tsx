import { Button } from '../../components/Button';
import { useRef, useState } from 'react';
import { api } from '../api';
import { Failure } from '../operations/common';
import type { Place } from '../../../shared/field';
export function PlaceFields({
  value,
  onChange,
  onName,
}: {
  value: Place;
  onChange: (p: Place) => void;
  onName?: (name: string) => void;
}) {
  const [q, setQ] = useState(''),
    [suggestions, setSuggestions] = useState<Place[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    waiting = useRef(false),
    last = useRef(0);
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
    if (!navigator.geolocation) {
      setError('Localização indisponível. Preencha o endereço.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onChange({
          ...value,
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
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
  return (
    <fieldset>
      <legend>Localização do estabelecimento</legend>
      <p>
        A localização será do estabelecimento. Use o botão somente quando
        estiver nele; confira antes de salvar.
      </p>
      <Button type="button" disabled={busy} onClick={locate} loading={busy}>
        Usar minha localização
      </Button>
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
      <p>
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
            onChange({ ...p, instagram: value.instagram });
            onName?.(p.name);
            setSuggestions([]);
          }}
        >
          {p.name} · {p.address}
        </Button>
      ))}
      <Failure message={error} />
      <label>
        Endereço do estabelecimento
        <textarea
          value={value.address}
          onChange={(e) =>
            onChange({
              ...value,
              address: e.target.value,
              latitude: null,
              longitude: null,
            })
          }
        />
      </label>
      <label>
        Bairro
        <input
          value={value.neighborhood}
          onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
        />
      </label>
      <label>
        Latitude
        <input
          inputMode="decimal"
          value={value.latitude ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
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
            onChange({
              ...value,
              longitude: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </label>
      <p>
        Se editar o endereço, as coordenadas são limpas para evitar um destino
        incorreto.
      </p>
    </fieldset>
  );
}
