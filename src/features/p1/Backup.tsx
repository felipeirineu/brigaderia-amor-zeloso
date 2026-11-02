import { Button } from '../../components/Button';
import { useState } from 'react';
import { privateDownload } from '../PrivateDownload';
import { Failure } from '../operations/common';
export function Backup() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  return (
    <section className="panel">
      <h1 className="mobile-context-title">Backup da organização</h1>
      <p>
        Baixa SQL completo da organização com cadastros, pedidos, eventos,
        fotos, autorizações de acesso e chave Pix cadastrada. Sessões, tokens de
        login e caches são excluídos. O arquivo é privado: guarde em uma pasta
        protegida fora do Git, chat ou links públicos.
      </p>
      <p>
        Limite desta exportação: 10 mil linhas e 4 MB de dados. Se exceder, use
        o backup administrativo do D1 com o guia de restauração. Não há
        restauração sobre o banco em uso pelo aplicativo.
      </p>
      <Failure message={error} />
      <p role="status">{notice}</p>
      <Button
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setError('');
          void privateDownload(
            'p1/backup',
            'backup-gestao-' + new Date().toISOString().slice(0, 10) + '.sql',
          )
            .then(() =>
              setNotice(
                'Download solicitado. Confira o arquivo e ensaie a restauração em uma base local separada antes de depender dele.',
              ),
            )
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
        loading={busy}
      >
        Baixar backup privado
      </Button>
      <ol>
        <li>Confira se o arquivo foi salvo na pasta de downloads.</li>
        <li>
          No computador, siga o guia de restauração local com o comando npm run
          ops:restore-check. O ensaio precisa concluir sem erros de chave
          estrangeira.
        </li>
        <li>
          Compare as contagens e confira amostras privadas. Somente depois
          mantenha o backup como validado.
        </li>
      </ol>
      <p>
        A base da organização é preservada; a exportação apenas registra a
        solicitação no histórico de auditoria.
      </p>
    </section>
  );
}
