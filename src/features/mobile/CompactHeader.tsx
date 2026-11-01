import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CircleUserRound } from 'lucide-react';
import { useField } from '../field/FieldContext';
const titles: Record<string, string> = {
  '': 'Hoje',
  pedidos: 'Pedidos',
  clientes: 'Clientes',
  produtos: 'Produtos',
  mais: 'Mais',
  financeiro: 'Financeiro',
  agenda: 'Agenda',
  ajuda: 'Ajuda',
  preferencias: 'Preferências',
  recorrentes: 'Pedidos padrão',
  deslocamentos: 'Deslocamentos',
  estoque: 'Estoque',
  relatorios: 'Relatórios',
  lembretes: 'Lembretes',
  fichas: 'Fichas técnicas',
  insumos: 'Insumos',
  compras: 'Compras',
  backup: 'Backup',
  empresa: 'Empresa',
  acessos: 'Acessos',
  mensagens: 'Mensagens',
  'importar-clientes': 'Importar clientes',
};
export function CompactHeader({
  role,
  online,
  operations,
  onLogout,
}: {
  role: string;
  online: boolean;
  operations: boolean;
  onLogout: () => void;
}) {
  const menu = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    field = useField(),
    location = useLocation(),
    segment = location.pathname.split('/')[2] ?? '',
    title =
      segment === 'pedidos' && location.search.includes('novo')
        ? 'Novo pedido'
        : (titles[segment] ?? 'Gestão'),
    name =
      field?.data?.staff.find((s) => s.id === field.data!.user_id)
        ?.display_name || (role === 'owner' ? 'Administrador' : 'Operador');
  return (
    <>
      <header className="compact-header" aria-label="Cabeçalho da gestão">
        <Link to="/gestao" aria-label="Início da gestão Amor Zeloso">
          <img src="/brand/logo.webp" alt="" width={32} height={32} />
        </Link>
        <strong className="compact-title">{title}</strong>
        <span id="order-focus-back" />
        <button
          ref={trigger}
          className="profile-menu-trigger"
          aria-label={'Abrir menu de ' + name}
          onClick={() => menu.current?.showModal()}
        >
          <CircleUserRound size={24} aria-hidden="true" />
          <span>{name}</span>
        </button>
      </header>
      <dialog
        ref={menu}
        className="help-sheet profile-menu"
        aria-label="Menu da gestão"
        onClose={() => trigger.current?.focus()}
      >
        <div className="sheet-body">
          <h2>{name}</h2>
          {operations && online && (
            <button
              onClick={() => {
                menu.current?.close();
                window.dispatchEvent(new Event('start-tour'));
              }}
            >
              Conhecer o app
            </button>
          )}
          <Link
            className="button secondary"
            to="/gestao/ajuda"
            onClick={() => menu.current?.close()}
          >
            Ajuda
          </Link>
          <button
            disabled={!online}
            onClick={() => {
              menu.current?.close();
              onLogout();
            }}
          >
            Sair
          </button>
          <button onClick={() => menu.current?.close()}>Fechar menu</button>
        </div>
      </dialog>
    </>
  );
}
