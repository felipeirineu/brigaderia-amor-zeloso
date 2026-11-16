import { useEffect } from 'react';

/**
 * Arrastar para baixo fecha as folhas (`dialog.help-sheet`) no celular.
 * O fechamento passa pelo mesmo "cancel" do Esc/Voltar: cada folha continua
 * decidindo se pode fechar (ex.: não fecha durante um salvamento).
 * Só começa quando o conteúdo da folha já está no topo, para não brigar com a
 * rolagem; campos de texto e controles deslizantes ficam de fora.
 */
const CLOSE_DISTANCE = 110;
const CLOSE_SPEED = 0.6; // px/ms

function scrolledToTop(sheet: HTMLElement, from: Element | null) {
  for (let el = from; el && el !== sheet.parentElement; el = el.parentElement)
    if (el instanceof HTMLElement && el.scrollTop > 0) return false;
  return true;
}
function ignored(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      'input, textarea, select, [contenteditable], [role="slider"], .no-sheet-drag',
    )
  );
}
function requestSheetClose(sheet: HTMLDialogElement) {
  const cancel = new Event('cancel', { cancelable: true });
  if (sheet.dispatchEvent(cancel) && sheet.open) sheet.close();
}

export function SheetGestures() {
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 700px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sheet: HTMLDialogElement | null = null;
    let startY = 0,
      startT = 0,
      dy = 0,
      dragging = false;

    const begin = (target: EventTarget | null, y: number) => {
      if (!mobile.matches || ignored(target)) return;
      const found =
        target instanceof Element
          ? target.closest<HTMLDialogElement>('dialog.help-sheet[open]')
          : null;
      if (!found || !scrolledToTop(found, target as Element)) return;
      sheet = found;
      startY = y;
      startT = performance.now();
      dy = 0;
      dragging = false;
    };
    const move = (y: number, event?: Event) => {
      if (!sheet) return;
      const delta = y - startY;
      if (!dragging) {
        if (delta < 8) {
          if (delta < -4) sheet = null; // subindo: é rolagem, não arraste
          return;
        }
        dragging = true;
        sheet.classList.add('sheet-dragging');
      }
      if (event?.cancelable) event.preventDefault();
      dy = Math.max(0, delta);
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const end = () => {
      const current = sheet;
      sheet = null;
      if (!current || !dragging) return;
      const speed = dy / Math.max(1, performance.now() - startT);
      current.classList.remove('sheet-dragging');
      const close = dy > CLOSE_DISTANCE || (dy > 40 && speed > CLOSE_SPEED);
      if (close) {
        requestSheetClose(current);
        // Se a folha recusou fechar (ex.: salvando), volta ao lugar.
        if (current.open) current.style.transform = '';
        else
          window.setTimeout(
            () => (current.style.transform = ''),
            reduced.matches ? 0 : 200,
          );
      } else current.style.transform = '';
      dragging = false;
    };

    const onTouchStart = (e: TouchEvent) =>
      e.touches.length === 1 && begin(e.target, e.touches[0].clientY);
    const onTouchMove = (e: TouchEvent) => move(e.touches[0].clientY, e);
    const onPointerDown = (e: PointerEvent) =>
      e.pointerType === 'mouse' && e.button === 0 && begin(e.target, e.clientY);
    const onPointerMove = (e: PointerEvent) =>
      e.pointerType === 'mouse' && move(e.clientY);
    const onPointerUp = (e: PointerEvent) => e.pointerType === 'mouse' && end();

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', end);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, []);
  return null;
}
