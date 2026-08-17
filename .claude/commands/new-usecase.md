---
description: Génère le squelette TDD d'un use-case (domain port + application use-case + test) suivant l'architecture hexagonale de home-jdr
---

Génère le squelette d'un nouveau use-case pour `home-jdr` à partir de
l'argument fourni : `$ARGUMENTS` (format attendu : `<contexte>/<NomDuUseCase>`,
ex. `character-sheet/CreateCharacter` ou `session-engine/SubmitPlayerAction`).

Respecte strictement l'architecture hexagonale décrite dans `CLAUDE.md` :

1. **Domain** (`backend/src/domain/<contexte>/`) : si les ports
   (repository, service externe) nécessaires n'existent pas encore, crée-les
   comme classes abstraites (`abstract class XRepository { abstract ... }`),
   zéro dépendance framework — voir `backend/src/domain/auth/*.ts` et
   `backend/src/domain/user/user.repository.ts` comme référence de style.
2. **Application** (`backend/src/application/<contexte>/<nom-kebab>.use-case.ts`) :
   une classe `@Injectable()` avec un seul point d'entrée `execute(...)`,
   qui orchestre uniquement des ports du domaine — jamais d'appel HTTP,
   TypeORM ou provider externe direct ici. Voir
   `backend/src/application/auth/handle-oauth-callback.use-case.ts`.
3. **Test** (`backend/src/application/<contexte>/<nom-kebab>.use-case.spec.ts`) :
   écrit AVANT l'implémentation (TDD — consulte les skills utilisateur
   `tdd-workflow-engine`, `tdd-core-patterns`, `tdd-testing-patterns` avant
   d'écrire), avec des repositories in-memory (pas de mock TypeORM) — voir
   `backend/src/application/auth/handle-session-revoked.use-case.spec.ts`
   ou tout fichier `*.use-case.spec.ts` existant comme référence de style
   (classe `InMemoryXRepository extends XRepository`).

Ne crée PAS d'implémentation `infrastructure/` ni de controller/module
`interfaces/http/` sauf si explicitement demandé — ce command ne couvre que
le triptyque port/use-case/test.

Si le port domaine référencé n'existe pas et que son contrat n'est pas
évident depuis le nom du use-case, arrête-toi et demande clarification
plutôt que d'inventer une interface.
