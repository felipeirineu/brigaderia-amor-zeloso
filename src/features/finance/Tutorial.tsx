import { DisclosureSummary } from '../../components/DisclosureSummary';
import { Button } from '../../components/Button';
import { useState } from 'react';

import { money } from '../api';
export function FinancialTutorial() {
  const [paid, setPaid] = useState(0);
  return (
    <section className="panel">
      <h2>Treino financeiro · Exemplo</h2>
      <p>
        Pedido fictício de DEMONSTRAÇÃO: R$ 10,00. Botões deste treino mudam
        apenas esta tela, sem gravar no banco.
      </p>
      <p role="status">
        Recebido no exemplo: {money(paid)} · saldo: {money(1000 - paid)}.
      </p>
      <div className="actions">
        <Button onClick={() => setPaid(300)}>
          Exemplo: registrar sinal de R$ 3,00
        </Button>
        <Button onClick={() => setPaid(1000)}>Exemplo: quitar saldo</Button>
        <Button onClick={() => setPaid(0)}>
          Exemplo: estornar recebimento
        </Button>
      </div>
      <details>
        <DisclosureSummary>
          Administrador: preparar condições e fechar o período
        </DisclosureSummary>
        <ol>
          <li>
            Em Clientes, abra Dados do estabelecimento e padrões. Escolha a
            condição; a prazo exige periodicidade e dias para pagar.
          </li>
          <li>
            Confira a cópia da condição no pedido. Uma exceção deve ser salva
            antes da confirmação; reabra com motivo se necessário.
          </li>
          <li>
            Na conta do cliente, confira as entregas. Depois que o período
            terminar, use Fechar período desta entrega e confirme.
          </li>
          <li>
            Confira total, pagamentos, saldo e vencimento. Prepare a cobrança,
            revise e envie pelo WhatsApp.
          </li>
          <li>
            Se desejar Pix, configure chave, recebedor e cidade em Financeiro →
            Configurar Pix. Nunca use uma chave de exemplo na conta real.
          </li>
        </ol>
      </details>
      <details>
        <DisclosureSummary>
          Operador: registrar recebimento na entrega
        </DisclosureSummary>
        <ol>
          <li>
            No Hoje, toque Recebi R$ no cartão e confira o pedido selecionado.
          </li>
          <li>
            Informe o valor realmente recebido, forma e data. Sinal é
            antecipação; entrega e pagamento são independentes.
          </li>
          <li>
            Confirme o registro. Para pagamento parcial, registre só a parcela:
            o saldo é recalculado.
          </li>
          <li>
            Se registrou errado, abra o histórico de recebimentos, escolha
            Estornar e informe o motivo. Depois registre o valor correto.
          </li>
        </ol>
      </details>
      <p>
        Não é integração bancária: receber uma mensagem ou abrir um Pix não
        confirma pagamento. Cobrança é sempre assistida.
      </p>
      <Button to="/gestao/financeiro" variant="ghost">
        Abrir financeiro
      </Button>
    </section>
  );
}
