import { CharacterStateDelta } from '../../domain/character/character-state-delta';
import {
  SceneResolutionCharacterDelta,
  SceneResolutionInput,
  SceneResolutionOutput,
  SummarizeSceneInput,
} from '../../domain/session/llm-game-master.port';

/**
 * Provider-agnostic prompt building and tool-schema shared by
 * `ClaudeGameMasterAdapter` and `OpenAiGameMasterAdapter`. Both providers
 * are told to answer via structured tool/function calling on this exact
 * schema (see `tasks/04-llm-orchestration.md` - "le prompt système doit
 * imposer un format de sortie structuré... ne jamais parser la narration en
 * texte libre pour en extraire les deltas"), so this is the single place
 * that defines what "narration + deltas, cleanly separated" means on the
 * wire. Kept intentionally simple/iterable (see task's "prompt engineering,
 * à itérer, pas figé" note) - no business logic here, only string/shape
 * building.
 */

export const RESOLVE_SCENE_TOOL_NAME = 'resolve_scene';

/** JSON Schema, valid both as Claude's `tool.input_schema` and OpenAI's `function.parameters`. */
export const RESOLVE_SCENE_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    narration_text: {
      type: 'string',
      description:
        'La narration du MJ pour ce tour, en texte libre - jamais de delta chiffré dedans.',
    },
    character_deltas: {
      type: 'array',
      description:
        'Un delta proposé par personnage impliqué et affecté ce tour-ci. Omettre un personnage non affecté.',
      items: {
        type: 'object',
        properties: {
          character_id: { type: 'string' },
          hit_points: {
            type: 'integer',
            description:
              'Variation de points de vie (négatif = dégâts, positif = soin).',
          },
          inventory_add: { type: 'array', items: { type: 'string' } },
          inventory_remove: { type: 'array', items: { type: 'string' } },
          custom_attribute_changes: {
            type: 'object',
            description:
              'Nouvelle valeur par clé d’attribut personnalisé modifié.',
          },
        },
        required: ['character_id'],
      },
    },
  },
  required: ['narration_text', 'character_deltas'],
} as const;

export interface ResolveSceneToolCharacterDelta {
  character_id: string;
  hit_points?: number;
  inventory_add?: string[];
  inventory_remove?: string[];
  custom_attribute_changes?: Record<string, number | string>;
}

export interface ResolveSceneToolInput {
  narration_text: string;
  character_deltas: ResolveSceneToolCharacterDelta[];
}

export function toSceneResolutionOutput(
  toolInput: ResolveSceneToolInput,
): SceneResolutionOutput {
  const characterDeltas: SceneResolutionCharacterDelta[] = (
    toolInput.character_deltas ?? []
  ).map((entry) => ({
    characterId: entry.character_id,
    delta: CharacterStateDelta.create({
      hitPoints: entry.hit_points,
      inventoryAdd: entry.inventory_add,
      inventoryRemove: entry.inventory_remove,
      customAttributeChanges: entry.custom_attribute_changes,
    }),
  }));

  return {
    narrationText: toolInput.narration_text,
    characterDeltas,
  };
}

function formatCharacter(
  character: SceneResolutionInput['characters'][number],
): string {
  const inventory = character.inventory
    .map((item) => `${item.name} x${item.quantity}`)
    .join(', ');
  return `- ${character.name} (character_id: ${character.characterId}) : PV ${character.hitPointsCurrent}/${character.hitPointsMax}, inventaire: [${inventory}], attributs: ${JSON.stringify(character.customAttributes)}`;
}

function formatDiceFacts(input: SceneResolutionInput): string {
  if (input.diceFacts.length === 0) {
    return '(aucune action mécanique ce tour-ci - pas de jet de dé à respecter)';
  }
  return input.diceFacts
    .map(
      (fact) =>
        `- ${fact.playerId} tente "${fact.actionLabel}" (${fact.formula}) : résultat = ${fact.total} (détail: ${fact.rolls.join(' + ')}). Ce résultat est définitif et non négociable : ne le recalcule pas, ne le contredis pas, respecte-le dans ta narration.`,
    )
    .join('\n');
}

function formatRecentTurns(input: SceneResolutionInput): string {
  if (input.recentTurns.length === 0) {
    return '(aucun tour précédent)';
  }
  return input.recentTurns
    .map((turn) => `Tour ${turn.turnNumber} : ${turn.narrationText}`)
    .join('\n');
}

/** System prompt for `resolveScene()` - full rules text, state, and non-negotiable dice facts. */
export function buildResolveSceneSystemPrompt(
  input: SceneResolutionInput,
): string {
  return [
    "Tu es le maître du jeu (MJ) d'un jeu de rôle. Voici les règles du jeu, dans leur intégralité - respecte-les strictement :",
    input.rulesText,
    '',
    'Schéma structuré de la fiche de personnage :',
    JSON.stringify(input.characterSheetSchema),
    '',
    'Personnages impliqués dans cette scène :',
    input.characters.map(formatCharacter).join('\n'),
    '',
    'Résumé glissant de la campagne (événements plus anciens que les tours récents ci-dessous) :',
    input.rollingSummary || '(aucun résumé pour le moment)',
    '',
    'Derniers tours résolus :',
    formatRecentTurns(input),
    '',
    'Jets de dés déjà effectués pour ce tour :',
    formatDiceFacts(input),
    '',
    `Réponds en appelant l'outil "${RESOLVE_SCENE_TOOL_NAME}" avec la narration et les deltas d'état proposés. Ne mets jamais de delta chiffré dans le texte de narration lui-même - uniquement dans les champs structurés de l'outil.`,
  ].join('\n');
}

/** User message for `resolveScene()` - just this turn's submitted actions. */
export function buildResolveSceneUserMessage(
  input: SceneResolutionInput,
): string {
  return input.submittedActions
    .map(
      (action) =>
        `${action.playerId} (personnage ${action.characterId}) : ${action.actionText}`,
    )
    .join('\n');
}

/** System prompt for `summarize()`. */
export function buildSummarizeSystemPrompt(input: SummarizeSceneInput): string {
  return [
    "Tu es le maître du jeu (MJ) d'un jeu de rôle. Voici les règles du jeu :",
    input.rulesText,
    '',
    'Résumé glissant actuel de la campagne :',
    input.previousRollingSummary || '(aucun résumé pour le moment)',
    '',
    'Tours à intégrer dans le résumé :',
    input.turnsToSummarize
      .map((turn) => `Tour ${turn.turnNumber} : ${turn.narrationText}`)
      .join('\n'),
    '',
    'Condense le résumé actuel et ces tours en un unique résumé à jour, concis, qui préserve les faits importants pour la cohérence narrative future. Réponds uniquement avec le texte du résumé, sans préambule.',
  ].join('\n');
}

export const SUMMARIZE_USER_MESSAGE =
  "Condense l'historique ci-dessus en un résumé glissant mis à jour.";
