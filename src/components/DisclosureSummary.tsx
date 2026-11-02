import { ChevronDown } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
/** Mantém teclado/semântica do details sem depender do marcador emoji do Safari. */
export function DisclosureSummary({
  children,
  className = '',
  ...props
}: ComponentPropsWithoutRef<'summary'>) {
  return (
    <summary {...props} className={`disclosure-summary ${className}`}>
      <span>{children}</span>
      <ChevronDown
        size={18}
        aria-hidden="true"
        className="disclosure-chevron"
      />
    </summary>
  );
}
