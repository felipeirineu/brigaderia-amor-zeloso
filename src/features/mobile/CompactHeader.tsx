import { Button } from '../../components/Button';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
        <Button
          to="/gestao"
          aria-label="Início da gestão Amor Zeloso"
          variant="ghost"
        >
          <img src="/brand/logo.webp" alt="" width={32} height={32} />
        </Button>
        <strong
          className="compact-title"
          role={
            operations && role === 'operator' && !segment
              ? 'heading'
              : undefined
          }
          aria-level={
            operations && role === 'operator' && !segment ? 1 : undefined
          }
        >
          {title}
        </strong>
        <span id="mobile-header-actions" />
        <Button
          ref={trigger}
          className="profile-menu-trigger"
          aria-label={'Abrir menu de ' + name}
          onClick={() => menu.current?.showModal()}
        >
          <CircleUserRound size={24} aria-hidden="true" />
          <span>{name}</span>
        </Button>
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
            <Button
              onClick={() => {
                menu.current?.close();
                window.dispatchEvent(new Event('start-tour'));
              }}
            >
              Conhecer o app
            </Button>
          )}
          <Button
            className="button secondary"
            to="/gestao/ajuda"
            onClick={() => menu.current?.close()}
            variant="ghost"
          >
            Ajuda
          </Button>
          <Button
            disabled={!online}
            onClick={() => {
              menu.current?.close();
              onLogout();
            }}
          >
            Sair
          </Button>
          <Button onClick={() => menu.current?.close()}>Fechar menu</Button>
        </div>
      </dialog>
    </>
  );
}
