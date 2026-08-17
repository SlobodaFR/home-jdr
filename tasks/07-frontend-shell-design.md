# 07 — Shell frontend & implémentation du design system

**Dépend de** : `00-scaffold-monorepo` (mergé).
**Parallélisable avec** : `01-game-catalog`, `02-character-sheet`.

## Objectif

Implémenter la fondation visuelle transverse : tokens Tailwind dérivés de
`DESIGN.md`, composants UI génériques réutilisables par toutes les autres
tâches, navigation principale, layout mobile-first. Les autres tâches
consomment ces composants plutôt que de réinventer du style au cas par cas.

## Périmètre

- `frontend/tailwind.config.ts` : tokens de couleur, typographie
  (fontFamily, tailles), `borderRadius`, `spacing` traduits fidèlement
  depuis le front-matter de `DESIGN.md` (colors/typography/rounded/spacing)
  — copier les valeurs telles quelles, ne pas réinterpréter.
- `frontend/src/presentation/components/` — composants génériques
  correspondant 1:1 aux entrées `components:` de `DESIGN.md`, avant que
  les tâches métier n'en aient besoin :
  - `ButtonPrimary`, `ButtonSecondary`, `ButtonDanger`, `IconCircularButton`
  - `ActionInput`
  - `SessionStatusPill` (variants waiting/resolving)
  - `GameCard`
  - `InviteCodeBadge`
  - `DiceRollChip`
  - `CharacterStatBar` (avec variant critical)
  - `DeltaProposalCard` (structure/props, sans logique métier de deltas —
    juste l'affichage + callbacks `onValidate`/`onReject`)
  - `TurnLogEntry`
  - `MapPin`
  - `AdminBadgeChildren`
  - `QuotaMeter`
- `frontend/src/presentation/layout/` : shell de navigation (mobile-first —
  barre de navigation basse sur mobile façon app native, sidebar sur
  desktop ≥1024px selon `DESIGN.md` → Responsive Behavior), écran de
  connexion/état "non authentifié", gestion des erreurs globales
  (toasts/bannières cohérentes avec le ton sobre du design).
- Storybook (ou équivalent léger) optionnel mais recommandé pour visualiser
  chaque composant isolément et faciliter la revue — à trancher selon le
  temps disponible, pas bloquant pour les critères d'acceptation.

## Détail

- Chaque composant doit être écrit sans dépendance à une entité métier
  précise (pas d'import de `GameSession`/`Character` dans ce dossier) —
  uniquement des props primitives, pour rester réutilisable et testable en
  isolation. Les tâches métier (01 à 06) important ces composants et leur
  passent leurs données.
- Respecter strictement les règles "Do/Don't" de `DESIGN.md` : une seule
  ombre autorisée (niveau 2, réservée à `GameCard`/`DeltaProposalCard`),
  `accent-gold` réservé aux usages listés, `accent-blood` réservé à
  `CharacterStatBar` critique uniquement.
- Prévoir dès cette tâche la structure responsive (breakpoints mobile /
  tablet / desktop de `DESIGN.md`) plutôt que de la découvrir plus tard
  dans une tâche métier.

## Critères d'acceptation

- Chaque composant listé existe, est typé (props TypeScript), et un test
  de rendu basique (snapshot ou assertions DOM) existe pour chacun.
- Le layout de navigation s'adapte correctement aux trois paliers de
  largeur définis dans `DESIGN.md`.
- Aucune couleur/espacement en dur (valeur hexadécimale ou pixel littérale)
  dans les composants — tout passe par les tokens Tailwind configurés.
- `design-check` (slash command à reprendre/adapter de `home-fit`, voir
  `CLAUDE.md`) passe sans signaler d'écart entre les composants et
  `DESIGN.md`.

## Hors périmètre

- Toute logique métier (données réelles de partie, de fiche, de catalogue)
  — cette tâche livre des composants "vides", consommés par les autres.
- Dark mode (identifié comme "Known Gap" dans `DESIGN.md`, non traité ici
  sauf demande explicite).
