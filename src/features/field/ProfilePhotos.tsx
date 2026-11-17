import { Camera, ImagePlus } from 'lucide-react';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { useRef, useState } from 'react';
import { Button } from '../../components/Button';
import { useField, StaffAvatar } from './FieldContext';
import { Failure } from '../operations/common';
import { api } from '../api';
import { compressPhoto } from './photo';
export function ProfilePhotos() {
  const ctx = useField(),
    [preview, setPreview] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const camera = useRef<HTMLInputElement>(null),
    gallery = useRef<HTMLInputElement>(null);
  if (!ctx?.data?.profile_photos_ready) return null;
  const data = ctx.data,
    own = data.staff.find((s) => s.id === data.user_id);
  async function choose(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setPreview(await compressPhoto(file, true));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(id: string, version: number, remove = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(
        'field/profile-photos/' + id,
        remove ? 'DELETE' : 'PUT',
        remove ? { version } : { version, base64: preview },
        crypto.randomUUID(),
      );
      setPreview(null);
      await ctx!.refresh();
      setNotice(remove ? 'Foto removida.' : 'Foto atualizada.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" id="foto-perfil">
      <h2>Sua foto de perfil</h2>
      <p>
        Privada, visível somente para a equipe. O recorte central fica quadrado
        e aparece como círculo; confira antes de salvar.
      </p>
      <Failure message={error} />
      <p role="status">{notice}</p>
      {own && (
        <div className="profile-photo-centered">
          <StaffAvatar id={own.id} className="profile-photo-large" />
        </div>
      )}
      <input
        ref={camera}
        className="profile-photo-input"
        type="file"
        accept="image/*"
        capture="user"
        hidden
        aria-label="Tirar foto de perfil"
        disabled={busy}
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={gallery}
        className="profile-photo-input"
        type="file"
        accept="image/*"
        hidden
        aria-label="Escolher foto da galeria"
        disabled={busy}
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="actions action-pair">
        <Button
          variant="tonal"
          icon={<Camera size={18} aria-hidden="true" />}
          disabled={busy}
          onClick={() => camera.current?.click()}
        >
          Tirar foto
        </Button>
        <Button
          variant="tonal"
          icon={<ImagePlus size={18} aria-hidden="true" />}
          disabled={busy}
          onClick={() => gallery.current?.click()}
        >
          Escolher da galeria
        </Button>
      </div>
      {preview && (
        <div className="photo-preview">
          <img
            src={'data:image/webp;base64,' + preview}
            alt="Prévia da sua foto"
            width={128}
            height={128}
          />
          <div className="actions action-pair">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => void save(data.user_id, own?.photo_version ?? 0)}
            >
              Salvar foto de perfil
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              Cancelar foto
            </Button>
          </div>
        </div>
      )}
      {!!own?.has_photo && (
        <Button
          variant="danger"
          disabled={busy}
          onClick={() => void save(own.id, own.photo_version ?? 0, true)}
        >
          Remover minha foto
        </Button>
      )}
      {data.role === 'owner' &&
        data.staff.some((s) => s.id !== data.user_id && s.has_photo) && (
          <details>
            <DisclosureSummary>Fotos da equipe</DisclosureSummary>
            {data.staff
              .filter((s) => s.id !== data.user_id && s.has_photo)
              .map((s) => (
                <div className="staff-identity" key={s.id}>
                  <StaffAvatar id={s.id} />
                  <span>{s.display_name}</span>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => void save(s.id, s.photo_version ?? 0, true)}
                  >
                    Remover foto de {s.display_name}
                  </Button>
                </div>
              ))}
          </details>
        )}
    </section>
  );
}
