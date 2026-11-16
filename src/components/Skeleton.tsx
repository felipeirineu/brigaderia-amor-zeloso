import type { ReactNode } from 'react';

/** Formas decorativas: o texto acessível fica uma só vez na região. */
export function Skeleton({
  shape = 'line',
  size = 'full',
}: {
  shape?: 'line' | 'circle' | 'rectangle';
  size?: 'short' | 'medium' | 'full';
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton-block skeleton-${shape} skeleton-${size}`}
    />
  );
}
export function SkeletonRegion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="skeleton-region" aria-busy="true" aria-label={label}>
      <span className="skeleton-accessible">{label}</span>
      <div aria-hidden="true">{children}</div>
    </section>
  );
}
export function SkeletonCard({
  kind = 'record',
}: {
  kind?: 'record' | 'delivery' | 'flavor' | 'production';
}) {
  return (
    <div className={`panel skeleton-card skeleton-card-${kind}`}>
      {kind === 'flavor' ? <Skeleton shape="rectangle" /> : null}
      {kind === 'production' && <Skeleton size="medium" />}
      <div className="skeleton-row">
        <Skeleton shape={kind === 'production' ? 'rectangle' : 'circle'} />
        <div className="skeleton-copy">
          <Skeleton size="medium" />
          <Skeleton size="short" />
        </div>
        {kind === 'delivery' && <Skeleton size="short" />}
      </div>
      {kind === 'delivery' && (
        <>
          <Skeleton size="medium" />
          <div className="skeleton-shortcuts">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} shape="rectangle" />
            ))}
          </div>
          <Skeleton shape="rectangle" />
        </>
      )}
    </div>
  );
}
export function SkeletonList({
  label = 'Carregando lista…',
  count = 3,
  kind = 'record',
  grid = false,
}: {
  label?: string;
  count?: number;
  kind?: 'record' | 'delivery' | 'flavor';
  grid?: boolean;
}) {
  return (
    <SkeletonRegion label={label}>
      <div className={grid ? 'skeleton-grid' : 'skeleton-list'}>
        {Array.from({ length: count }, (_, i) => (
          <SkeletonCard key={i} kind={kind} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
export function SkeletonStats() {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="skeleton-stat" key={i}>
          <Skeleton size="medium" />
          <Skeleton />
          <Skeleton size="short" />
        </div>
      ))}
    </div>
  );
}
export function SkeletonToday({ owner }: { owner: boolean }) {
  return (
    <SkeletonRegion label="Carregando seu dia…">
      {owner && (
        <>
          <SkeletonStats />
          <SkeletonCard kind="production" />
        </>
      )}
      <div className="skeleton-list">
        <SkeletonCard kind="delivery" />
        <SkeletonCard kind="delivery" />
      </div>
      {!owner && <SkeletonStats />}
    </SkeletonRegion>
  );
}
