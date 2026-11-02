import { useRef, useState, type ReactNode } from 'react';
export function SwipeAction({ children, onDelete, label }: { children: ReactNode; onDelete: () => void; label: string }) {
  const [offset, setOffset] = useState(0);
  const start = useRef({ x: 0, y: 0, offset: 0, moving: false });
  const suppress = useRef(false);
  return <div className="relative overflow-hidden rounded-btn">
    <button aria-label={`左滑删除${label}`} aria-hidden={offset === 0} tabIndex={offset === 0 ? -1 : 0} className={`absolute inset-y-0 right-0 w-20 bg-danger font-medium text-surface dark:text-canvas ${offset === 0 ? 'invisible' : ''}`} onClick={onDelete}>删除</button>
    <div className="relative bg-surface" style={{ transform: `translateX(${offset}px)`, touchAction: 'pan-y' }}
      onPointerDown={(event) => { if (event.button !== 0) return; start.current = { x: event.clientX, y: event.clientY, offset, moving: false }; suppress.current = false; }}
      onPointerMove={(event) => {
        if (!(event.buttons & 1)) return;
        const dx = event.clientX - start.current.x; const dy = event.clientY - start.current.y;
        if (!start.current.moving && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) { start.current.moving = true; event.currentTarget.setPointerCapture(event.pointerId); }
        if (start.current.moving) { suppress.current = true; setOffset(Math.max(-80, Math.min(0, start.current.offset + dx))); }
      }}
      onPointerUp={() => { if (start.current.moving) setOffset((value) => value < -32 ? -80 : 0); start.current.moving = false; }}
      onPointerCancel={() => { setOffset(0); start.current.moving = false; }}
      onClickCapture={(event) => { if (suppress.current) { event.preventDefault(); event.stopPropagation(); suppress.current = false; } }}>
      {children}
    </div>
  </div>;
}
