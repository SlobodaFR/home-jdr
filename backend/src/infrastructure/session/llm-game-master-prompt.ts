import { CharacterStateDelta } from '../../domain/character/character-state-delta';
import {
  CharacterCreationAssistInput,
  CharacterCreationAssistOutput,
  CharacterCreationMessage,
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

export const ASSIST_CHARACTER_CREATION_TOOL_NAME = 'assist_character_creation';

/** JSON Schema, valid both as Claude's `tool.input_schema` and OpenAI's `function.parameters`. */
export const ASSIST_CHARACTER_CREATION_TOOL_SCHEMA = {
  type: 'object',
  properties: {
    assistant_message: {
      type: 'string',
      description:
        'Le prochain message du MJ au joueur - une question ou une proposition pour avancer la creation du personnage.',
    },
    draft_updates: {
      type: 'object',
      description:
        'Uniquement les champs du brouillon que tu proposes de changer suite a ce message - omettre un champ le laisse inchange, jamais destructif.',
      properties: {
        name: { type: 'string' },
        hit_points_max: { type: 'integer' },
        inventory: { type: 'array', items: { type: 'string' } },
        custom_attribute_changes: {
          type: 'object',
          description:
            'Nouvelle valeur par cle d’attribut personnalise du schema cible.',
        },
      },
    },
    ready_to_finalize: {
      type: 'boolean',
      description:
        'Indication seulement (le joueur/l’UI decide reellement) : penses-tu que la fiche est prete a etre validee ?',
    },
  },
  required: ['assistant_message', 'draft_updates', 'ready_to_finalize'],
} as const;

export interface AssistCharacterCreationToolInput {
  assistant_message: string;
  draft_updates: {
    name?: string;
    hit_points_max?: number;
    inventory?: string[];
    custom_attribute_changes?: Record<string, number | string>;
  };
  ready_to_finalize: boolean;
}

export function toCharacterCreationAssistOutput(
  toolInput: AssistCharacterCreationToolInput,
): CharacterCreationAssistOutput {
  const rawUpdates = toolInput.draft_updates ?? {};
  return {
    assistantMessage: toolInput.assistant_message,
    draftUpdates: {
      ...(rawUpdates.name !== undefined ? { name: rawUpdates.name } : {}),
      ...(rawUpdates.hit_points_max !== undefined
        ? { hitPointsMax: rawUpdates.hit_points_max }
        : {}),
      ...(rawUpdates.inventory !== undefined
        ? { inventory: rawUpdates.inventory }
        : {}),
      ...(rawUpdates.custom_attribute_changes !== undefined
        ? { customAttributes: rawUpdates.custom_attribute_changes }
        : {}),
    },
    readyToFinalize: Boolean(toolInput.ready_to_finalize),
  };
}

function formatCharacterCreationMessages(
  messages: CharacterCreationMessage[],
): string {
  if (messages.length === 0) {
    return '(aucun message pour le moment)';
  }
  return messages
    .map(
      (message) =>
        `${message.role === 'assistant' ? 'MJ' : 'Joueur'} : ${message.content}`,
    )
    .join('\n');
}

/** System prompt for `assistCharacterCreation()` - full rules text, target schema, and the draft built so far. */
export function buildAssistCharacterCreationSystemPrompt(
  input: CharacterCreationAssistInput,
): string {
  return [
    "Tu es le maître du jeu (MJ) d'un jeu de rôle. Tu aides un joueur à créer son personnage par une conversation guidée, pas par un formulaire. Voici les règles du jeu, dans leur intégralité :",
    input.rulesText,
    '',
    'Schéma structuré cible de la fiche de personnage (à quoi le personnage doit converger) :',
    JSON.stringify(input.characterSheetSchema),
    '',
    'Brouillon actuel de la fiche, construit au fil de la conversation :',
    JSON.stringify(input.draftCharacter),
    '',
    'Historique de la conversation :',
    formatCharacterCreationMessages(input.messages),
    '',
    `Réponds en appelant l'outil "${ASSIST_CHARACTER_CREATION_TOOL_NAME}" avec ton prochain message (une question ou une proposition concrète), les mises à jour de brouillon que ce message justifie (ne jamais réinventer un champ déjà acté sans raison exprimée par le joueur), et si tu penses la fiche prête à être finalisée. Un nom de personnage clair suffit à considérer que la fiche peut être finalisée - n'exige jamais plus que ce que le schéma cible requiert.`,
  ].join('\n');
}

/** User message for `assistCharacterCreation()` - the player's latest message in the conversation. */
export function buildAssistCharacterCreationUserMessage(
  input: CharacterCreationAssistInput,
): string {
  const lastUserMessage = [...input.messages]
    .reverse()
    .find((message) => message.role === 'user');
  return (
    lastUserMessage?.content ??
    '(le joueur vient de démarrer la création de son personnage)'
  );
}
