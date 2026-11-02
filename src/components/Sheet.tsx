import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export function Sheet({ open, title, children, onClose, footer, dialog = false, busy = false }: {
  open: boolean; title: string; children: ReactNode; onClose: () => void;
  footer?: ReactNode; dialog?: boolean; busy?: boolean;
}) {
  const label = useId();
  const panel = useRef<HTMLDivElement>(null);
  const latestClose = useRef(onClose); latestClose.current = onClose;
  const isBusy = useRef(busy); isBusy.current = busy;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    if (root) root.inert = true;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!isBusy.current) latestClose.current(); }
      if (event.key === 'Tab') {
        const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]') ?? []);
        const first = nodes[0]; const last = nodes.at(-1);
        if (!first || !last) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      if (root) root.inert = previousInert;
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className={`modal-overlay ${dialog ? 'items-center px-4' : 'items-end sm:items-center sm:px-4'}`}
    onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={panel} role={dialog ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={label} aria-busy={busy} tabIndex={-1}
      className={`modal-panel ${dialog ? 'rounded-card' : 'rounded-t-[24px] sm:rounded-card'}`}>
      {!dialog && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />}
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <h2 id={label} className="text-title">{title}</h2><button className="icon-btn" aria-label="关闭" onClick={onClose} disabled={busy}><Icon name="close" /></button>
      </header>
      <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </div>
  </div>, document.body);
}
