import { MechanicalAction } from '../../domain/game-system';

export interface MechanicalActionDraft {
  actionKey: string;
  label: string;
  diceFormula: string;
  relatedStat: string;
}

export function emptyMechanicalActionDraft(): MechanicalActionDraft {
  return { actionKey: '', label: '', diceFormula: '1d20', relatedStat: '' };
}

export function toMechanicalActions(drafts: MechanicalActionDraft[]): MechanicalAction[] {
  return drafts
    .filter((draft) => draft.actionKey.trim() !== '')
    .map((draft) => ({
      actionKey: draft.actionKey,
      label: draft.label,
      diceFormula: draft.diceFormula,
      ...(draft.relatedStat.trim() !== '' && { relatedStat: draft.relatedStat }),
    }));
}
