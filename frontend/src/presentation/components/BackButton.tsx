import { useNavigate } from 'react-router-dom';
import { IconCircularButton } from './IconCircularButton';

export interface BackButtonProps {
  /** Explicit destination. Defaults to browser-style back (history -1). */
  to?: string;
  className?: string;
}

/** Back-arrow control - see DESIGN.md > button-icon-circular ("retour"). */
export function BackButton({ to, className }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <IconCircularButton
      ariaLabel="Retour"
      className={className}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      icon={
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12.5 4.5 6 10l6.5 5.5" />
        </svg>
      }
    />
  );
}
