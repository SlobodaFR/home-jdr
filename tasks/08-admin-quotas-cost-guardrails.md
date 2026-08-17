# 08 — Garde-fous de coût (quotas LLM) & tableau de bord admin

**Dépend de** : `04-llm-orchestration` (mergée — cette tâche se branche
autour de `ResolveSceneUseCase` sans le réécrire).

## Objectif

Empêcher une dérive de coût (voir `PRD.md` — clé API partagée + garde-fous)
en limitant le nombre de résolutions de scène par jour/par partie, et
donner à l'admin une visibilité simple sur l'usage.

## Modèle de données

- `LlmUsageRecord` : `id`, `sessionId`, `turnNumber`, `provider`
  (`claude`/`openai`), `callType` (`scene_resolution`/`summary`/
  `image_generation`), `occurredAt`. Table d'audit simple, pas de comptage
  de tokens précis en V1 (pas nécessaire pour un simple garde-fou de
  fréquence).
- Config quota : `DAILY_LLM_QUOTA` (nombre global d'appels/jour, env ou
  table admin modifiable sans redéploiement — préférer une table
  `AppSetting` clé/valeur simple, éditable depuis l'écran admin, avec
  fallback sur l'env var si absente).

## Périmètre

- `backend/src/domain/` : port `UsageQuotaPort`
  (`checkQuotaAvailable(): Promise<boolean>`,
  `recordUsage(record): Promise<void>`).
- `backend/src/application/` :
  - Modifier `ResolveSceneUseCase` (de `04`) pour appeler
    `UsageQuotaPort.checkQuotaAvailable()` **avant** tout appel LLM, et
    lever une erreur métier explicite (`QuotaExceededError`) sinon — c'est
    la seule modification attendue dans le code de `04`, garder le diff
    minimal.
  - `GetUsageStatsUseCase` (pour le tableau de bord admin — total du jour,
    tendance des 7 derniers jours).
  - `UpdateAppSettingUseCase` (modifier le quota depuis l'admin).
- `backend/src/infrastructure/` : `TypeOrmUsageQuotaAdapter`.
- `backend/src/interfaces/http/` : `GET /api/admin/usage`,
  `PATCH /api/admin/settings/daily-llm-quota` (admin uniquement).
- `frontend/` : écran admin "Usage & quotas" avec `{component.quota-meter}`
  (voir `DESIGN.md`), formulaire de modification du quota, message clair
  côté joueur si une action ne peut pas être résolue faute de quota
  ("Le MJ numérique a atteint sa limite du jour, réessaie plus tard" —
  jamais d'erreur technique brute affichée au joueur).

## Détail

- Le quota est volontairement simple (comptage d'appels, pas de calcul de
  coût réel en dollars/tokens) pour rester livrable rapidement — une
  évolution vers un calcul de coût précis est possible plus tard si
  l'usage le justifie, mais n'est pas demandée ici.
- `QuotaExceededError` doit être catché proprement au niveau HTTP
  (`interfaces/http/`) pour renvoyer un code d'erreur exploitable par le
  frontend (ex: 429), pas une 500 générique.

## Critères d'acceptation

- Une fois le quota journalier atteint, toute nouvelle soumission de tour
  qui déclencherait une résolution échoue proprement (429, message clair),
  sans consommer d'appel LLM supplémentaire.
- Le quota se réinitialise correctement au changement de jour (test avec
  horloge injectée/mockée, pas de dépendance à l'heure système réelle dans
  les tests).
- Modifier le quota depuis l'écran admin prend effet immédiatement, sans
  redéploiement.
- Le tableau de bord admin affiche un total cohérent avec les
  `LlmUsageRecord` réellement enregistrés (test d'intégration).

## Hors périmètre

- Facturation précise en tokens/dollars.
- Quotas différenciés par utilisateur (le quota est global à l'app en V1,
  cohérent avec "clé API partagée" de `PRD.md`).
