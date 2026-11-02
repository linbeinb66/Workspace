import { useEffect, useState } from 'react';
import { workDate } from './date';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const visible = () => { if (document.visibilityState === 'visible') update(); };
    const timer = window.setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', visible);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', visible); };
  }, []);
  return now;
}
export function useWorkDate(dayStartHour: number): string { return workDate(useNow(), dayStartHour); }
