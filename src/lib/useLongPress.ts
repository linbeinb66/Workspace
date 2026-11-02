import { useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

export function useLongPress(action: () => void, disabled = false) {
  const latest = useRef(action); latest.current = action;
  const delay = useRef<ReturnType<typeof setTimeout>>();
  const repeat = useRef<ReturnType<typeof setInterval>>();
  const repeated = useRef(false);
  const stop = () => { clearTimeout(delay.current); clearInterval(repeat.current); };
  useEffect(() => stop, []);
  return {
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (disabled || event.button !== 0) return;
      repeated.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
      delay.current = setTimeout(() => {
        repeated.current = true; latest.current();
        repeat.current = setInterval(() => latest.current(), 110);
      }, 450);
    },
    onPointerUp: stop, onPointerCancel: stop, onLostPointerCapture: stop,
    onClick(event: MouseEvent<HTMLButtonElement>) {
      if (repeated.current && event.detail !== 0) { repeated.current = false; return; }
      if (!disabled) latest.current();
    },
  };
}
