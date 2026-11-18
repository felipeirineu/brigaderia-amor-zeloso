import { Button } from '../../components/Button';
import { HelpTip } from '../../components/HelpTip';
import { DisclosureSummary } from '../../components/DisclosureSummary';
import { useEffect, useRef, useState } from 'react';
import { Folder } from 'lucide-react';
import { privateDownload, privateFile, downloadBlob } from '../PrivateDownload';
import { api } from '../api';
import { Failure } from '../operations/common';
import {
  backupPeriods,
  backupNextLabel,
  type BackupReminder,
} from '../../../shared/backup-reminder';
import { fortalezaDay } from '../../../shared/workday';
import { backupChanged, useBackupReminder } from './useBackupReminder';
import {
  hasBackupPicker,
  pickBackupFolder,
  readBackupFolder,
  rememberBackupFolder,
  writeBackupFile,
  backupFileError,
  type BackupDirectory,
} from './backup-folder';
function ReminderForm({
  settings,
  onSaved,
}: {
  settings: BackupReminder;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    period: settings.period,
    weekday: settings.weekday,
    time: settings.time,
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const request = useRef({ body: '', key: '' }),
    pending = useRef(false);
  return (
    <form
      className="backup-settings"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
          const body = { ...form, version: settings.version },
            signature = JSON.stringify(body);
          if (request.current.body !== signature)
            request.current = { body: signature, key: crypto.randomUUID() };
          await api(
            'p1/backup-reminders/' + settings.id,
            'PUT',
            body,
            request.current.key,
          );
          await onSaved();
          backupChanged();
        } catch (e) {
          setError(backupFileError(e));
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    >
      <h2>Lembrar de fazer backup</h2>
      <div className="chips" role="group" aria-label="Frequência do backup">
        {Object.entries(backupPeriods).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="chip"
            aria-pressed={form.period === value}
            disabled={busy}
            onClick={() =>
              setForm({ ...form, period: value as BackupReminder['period'] })
            }
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="backup-schedule-fields">
        <label>
          Dia da semana
          <select
            disabled={busy || form.period === 'off'}
            value={form.weekday}
            onChange={(e) =>
              setForm({ ...form, weekday: Number(e.target.value) })
            }
          >
            {[
              'Segunda-feira',
              'Terça-feira',
              'Quarta-feira',
              'Quinta-feira',
              'Sexta-feira',
              'Sábado',
              'Domingo',
            ].map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Horário local
          <input
            type="time"
            required
            disabled={busy || form.period === 'off'}
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </label>
      </div>
      <p>
        O lembrete aparece no Hoje e no celular (se os avisos estiverem
        ligados), no dia e horário escolhidos. Depois de completar o período,
        aparece na próxima ocorrência desse dia e horário.
      </p>
      <Button disabled={busy} loading={busy}>
        Salvar lembrete
      </Button>
      <Failure message={error} />
    </form>
  );
}
interface PendingBackup {
  receipt: string;
  name: string;
  destination: string;
  saved: boolean;
  key: string;
}
export function Backup({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}) {
  const view = useBackupReminder(organizationId),
    ready = !!view.settings;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [supported] = useState(hasBackupPicker),
    [directory, setDirectory] = useState<BackupDirectory | null>(null),
    [permission, setPermission] = useState<PermissionState>('prompt'),
    [folderNotice, setFolderNotice] = useState(''),
    [folderLoaded, setFolderLoaded] = useState(false);
  const [pending, setPending] = useState<PendingBackup | null>(null),
    pendingAction = useRef(false);
  const [settingsNotice, setSettingsNotice] = useState('');
  const scope = organizationId + ':' + userId;
  useEffect(() => {
    if (!supported || !ready) return;
    let current = true;
    readBackupFolder(scope)
      .then(async (handle) => {
        const state = handle
          ? await handle.queryPermission({ mode: 'readwrite' })
          : 'prompt';
        if (current) {
          setDirectory(handle);
          setPermission(state);
        }
      })
      .catch(() => {
        if (current)
          setFolderNotice('Escolha a pasta para lembrar este computador.');
      })
      .finally(() => {
        if (current) setFolderLoaded(true);
      });
    return () => {
      current = false;
    };
  }, [scope, supported, ready]);
  async function chooseFolder() {
    setFolderNotice('');
    try {
      const handle = await pickBackupFolder();
      setDirectory(handle);
      setPermission(await handle.queryPermission({ mode: 'readwrite' }));
      await rememberBackupFolder(scope, handle);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError')
        setFolderNotice(backupFileError(e));
    }
  }
  async function complete(saved: PendingBackup) {
    await api(
      'p1/backup-exports/' + saved.receipt + '/complete',
      'POST',
      {},
      saved.key,
    );
    setPending(null);
    backupChanged();
    const prefix = `✓ ${saved.name} salvo em ${saved.destination}.`;
    try {
      const data = await api<{ ready: boolean; settings: BackupReminder }>(
        'p1/backup-reminders/' + organizationId,
      );
      setNotice(prefix + ' ' + backupNextLabel(data.settings));
    } catch {
      setNotice(
        prefix +
          ' Lembrete atualizado. Reconecte para conferir a próxima data.',
      );
    }
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const notifications = await reg?.getNotifications({
        tag: 'az-backup-' + organizationId,
      });
      notifications?.forEach((n) => n.close());
    } catch {
      /* O sistema pode já ter fechado o aviso. */
    }
  }

  async function download() {
    if (pendingAction.current) return;
    pendingAction.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setPending(null);
    try {
      if (!ready) {
        await privateDownload(
          'p1/backup',
          'backup-gestao-' + fortalezaDay() + '.sql',
        );
        setNotice(
          'Download solicitado. Confira se o arquivo foi salvo na pasta de downloads.',
        );
        return;
      }
      if (directory) {
        const state = await directory.queryPermission({ mode: 'readwrite' });
        setPermission(state);
        if (state !== 'granted')
          throw Error(
            'Permita o acesso à pasta antes de salvar. Seus arquivos não foram alterados.',
          );
      }
      const { response, blob } = await privateFile('p1/backup');
      const name =
        'backup-gestao-' +
        fortalezaDay() +
        '-' +
        crypto.randomUUID().slice(0, 8) +
        '.sql';
      const receipt = response.headers.get('X-Backup-Receipt');
      if (!receipt)
        throw Error(
          'O lembrete não está pronto. Atualize a página e tente novamente.',
        );
      const saved = {
        receipt,
        name,
        destination: directory
          ? '"' + directory.name + '"'
          : 'Downloads (conforme sua confirmação)',
        saved: !!directory,
        key: crypto.randomUUID(),
      };
      if (directory) {
        await writeBackupFile(directory, name, blob);
        setPending(saved);
        setNotice(`✓ ${name} salvo em "${directory.name}".`);
        await complete(saved);
      } else {
        downloadBlob(blob, name);
        setPending(saved);
        setNotice(
          'Download solicitado. Confira se o arquivo foi salvo em Downloads ou na pasta escolhida no navegador. Depois confirme abaixo.',
        );
      }
    } catch (e) {
      setError(backupFileError(e));
    } finally {
      pendingAction.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel backup-page">
      <h1 className="mobile-context-title">Backup da organização</h1>
      {view.settings && (
        <ReminderForm
          key={view.settings.version}
          settings={view.settings}
          onSaved={async () => {
            await view.refresh();
            setSettingsNotice('Lembrete atualizado.');
          }}
        />
      )}
      {settingsNotice && <p role="status">{settingsNotice}</p>}
      {ready && (
        <section className="backup-folder-section">
          <h2>Pasta dos backups neste computador</h2>
          {supported && folderLoaded && (
            <div className="backup-folder-choice">
              <Folder aria-hidden="true" size={28} />
              <div>
                <strong>{directory?.name ?? 'Escolher uma pasta'}</strong>
                <p>
                  {directory
                    ? 'Os próximos backups são salvos aqui direto.'
                    : 'Escolha onde guardar os backups neste computador.'}
                </p>
              </div>
              <Button onClick={() => void chooseFolder()} disabled={busy}>
                {directory ? 'Trocar pasta' : 'Escolher pasta'}
              </Button>
              {directory && (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await rememberBackupFolder(scope, null);
                      setDirectory(null);
                    } catch (e) {
                      setFolderNotice(backupFileError(e));
                    }
                  }}
                >
                  Usar Downloads
                </Button>
              )}
            </div>
          )}
          {directory && permission !== 'granted' && (
            <div className="backup-permission">
              <p>
                O navegador pediu acesso à pasta novamente. Permita o acesso
                para salvar os próximos backups; os arquivos existentes são
                preservados.
              </p>
              <Button
                disabled={busy}
                onClick={async () => {
                  try {
                    const state = await directory.requestPermission({
                      mode: 'readwrite',
                    });
                    setPermission(state);
                    if (state !== 'granted')
                      setFolderNotice(
                        'Acesso não permitido. Escolha outra pasta ou use Downloads.',
                      );
                  } catch {
                    setFolderNotice(
                      'Não foi possível permitir o acesso. Escolha outra pasta ou use Downloads.',
                    );
                  }
                }}
              >
                Permitir acesso à pasta
              </Button>
            </div>
          )}
          {folderNotice && <p role="status">{folderNotice}</p>}
          <p>
            No celular, o arquivo vai para Downloads, como hoje. A pasta fixa
            funciona no Chrome e no Edge do computador; nos outros, o arquivo
            vai para Downloads.
          </p>
          <div className="backup-retention">
            <p>
              Guarde pelo menos os <strong>8 backups mais recentes</strong>{' '}
              (cerca de 2 meses). Pode apagar os mais antigos. Os arquivos são
              pequenos; se quiser, guarde mais.
            </p>
            <HelpTip topic="backupRetention" />
          </div>
        </section>
      )}
      <Button
        variant="primary"
        className="primary-action backup-now"
        disabled={busy}
        loading={busy}
        onClick={() => void download()}
      >
        Fazer backup agora
      </Button>
      <Failure message={error} />
      <p
        role="status"
        className={notice.startsWith('✓') ? 'backup-success' : ''}
      >
        {notice}
      </p>
      {pending && (
        <Button
          disabled={busy}
          onClick={async () => {
            if (pendingAction.current) return;
            pendingAction.current = true;
            setBusy(true);
            setError('');
            try {
              await complete(pending);
            } catch (e) {
              setError(backupFileError(e));
            } finally {
              pendingAction.current = false;
              setBusy(false);
            }
          }}
        >
          {pending.saved ? 'Atualizar lembrete' : 'Já salvei o arquivo'}
        </Button>
      )}
      <details>
        <DisclosureSummary>
          O que há no arquivo e como conferir
        </DisclosureSummary>
        <p>
          O SQL inclui cadastros, pedidos, eventos, fotos, autorizações de
          acesso e chave Pix cadastrada. Sessões, tokens de login e caches são
          excluídos. Guarde em uma pasta privada, fora do Git, chat ou links
          públicos.
        </p>
        <p>
          Limite desta exportação: 10 mil linhas e 4 MB de dados. Se exceder,
          use o backup administrativo do D1 com o guia de restauração.
        </p>
        <ol>
          <li>Confira o arquivo na pasta escolhida.</li>
          <li>
            No computador, siga o guia de restauração em uma base local
            separada, sem substituir o banco em uso.
          </li>
          <li>
            Compare as contagens e confira amostras privadas antes de depender
            do arquivo.
          </li>
        </ol>
        <p>
          A exportação e a confirmação são registradas no histórico de
          auditoria. Nenhum arquivo é enviado para outro serviço.
        </p>
      </details>
    </section>
  );
}
