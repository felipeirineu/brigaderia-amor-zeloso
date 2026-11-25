import { exchangeLabel, type ExchangeOrder } from '../../shared/order-exchange';
import { money } from '../features/api';
import { Button } from './Button';
import { HelpTip } from './HelpTip';

export function ExchangeEditor({
  quantity,
  limit,
  onChange,
}: {
  quantity: number;
  limit: number;
  onChange: (units: number) => void;
}) {
  return (
    <section
      className="panel order-exchange-editor"
      aria-label="Troca de doces"
    >
      <div className="exchange-control">
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={quantity > 0}
            disabled={!limit}
            onChange={(event) => onChange(event.target.checked ? 1 : 0)}
          />
          Teve troca de doces?
        </label>
        <HelpTip topic="orderExchange" />
      </div>
      {quantity > 0 ? (
        <>
          <div className="exchange-control">
            <div>
              Doces recolhidos<small>vencendo no cliente</small>
            </div>
            <div className="exchange-stepper">
              <Button
                type="button"
                aria-label="Diminuir doces recolhidos"
                disabled={quantity <= 1}
                onClick={() => onChange(quantity - 1)}
              >
                −
              </Button>
              <output aria-label="Doces recolhidos">{quantity}</output>
              <Button
                type="button"
                aria-label="Aumentar doces recolhidos"
                disabled={quantity >= limit}
                onClick={() => onChange(quantity + 1)}
              >
                +
              </Button>
            </div>
          </div>
          <p className="exchange-note">
            Os doces novos que repõem os recolhidos ficam sem cobrança. Os
            recolhidos entram em Perdas por troca.
          </p>
        </>
      ) : !limit ? (
        <p>Trocas são para doces avulsos. Kits ficam fora da troca.</p>
      ) : null}
    </section>
  );
}

export function ExchangeSummary({
  delivered,
  collected,
  discount,
  total,
}: {
  delivered: number;
  collected: number;
  discount: number;
  total: number;
}) {
  if (!collected) return null;
  return (
    <dl className="panel exchange-summary" aria-label="Resumo da troca">
      <div>
        <dt>Entregues</dt>
        <dd>{delivered} doces</dd>
      </div>
      <div>
        <dt>Troca (sem cobrar)</dt>
        <dd>
          −{collected} doces · −{money(discount)}
        </dd>
      </div>
      <div>
        <dt>Cobrar</dt>
        <dd>
          {delivered - collected} doces · {money(total)}
        </dd>
      </div>
    </dl>
  );
}

export function ExchangeBadge({ order }: { order: ExchangeOrder }) {
  const label = exchangeLabel(order);
  return label ? <p className="exchange-badge">{label}</p> : null;
}
