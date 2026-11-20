import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Heart, Lightbulb, MessageCircle, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/Button';
import { ChoiceChips } from '../../components/ChoiceChips';
import { Mascot } from '../../components/Mascot';
import { WhatsAppLink } from '../../components/TestEnvironment';
import {
  errorCode,
  feedbackLabels,
  feedbackPages,
  type FeedbackContext,
  type FeedbackKind,
} from '../../../shared/feedback';
import { api } from '../api';
import { Failure, useRemote } from '../operations/common';
import { relativeDateTime } from '../../../shared/workday';

type Message = {
  id: string;
  kind: FeedbackKind;
  message: string;
  version: number;
  context: FeedbackContext | null;
  read_at: string | null;
  created_at: string;
};
type InboxMessage = Message & { author: string; reply_url?: string | null };
type List<T> = { messages: T[]; next: number | null };
const limit = 2000;
const pageSize = 30;
const options = Object.entries(feedbackLabels) as [FeedbackKind, string][];
const icons = { suggestion: Lightbulb, problem: TriangleAlert, praise: Heart };

function details(context: FeedbackContext) {
  return [
    'versão ' + context.version,
    context.system,
    'tela ' + feedbackPages[context.page],
    context.error_code && 'código ' + context.error_code,
  ]
    .filter(Boolean)
    .join(' · ');
}

