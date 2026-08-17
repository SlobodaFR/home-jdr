import { InventoryItem } from '../../domain/character';

export interface InventoryListProps {
  items: InventoryItem[];
  /** Reused as-is in compact form by the session-engine screen (03-session-engine). */
  compact?: boolean;
}

export function InventoryList({ items, compact = false }: InventoryListProps) {
  if (items.length === 0) {
    return <p className="font-body-md text-mute">Inventaire vide.</p>;
  }

  return (
    <ul className={`flex flex-col ${compact ? 'gap-xxs' : 'gap-xs'}`}>
      {items.map((item) => (
        <li
          key={item.name}
          className={`flex items-center justify-between border-b border-hairline ${
            compact ? 'pb-xxs' : 'pb-xs'
          } font-body-md text-ink`}
        >
          <span>{item.name}</span>
          {item.quantity > 1 && (
            <span className="font-caption-sm text-mute">x{item.quantity}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
