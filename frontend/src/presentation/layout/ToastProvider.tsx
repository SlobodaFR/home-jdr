import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

// Global error/notification pattern (CLAUDE.md > sober tone, DESIGN.md has no
// dedicated toast token — built from existing tokens: canvas surface,
// hairline border, semantic text colors, rounded.md, no box-shadow since
// elevation is reserved to GameCard/DeltaProposalCard).
export type ToastVariant = 'danger' | 'info' | 'success';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 5000;

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  danger: 'border-danger text-danger',
  info: 'border-info text-info',
  success: 'border-success text-success',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, message, variant }]);
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-sm p-lg desktop:bottom-auto desktop:top-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={[
              'pointer-events-auto w-full max-w-sm rounded-md border bg-canvas px-lg py-md',
              'font-sans-body text-body-md',
              VARIANT_CLASSES[toast.variant],
            ].join(' ')}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
