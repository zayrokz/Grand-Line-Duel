/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Kind = 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: Kind;
}

const ToastContext = createContext<(message: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, kind: Kind = 'error') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-2), { id, message, kind }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
