import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { HelpTip } from '../../components/HelpTip';
import { Failure, useRemote } from '../operations/common';
import { api, dateTime } from '../api';
import {
  enablePushDevice,
  disablePushDevice,
  localPushDevice,
  type PushState,
} from './push-device';
export function PushSettings() {
  const view = useRemote<PushState>('p1/push'),
    [current, setCurrent] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (view.data)
      void localPushDevice(view.data)
        .then((d) => {
          if (active) setCurrent(d?.record.id ?? null);
        })
        .catch(() => {
          if (active) setCurrent(null);
        });
    return () => {
      active = false;
    };
  }, [view.data]);
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await view.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const device = view.data?.subscriptions.find((s) => s.id === current);
  return (
    <section className="panel" id="avisos">
      <h2>
        Avisos neste aparelho <HelpTip topic="push" />
      </h2>
      <Failure message={error || view.error} />
      <p role="status">{notice}</p>
      {view.data &&
        (!view.data.configured ? (
          <p>
            Os avisos no celular ainda não estão disponíveis. Você pode
            adicionar lembretes ao calendário do celular.
          </p>
        ) : (
          <>
            <p>
              {device
                ? `Avisos ativos neste aparelho até ${dateTime(new Date(device.valid_until * 1000).toISOString())}.`
                : 'Avisos desativados neste aparelho.'}
            </p>
            <p>
              Sair da conta ou vencer a sessão interrompe os avisos deste
              aparelho. Entre novamente e confira a ativação.
            </p>
            {!current ? (
              <Button
                variant="primary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await enablePushDevice(view.data!);
                    setNotice('Avisos ativados.');
                  })
                }
              >
                Ativar avisos neste aparelho
              </Button>
            ) : (
              <div className="actions">
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      const r = await api<{ state: string }>(
                        `p1/push/subscriptions/${current}/test`,
                        'POST',
                        {},
                        crypto.randomUUID(),
                      );
                      setNotice(
                        r.state === 'sent'
                          ? 'Teste enviado ao serviço. Confira o aviso no aparelho.'
                          : 'Não foi possível confirmar o aviso. Use o calendário e tente novamente depois.',
                      );
                    })
                  }
                >
                  Enviar aviso de teste
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await disablePushDevice(view.data!, current);
                      setCurrent(null);
                      setNotice('Avisos desativados neste aparelho.');
                    })
                  }
                >
                  Desativar neste aparelho
                </Button>
              </div>
            )}
            {view.data.subscriptions
              .filter((s) => s.id !== current)
              .map((s) => (
                <p key={s.id}>
                  Outro aparelho ativado em {dateTime(s.created_at)}{' '}
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void act(() => disablePushDevice(view.data!, s.id))
                    }
                  >
                    Desativar aparelho de {dateTime(s.created_at)}
                  </Button>
                </p>
              ))}
          </>
        ))}
    </section>
  );
}
