export type CustomAttributeType = 'number' | 'text';

export interface CustomAttribute {
  key: string;
  label: string;
  type: CustomAttributeType;
  default: number | string;
}

export interface CharacterSheetSchema {
  hitPoints: { defaultMax: number };
  inventory: { defaultItems: string[] };
  customAttributes: CustomAttribute[];
}

export interface MechanicalAction {
  actionKey: string;
  label: string;
  diceFormula: string;
  relatedStat?: string;
}

export interface GameSystem {
  id: string;
  name: string;
  description: string;
  adaptedForChildren: boolean;
  rulesText: string;
  rulesSourceFileName: string;
  characterSheetSchema: CharacterSheetSchema;
  mechanicalActions: MechanicalAction[];
  createdAt: string;
}
