import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

const ToastContext = createContext<(text: string, error?: boolean) => void>(() => undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const show = useCallback((text: string, error = false) => {
    clearTimeout(timer.current); setMessage({ text, error });
    timer.current = setTimeout(() => setMessage(null), error ? 6500 : 3500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <ToastContext.Provider value={show}>{children}
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      {message && <div className={`flex items-start gap-2 rounded-card border px-4 py-3 shadow-lg ${message.error ? 'border-danger/20 bg-danger-soft text-danger' : 'border-line bg-surface text-ink'}`}>
        <Icon name={message.error ? 'close' : 'check'} className="mt-0.5 shrink-0" /><span>{message.text}</span>
      </div>}
    </div>
  </ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
