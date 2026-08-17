import { cx } from '../components/utils/cx';

// Persistent global banner (distinct from transient ToastProvider toasts) —
// for standing conditions like "connexion perdue" during a polling session.
// Sober tone per DESIGN.md: no shadow, no accent-gold, semantic color only.
export type ErrorBannerVariant = 'danger' | 'info';

export interface ErrorBannerProps {
  message: string;
  variant?: ErrorBannerVariant;
  onDismiss?: () => void;
  className?: string;
}

const VARIANT_CLASSES: Record<ErrorBannerVariant, string> = {
  danger: 'bg-canvas text-danger border-danger',
  info: 'bg-canvas text-info border-info',
};

export function ErrorBanner({ message, variant = 'danger', onDismiss, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cx(
        'flex items-center justify-between gap-md border px-lg py-md font-sans-body text-body-md',
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="font-sans-ui text-button-sm underline"
        >
          Fermer
        </button>
      ) : null}
    </div>
  );
}
