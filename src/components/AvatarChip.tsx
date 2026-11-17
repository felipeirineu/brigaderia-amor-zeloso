import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Button } from './Button';
/** Identidade e nome em espaços distintos; selecionar nunca remove a identidade. */
export function AvatarChip({
  avatar,
  children,
  className = '',
  type = 'button',
  ...props
}: ComponentPropsWithRef<'button'> & { avatar?: ReactNode }) {
  return (
    <Button
      {...props}
      type={type}
      variant="chip"
      icon={avatar}
      className={'avatar-chip ' + className}
    >
      {children}
    </Button>
  );
}
