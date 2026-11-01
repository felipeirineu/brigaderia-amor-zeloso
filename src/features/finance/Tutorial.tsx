import { useState } from 'react';
import { Link } from 'react-router-dom';
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
        <button onClick={() => setPaid(300)}>
          Exemplo: registrar sinal de R$ 3,00
        </button>
        <button onClick={() => setPaid(1000)}>Exemplo: quitar saldo</button>
        <button onClick={() => setPaid(0)}>
          Exemplo: estornar recebimento
        </button>
      </div>
      <details>
        <summary>Administrador: preparar condições e fechar o período</summary>
        <ol>
          <li>
            Em Clientes, abra Dados B2B e padrões. Escolha a condição; a prazo
            exige periodicidade e dias para pagar.
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
        <summary>Operador: registrar recebimento na entrega</summary>
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
      <Link to="/gestao/financeiro">Abrir financeiro</Link>
    </section>
  );
}