function device(): FeedbackContext['system'] {
  if (/Android/i.test(navigator.userAgent)) return 'Android';
  if (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
    return 'iPhone';
  return 'Computador';
}

function Pager({
  offset,
  next,
  onChange,
}: {
  offset: number;
  next: number | null;
  onChange: (page: number) => void;
}) {
  return (
    (offset > 0 || next !== null) && (
      <nav className="actions" aria-label="Páginas de mensagens">
        <Button
          disabled={!offset}
          onClick={() => onChange(Math.max(0, offset - pageSize))}
        >
          Anteriores
        </Button>
        <Button
          disabled={next === null}
          onClick={() => next !== null && onChange(next)}
        >
          Mais mensagens
        </Button>
      </nav>
    )
  );
}

function MessageCard({
  row,
  children,
}: {
  row: Message | InboxMessage;
  children?: React.ReactNode;
}) {
  const inbox = 'author' in row;
  return (
    <article className="panel feedback-message">
      <p className="feedback-message-meta">
        <span className={'feedback-kind feedback-kind--' + row.kind}>
          {feedbackLabels[row.kind]}
        </span>
        {inbox ? (
          !row.read_at && (
            <span className="feedback-kind feedback-kind--new">nova</span>
          )
        ) : (
          <time dateTime={row.created_at}>
            {relativeDateTime(row.created_at)}
          </time>
        )}
      </p>
      {inbox && (
        <p>
          <strong>{row.author}</strong> ·{' '}
          <time dateTime={row.created_at}>
            {relativeDateTime(row.created_at)}
          </time>
        </p>
      )}
      <p className="feedback-message-text">{row.message}</p>
      {row.context && inbox && <p className="muted">{details(row.context)}</p>}
      {row.read_at && <p className="muted">✓ Lida</p>}
      {children}
    </article>
  );
}

export function FeedbackForm() {
  const { state } = useLocation();
  const initialCode =
    typeof state?.errorCode === 'string' && errorCode.test(state.errorCode)
      ? (state.errorCode as string)
      : undefined;
  const page =
    typeof state?.page === 'string' && Object.hasOwn(feedbackPages, state.page)
      ? (state.page as FeedbackContext['page'])
      : 'sugestoes';
  const [code, setCode] = useState(initialCode);
  const [kind, setKind] = useState<FeedbackKind>(
    code ? 'problem' : 'suggestion',
  );
  const [message, setMessage] = useState('');
  const [include, setInclude] = useState(true);
  const [saved, setSaved] = useState<{ whatsapp_url: string | null } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offset, setOffset] = useState(0);
  const history = useRemote<List<Message>>('feedback?offset=' + offset);
  const { refresh } = history;
  useEffect(() => {
    const reload = () => void refresh();
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, [refresh]);
  const submitting = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const context: FeedbackContext = {
    version: __APP_VERSION__,
    system: device(),
    page,
    ...(code ? { error_code: code } : {}),
  };

  async function submit() {
    if (submitting.current || !message.trim()) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    const payload = {
      kind,
      message: message.trim(),
      ...(include ? { context } : {}),
    };
    const signature = JSON.stringify(payload);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, key: crypto.randomUUID() };
    try {
      setSaved(
        await api<{ whatsapp_url: string | null }>(
          'feedback',
          'POST',
          payload,
          attempt.current.key,
        ),
      );
      setMessage('');
      setCode(undefined);
      setKind('suggestion');
      attempt.current = null;
      if (offset === 0) void history.refresh();
      else setOffset(0);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  if (saved)
    return (
      <section
        className="feedback-result"
        aria-labelledby="feedback-saved-title"
      >
        <Mascot size={150} />
        <h1 id="feedback-saved-title">Obrigado!</h1>
        <p>Sua mensagem foi enviada. Você vê aqui quando ela for lida.</p>
        {saved.whatsapp_url && (
          <>
            <WhatsAppLink
              href={saved.whatsapp_url}
              className="feedback-whatsapp"
            >
              <MessageCircle size={18} aria-hidden="true" /> Mandar também no
              WhatsApp
            </WhatsAppLink>
            <p className="muted">
              Use se for urgente. Abre o WhatsApp com o texto pronto; você
              confere e envia.
            </p>
          </>
        )}
        <Button onClick={() => setSaved(null)}>Voltar</Button>
      </section>
    );

  return (
    <div className="feedback-page">
      <h1 className="mobile-context-title">Sugestões e problemas</h1>
      <p className="muted">
        Sua mensagem chega para quem cuida do app. Pode ser ideia, problema ou
        elogio.
      </p>
      <form
        className="feedback-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="chips" role="group" aria-label="Tipo da mensagem">
          {options.map(([value, label]) => {
            const Icon = icons[value];
            return (
              <Button
                key={value}
                type="button"
                variant="chip"
                aria-pressed={kind === value}
                icon={<Icon size={17} />}
                onClick={() => setKind(value)}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <label className="feedback-text">
          Mensagem
          <textarea
            required
            maxLength={limit}
            rows={5}
            value={message}
            placeholder="Escreva sua mensagem"
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <label className="feedback-consent">
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => setInclude(e.target.checked)}
          />
          <span>
            Incluir informações do aparelho para ajudar a entender
            {include && <small className="muted">{details(context)}</small>}
          </span>
        </label>
        <Failure message={error} />
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          disabled={!message.trim()}
        >
          Enviar
        </Button>
      </form>
      <h2>Suas mensagens</h2>
      <Failure message={history.error} />
      {history.data?.messages.length === 0 && (
        <p className="muted">Nenhuma mensagem enviada.</p>
      )}
      {history.data?.messages.map((row) => (
        <MessageCard row={row} key={row.id} />
      ))}
      {history.data && (
        <Pager offset={offset} next={history.data.next} onChange={setOffset} />
      )}
    </div>
  );
}
export function FeedbackInbox() {
  const [filter, setFilter] = useState('unread');
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const list = useRemote<List<InboxMessage> & { unread: number }>(
    `feedback/inbox?filter=${filter}&offset=${offset}`,
  );
  async function mark(row: InboxMessage) {
    setBusy(row.id);
    setError('');
    try {
      await api(
        `feedback/${row.id}/read`,
        'POST',
        { version: row.version },
        crypto.randomUUID(),
      );
      if (offset && list.data?.messages.length === 1 && filter === 'unread')
        setOffset(offset - pageSize);
      else await list.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="feedback-page">
      <h1 className="mobile-context-title">Recebidas</h1>
      <ChoiceChips
        label="Filtrar mensagens"
        value={filter}
        onChange={(value) => {
          setFilter(value);
          setOffset(0);
        }}
        options={[
          [
            'unread',
            list.data ? `Não lidas (${list.data.unread})` : 'Não lidas',
          ],
          ['all', 'Todas'],
        ]}
      />
      <Failure message={error || list.error} />
      {list.data?.messages.length === 0 && (
        <p className="muted">
          Nenhuma mensagem {filter === 'unread' ? 'por ler' : 'recebida'}.
        </p>
      )}
      {list.data?.messages.map((row) => (
        <MessageCard key={row.id} row={row}>
          <div className="feedback-inbox-actions">
            {!row.read_at && (
              <Button
                loading={busy === row.id}
                disabled={!!busy}
                onClick={() => void mark(row)}
              >
                Marcar como lida
              </Button>
            )}
            {row.reply_url && (
              <WhatsAppLink href={row.reply_url} className="feedback-whatsapp">
                Responder no WhatsApp
              </WhatsAppLink>
            )}
          </div>
        </MessageCard>
      ))}
      {list.data && (
        <Pager offset={offset} next={list.data.next} onChange={setOffset} />
      )}
    </div>
  );
}

export function FeedbackCount() {
  const { data } = useRemote<{ unread: number }>('feedback/inbox?count=1');
  return data && data.unread > 0 ? (
    <span className="feedback-count" aria-label={`${data.unread} não lidas`}>
      {data.unread}
    </span>
  ) : null;
}
