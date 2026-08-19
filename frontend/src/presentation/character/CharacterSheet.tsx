import { Character } from '../../domain/character';
import { CharacterStatBar } from './CharacterStatBar';
import { InventoryList } from './InventoryList';

export interface CharacterSheetProps {
  character: Character;
  /**
   * Compact variant, reused as-is by the session-engine screen
   * (`03-session-engine`) alongside the turn log.
   */
  compact?: boolean;
}

export function CharacterSheet({ character, compact = false }: CharacterSheetProps) {
  const customAttributeEntries = Object.entries(character.customAttributes);

  return (
    <section className={`flex flex-col ${compact ? 'gap-sm' : 'gap-lg'}`}>
      {compact ? (
        <p className="font-sans-body text-body-strong text-ink">{character.name}</p>
      ) : (
        <h2 className="font-sans-ui text-heading-lg text-ink">{character.name}</h2>
      )}

      {character.hitPointsMax > 0 && (
        <CharacterStatBar
          label="Points de vie"
          current={character.hitPointsCurrent}
          max={character.hitPointsMax}
          compact={compact}
        />
      )}

      {customAttributeEntries.length > 0 && (
        <dl className={`grid grid-cols-2 ${compact ? 'gap-xxs' : 'gap-sm'}`}>
          {customAttributeEntries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <dt className="font-sans-body text-caption-md text-mute">{key}</dt>
              <dd className="font-sans-body text-body-strong text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div>
        {!compact && (
          <h3 className="font-sans-ui text-heading-md text-ink mb-xs">Inventaire</h3>
        )}
        <InventoryList items={character.inventory} compact={compact} />
      </div>
    </section>
  );
}
