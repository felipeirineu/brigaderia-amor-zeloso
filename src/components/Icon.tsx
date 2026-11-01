import {
  Boxes,
  CalendarDays,
  ChefHat,
  CircleHelp,
  ClipboardList,
  House,
  Settings,
  Truck,
  Users,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Plus,
  MoreHorizontal,
  Repeat2,
} from 'lucide-react';
const icons = {
  clientes: Users,
  produtos: Boxes,
  pedidos: ClipboardList,
  producao: ChefHat,
  entregas: Truck,
  financeiro: Wallet,
  configuracoes: Settings,
  inicio: House,
  ajuda: CircleHelp,
  agenda: CalendarDays,
  seta: ArrowRight,
  externo: ArrowUpRight,
  brilho: Sparkles,
  novo: Plus,
  mais: MoreHorizontal,
  recorrentes: Repeat2,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 22,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      strokeWidth={1.7}
      aria-hidden="true"
      focusable="false"
    />
  );
}
