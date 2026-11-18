import { useEffect, useState } from 'react';
import { useRemote } from '../operations/common';
import {
  backupIsDue,
  type BackupReminderView,
} from '../../../shared/backup-reminder';
export const backupChanged = () =>
  window.dispatchEvent(new Event('backup-reminder-changed'));
export function useBackupReminder(org: string) {
  const view = useRemote<BackupReminderView>('p1/backup-reminders/' + org);
  const refresh = view.refresh;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => {
      setNow(Date.now());
      void refresh();
    };
    const message = (e: MessageEvent) => {
      if (e.data?.type === 'backup-reminder-changed') update();
    };
    const tick = setInterval(() => setNow(Date.now()), 30000);
    const poll = setInterval(() => void refresh(), 60000);
    window.addEventListener('focus', update);
    window.addEventListener('backup-reminder-changed', update);
    navigator.serviceWorker?.addEventListener('message', message);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener('focus', update);
      window.removeEventListener('backup-reminder-changed', update);
      navigator.serviceWorker?.removeEventListener('message', message);
    };
  }, [refresh]);
  const settings = view.data?.ready ? view.data.settings : undefined;
  return {
    ...view,
    settings,
    now: new Date(now),
    due: !!settings && backupIsDue(settings, new Date(now)),
  };
}
