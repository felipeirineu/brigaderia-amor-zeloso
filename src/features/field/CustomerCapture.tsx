import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { compressPhoto } from './photo';
/** Captura somente por toque; rascunho descartado ao fechar, envio apenas ao salvar. */
export function CustomerCapture({
  onLocate,
  onPhoto,
  onBusy,
}: {
  onLocate: (p: { latitude: number; longitude: number }) => void;
  onPhoto: (photo: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const active = useRef(true),
    camera = useRef<HTMLInputElement>(null),
    gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [preview, setPreview] = useState('');
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function pending(value: boolean) {
    setBusy(value);
    onBusy(value);
  }
  function locate() {
    if (!navigator.geolocation) {
      setNotice('Localização indisponível. Preencha o endereço.');
      return;
    }
    pending(true);
    setNotice('Buscando localização…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!active.current) return;
        onLocate({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
        });
        setNotice('Localização capturada. Confira o endereço antes de salvar.');
        pending(false);
      },
      () => {
        if (active.current) {
          setNotice('Sem permissão ou sinal. Preencha o endereço manualmente.');
          pending(false);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }
  async function photo(file?: File) {
    if (!file) return;
    pending(true);
    setNotice('Preparando foto…');
    try {
      const base64 = await compressPhoto(file);
      if (active.current) {
        onPhoto(base64);
        setPreview(base64);
        setNotice('Foto pronta. Será enviada ao salvar o cliente.');
      }
    } catch (e) {
      if (active.current) setNotice((e as Error).message);
    } finally {
      if (active.current) pending(false);
    }
  }
  return (
    <fieldset className="customer-capture">
      <legend>Estabelecimento (opcional)</legend>
      <p>Está no estabelecimento? Capture a localização e a fachada.</p>
      <div className="actions">
        <Button type="button" disabled={busy} onClick={locate}>
          Usar minha localização
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => camera.current?.click()}
        >
          Tirar foto
        </Button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => gallery.current?.click()}
        >
          Escolher foto
        </Button>
      </div>
      <input
        hidden
        ref={camera}
        aria-label="Câmera do novo cliente"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void photo(e.target.files?.[0])}
      />
      <input
        hidden
        ref={gallery}
        aria-label="Galeria do novo cliente"
        type="file"
        accept="image/*"
        onChange={(e) => void photo(e.target.files?.[0])}
      />
      {preview && (
        <img
          src={`data:image/webp;base64,${preview}`}
          alt="Prévia da fachada"
          width={80}
          height={80}
        />
      )}
      <p role="status">{notice}</p>
    </fieldset>
  );
}
