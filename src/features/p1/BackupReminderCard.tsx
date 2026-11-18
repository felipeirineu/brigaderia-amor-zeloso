import { useRef, useState } from 'react';
import { FolderArchive } from 'lucide-react';
import { Button } from '../../components/Button';
import { api } from '../api';
import { Failure } from '../operations/common';
import { backupLastLabel } from '../../../shared/backup-reminder';
import { backupChanged, useBackupReminder } from './useBackupReminder';
export function BackupReminderCard({
  organizationId,
}: {
  organizationId: string;
}) {
  const view = useBackupReminder(organizationId),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    pending = useRef(false),
    request = useRef({ body: '', key: '' });
  const s = view.settings;
  if (!s || !view.due || view.error) return null;
  async function snooze() {
    if (!s || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const body = { version: s.version, alert_key: s.alert_key },
        signature = JSON.stringify(body);
      if (request.current.body !== signature)
        request.current = { body: signature, key: crypto.randomUUID() };
      await api(
        'p1/backup-reminders/' + s.id + '/snooze',
        'POST',
        body,
        request.current.key,
      );
      await view.refresh();
      backupChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <aside className="backup-reminder-card" aria-label="Lembrete de backup">
      <h2>
        <FolderArchive aria-hidden="true" size={24} />
        Está na hora de fazer o backup!
      </h2>
      <p>{backupLastLabel(s, view.now)}</p>
      <Failure message={error} />
      <div className="actions action-pair">
        <Button to="/gestao/backup" variant="primary">
          Fazer backup
        </Button>
        <Button onClick={() => void snooze()} disabled={busy} loading={busy}>
          Lembrar mais tarde
        </Button>
      </div>
    </aside>
  );
}
