/* eslint-disable @typescript-eslint/no-unused-vars -- Propriedades visuais são removidas antes de repassar atributos ao DOM. */
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Check, LoaderCircle } from 'lucide-react';
type Variant = 'primary' | 'tonal' | 'ghost' | 'danger' | 'chip' | 'card';
type Common = {
  variant?: Variant;
  size?: 'default' | 'large' | 'compact';
  loading?: boolean;
  icon?: ReactNode;
  disabled?: boolean;
};
type Props = Common &
  (
    | ComponentPropsWithRef<'button'>
    | (LinkProps & { ref?: React.Ref<HTMLAnchorElement> })
    | (ComponentPropsWithRef<'a'> & { href: string })
  );
export function Button(props: Props) {
  const {
      variant,
      size = 'default',
      loading,
      icon,
      children,
      className = '',
    } = props,
    selected =
      props['aria-pressed'] === true || props['aria-pressed'] === 'true',
    kind =
      variant ??
      (props['aria-pressed'] !== undefined
        ? 'chip'
        : className.includes('primary-action')
          ? 'primary'
          : /customer-tile|flavor-add|module-card|more-link/.test(className)
            ? 'card'
            : 'tonal'),
    classes = `az-button az-button--${kind} az-button--${size} ${className}`,
    content = (
      <>
        {(loading !== undefined || icon || kind === 'chip') && (
          <span className="az-button-icon" aria-hidden="true">
            {loading ? (
              <LoaderCircle className="button-spinner" size={20} />
            ) : selected && kind === 'chip' ? (
              <Check size={20} />
            ) : (
              icon
            )}
          </span>
        )}
        {kind === 'card' ? (
          children
        ) : (
          <span className="az-button-label">{children}</span>
        )}
      </>
    );
  if ('to' in props) {
    const {
      variant: _v,
      size: _s,
      loading: _l,
      icon: _i,
      disabled,
      ...link
    } = props;
    return (
      <Link
        {...link}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        tabIndex={disabled || loading ? -1 : link.tabIndex}
        onClick={(e) => {
          if (disabled || loading) e.preventDefault();
          else link.onClick?.(e);
        }}
      >
        {content}
      </Link>
    );
  }
  if ('href' in props) {
    const {
      variant: _v,
      size: _s,
      loading: _l,
      icon: _i,
      disabled,
      ...link
    } = props;
    return (
      <a
        {...link}
        className={classes}
        aria-busy={loading || undefined}
        aria-disabled={disabled || loading || undefined}
        tabIndex={disabled || loading ? -1 : link.tabIndex}
        onClick={(e) => {
          if (disabled || loading) e.preventDefault();
          else link.onClick?.(e);
        }}
      >
        {content}
      </a>
    );
  }
  const { variant: _v, size: _s, loading: _l, icon: _i, ...button } = props;
  return (
    <button
      {...button}
      className={classes}
      disabled={button.disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
