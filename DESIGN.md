---
version: alpha
name: home-jdr-design
description: Un système de MJ numérique construit sur la même méthode que le design.md Nike de référence (contraste typographique fort, grille 8px, palette quasi-monochrome avec accents sémantiques rares) — mais où le "photography-first" de Nike devient "carte-first" : l'image de carte du monde générée par IA porte toute l'énergie visuelle et chromatique, pendant que le reste de l'interface (fiches, boutons, listes de parties) reste sobre, dense et neutre, façon carnet de MJ plutôt que vitrine commerciale.
colors: |
  | primary | on-primary | canvas | parchment | ink | slate | ash | mute | hairline | hairline-soft | danger | danger-deep | success | success-bright | info | accent-gold | accent-gold-soft | accent-blood |
  | ------- | ---------- | ------ | --------- | --- | ----- | --- | ---- | -------- | -------------- | ------ | ----------- | ------- | -------------- | ---- | ----------- | ----------------- | ------------ |
  | #14110f | #f7f2ea | #f7f2ea | #efe6d6 | #14110f | #3a352f | #57514a | #83796d | #d8cdb8 | #e8e0d0 | #a3231f | #5c1310 | #2f6b4f | #3f9c73 | #2d5580 | #b08a2e | #e6d3a3 | #7a1d1a |
typography: |
  | display-title | heading-xl | heading-lg | heading-md | body-md | body-strong | button-md | button-sm | link-md | caption-md | caption-sm | label-dice | utility-xs |
  | ------------- | ---------- | ---------- | ---------- | ------- | ----------- | --------- | --------- | ------- | ---------- | ---------- | ---------- | ---------- |
  | fontFamily: serif-display, fontSize: 40px, fontWeight: 600, lineHeight: 1.05, letterSpacing: 0, textTransform: none |
  | fontFamily: sans-ui, fontSize: 26px, fontWeight: 600, lineHeight: 1.2 |
  | fontFamily: sans-ui, fontSize: 20px, fontWeight: 600, lineHeight: 1.25 |
  | fontFamily: sans-ui, fontSize: 16px, fontWeight: 600, lineHeight: 1.4 |
  | fontFamily: sans-body, fontSize: 16px, fontWeight: 400, lineHeight: 1.55 |
  | fontFamily: sans-body, fontSize: 16px, fontWeight: 600, lineHeight: 1.5 |
  | fontFamily: sans-ui, fontSize: 16px, fontWeight: 600, lineHeight: 1.4 |
  | fontFamily: sans-ui, fontSize: 14px, fontWeight: 600, lineHeight: 1.4 |
  | fontFamily: sans-body, fontSize: 16px, fontWeight: 600, lineHeight: 1.5, textDecoration: underline |
  | fontFamily: sans-body, fontSize: 14px, fontWeight: 500, lineHeight: 1.4 |
  | fontFamily: sans-body, fontSize: 12px, fontWeight: 500, lineHeight: 1.4 |
  | fontFamily: mono-ui, fontSize: 14px, fontWeight: 700, lineHeight: 1, letterSpacing: 0.02em |
  | fontFamily: sans-body, fontSize: 11px, fontWeight: 500, lineHeight: 1.4 |
rounded: |
  | none | sm | md | lg | full |
  | ---- | --- | --- | --- | ---- |
  | 0px | 6px | 10px | 16px | 9999px |
spacing: |
  | xxs | xs | sm | md | lg | xl | xxl | section |
  | --- | --- | --- | --- | --- | --- | --- | ------- |
  | 2px | 4px | 8px | 12px | 16px | 24px | 32px | 48px |
components: |
  button-primary, button-primary-active, button-secondary, button-danger, button-icon-circular,
  action-input, action-input-focused, character-stat-bar, character-stat-bar-critical,
  dice-roll-chip, delta-proposal-card, session-status-pill, session-status-pill-waiting,
  session-status-pill-resolving, game-card, map-pin, map-pin-active, invite-code-badge,
  turn-log-entry, admin-badge-children, quota-meter
---

## Overview

Ce système applique au domaine du JdR numérique la même discipline que le
design.md Nike pris comme référence méthodologique : un petit nombre de
tokens, un contraste typographique volontairement marqué entre un tier
d'affichage rare (`{typography.display-title}`) et un tier utilitaire dense
(12–16px), une géométrie de composants restreinte, et une règle stricte —
**toute la couleur "vivante" de l'app vient du contenu généré (la carte
illustrée, l'artwork de scène), jamais du chrome UI**.

Où Nike réserve sa couleur à la photographie produit et au signal prix,
`home-jdr` réserve la sienne à trois choses : la carte du monde (image IA,
plein cadre, non tokenisée), les signaux sémantiques de jeu (jet de dé
critique, dégâts, succès), et un unique accent chaud (`{colors.accent-gold}`)
qui marque ce qui est "magique"/notable dans l'interface (jet de dé, badge
d'invitation). Tout le reste — fiches, listes de parties, formulaires
d'action — reste sur `{colors.canvas}`/`{colors.parchment}` avec de l'encre
(`{colors.ink}`) et rien d'autre.

**Caractéristiques clés :**

- Un seul tier d'affichage (`{typography.display-title}`, serif, 40px)
  réservé aux titres de partie et d'écran d'accueil — jamais utilisé pour un
  titre de section courant.
- Palette quasi-monochrome encre/parchemin (`{colors.ink}` sur
  `{colors.parchment}`) ; le fond `{colors.parchment}` (plutôt qu'un blanc
  pur) évoque le carnet de jeu sans tomber dans le pastiche médiéval-fantasy.
- Un unique accent chaud `{colors.accent-gold}` pour tout ce qui est
  "résultat de jeu notable" : jets de dés, badges d'invitation, éléments à
  valider.
- Sémantique de jeu clairement séparée de la sémantique UI générique :
  `{colors.danger}` = dégâts/échec, `{colors.success}` = soin/réussite,
  `{colors.accent-blood}` réservé au strict marquage "PV critiques" sur la
  fiche perso — jamais utilisé ailleurs.
- Coins arrondis modestes (`{rounded.md}` = 10px) plutôt que la pilule totale
  de Nike — un JdR n'est pas un e-commerce, l'interface doit rester lisible
  longtemps (sessions de plusieurs heures), pas "cliquable et vendeuse".
- Grille 8px identique à la méthode Nike, rythme de section à
  `{spacing.section}` (48px) desktop, resserré à 24px en mobile — cohérent
  avec l'usage mobile-first (iPad/iPhone en famille).

## Colors

### Encre & Surface

- **Ink** (`{colors.ink}` — `#14110f`) : texte primaire, boutons primaires,
  contours de carte. La seule couleur "forte" du chrome, au même rôle que
  `{colors.ink}` chez Nike.
- **Canvas / Parchment** (`{colors.canvas}`, `{colors.parchment}` —
  `#f7f2ea`/`#efe6d6`) : fond d'app et fond de carte/panneaux respectivement.
  Le parchemin très légèrement teinté évite le blanc pur froid tout en
  restant sobre — ce n'est **pas** une texture de parchemin illustrée, juste
  un ton de fond.
- **Slate / Ash / Mute** (`#3a352f` / `#57514a` / `#83796d`) : hiérarchie de
  texte secondaire, identique en usage à charcoal/ash/mute chez Nike.
- **Hairline / Hairline Soft** (`#d8cdb8` / `#e8e0d0`) : séparateurs de
  liste de parties, bordures de carte de personnage.

### Sémantique de jeu

- **Danger** (`{colors.danger}` — `#a3231f`) : dégâts subis, échec de jet,
  action destructive (quitter une partie).
- **Success** (`{colors.success}` — `#2f6b4f`) : soin, réussite de jet,
  confirmation.
- **Info** (`{colors.info}` — `#2d5580`) : information neutre (statut "en
  attente", aide contextuelle).
- **Accent Gold** (`{colors.accent-gold}` — `#b08a2e`) : jets de dés
  affichés, badge de code d'invitation, éléments "en attente de validation"
  (deltas de fiche proposés). C'est l'unique accent chaud du système — s'il
  apparaît deux fois dans le même écran pour deux significations
  différentes, c'est un signal que le composant est mal choisi.
- **Accent Blood** (`{colors.accent-blood}` — `#7a1d1a`) : réservé
  exclusivement à `{component.character-stat-bar-critical}` (PV sous un
  seuil critique). Ne jamais l'utiliser pour un bouton ou un badge générique.

## Typography

### Familles

- **serif-display** : titre d'écran d'accueil, nom de partie en en-tête —
  seule occurrence du serif dans tout le système. Sert à évoquer un
  "titre de chapitre" sans aller vers une fonte gothique/fantasy cliché.
  Substitut libre : **Fraunces** ou **Lora** (600).
- **sans-ui** : boutons, titres de section, labels. Substitut libre :
  **Inter** (500/600).
- **sans-body** : narration, descriptions, corps de texte long — c'est la
  police la plus lue de l'app (les scènes narrées peuvent être longues), elle
  doit rester très lisible. Substitut libre : **Source Serif 4** ou **Inter**
  selon préférence de lisibilité longue durée (à trancher en `design-check`).
- **mono-ui** : uniquement `{component.dice-roll-chip}` ("d20+3 = 17") — la
  monospace signale "ceci est un résultat mécanique, pas de la narration".

### Hiérarchie

| Token                        | Taille | Poids | Usage                                                              |
| ----------------------------- | ------ | ----- | -------------------------------------------------------------------- |
| `{typography.display-title}` | 40px   | 600   | Titre d'accueil, nom de la partie en en-tête de session              |
| `{typography.heading-xl}`    | 26px   | 600   | Titre d'écran ("Mes parties", "Créer un personnage")                 |
| `{typography.heading-lg}`    | 20px   | 600   | Titre de carte/section (nom du JdR, titre de scène)                  |
| `{typography.heading-md}`    | 16px   | 600   | Sous-titre, en-tête de groupe de stats                               |
| `{typography.body-md}`       | 16px   | 400   | Narration, texte de scène, descriptions                              |
| `{typography.body-strong}`   | 16px   | 600   | Nom de personnage, label d'action                                    |
| `{typography.button-md}`     | 16px   | 600   | CTA standard                                                          |
| `{typography.button-sm}`     | 14px   | 600   | CTA compact (actions de fiche, filtres)                              |
| `{typography.link-md}`       | 16px   | 600   | Lien souligné inline                                                 |
| `{typography.caption-md}`    | 14px   | 500   | Métadonnées (nom de JdR sous le titre de partie, timestamp de tour)  |
| `{typography.caption-sm}`    | 12px   | 500   | Labels de badge, compteur                                            |
| `{typography.label-dice}`    | 14px   | 700   | Résultat de jet de dé (mono), ex. `d20+3 = 17`                       |
| `{typography.utility-xs}`    | 11px   | 500   | Mentions techniques (quota restant, version de règles)               |

### Principes

Même logique de contraste que la référence Nike : un saut net entre
`{typography.heading-xl}` (26px) et `{typography.body-md}`/`{typography.body-strong}`
(16px), sans palier intermédiaire artificiel. `{typography.display-title}`
reste rare — un écran ne doit jamais en contenir plus d'une occurrence.

## Layout

- **Base 8px**, tokens identiques en esprit à la référence (`{spacing.xxs}`
  à `{spacing.section}`).
- **Mobile-first strict** : la mise en page est conçue d'abord pour ~380px
  de large (iPhone/iPad en portrait), puis étendue — pas l'inverse. Colonnes
  uniques par défaut ; la grille 2-3 colonnes n'apparaît qu'à partir de
  `tablet` (voir Responsive Behavior).
- **Rythme de section** : `{spacing.section}` (48px) desktop entre blocs
  majeurs (liste de parties → carte en cours → journal de tour), resserré à
  24px mobile.
- **Zone de carte du monde** : plein cadre, sans marge interne — l'image
  générée touche les bords de son conteneur comme la photographie produit
  chez Nike touche les bords de sa card. C'est la seule zone de l'app
  autorisée à "respirer" visuellement plus que la grille stricte.

## Elevation & Depth

| Niveau                | Traitement                                          | Usage                                                          |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| 0 — Plat               | Aucune ombre                                         | Traitement par défaut, comme la référence                        |
| 1 — Trait fin          | 1px solid `{colors.hairline}`                        | Séparateurs de liste de parties, lignes de fiche perso            |
| 2 — Carte surélevée    | `box-shadow: 0 1px 3px rgba(20,17,15,0.08)`          | `{component.game-card}` et `{component.delta-proposal-card}` uniquement — la seule ombre du système, réservée aux éléments qui demandent une action de l'utilisateur (rejoindre une partie, valider un delta) |

Contrairement à la référence Nike (zéro ombre du tout), on s'autorise **une**
ombre légère, mais volontairement limitée aux deux composants qui appellent
une décision utilisateur — pour les distinguer visuellement du contenu
purement informatif.

## Shapes

| Token            | Valeur | Usage                                                                 |
| ---------------- | ------ | ------------------------------------------------------------------------ |
| `{rounded.none}` | 0px    | Image de carte du monde, bandeau de statut de session                   |
| `{rounded.sm}`   | 6px    | Champs de saisie, badges                                                 |
| `{rounded.md}`   | 10px   | Cards (partie, personnage, proposition de delta)                         |
| `{rounded.lg}`   | 16px   | Boutons primaires/secondaires                                            |
| `{rounded.full}` | 9999px | Icônes rondes, pin de carte, badge de code d'invitation, chip de jet de dé |

## Components

### Boutons

**`button-primary`** — action principale (Soumettre une action, Créer une
partie, Valider les deltas)
- `backgroundColor: {colors.ink}`, `textColor: {colors.on-primary}`,
  `{typography.button-md}`, `padding: 14px 24px`, `rounded: {rounded.lg}`.
- Une seule occurrence par écran, comme la règle Nike sur `button-primary`.

**`button-secondary`** — alternative basse emphase
- `backgroundColor: {colors.canvas}`, bordure 1px `{colors.hairline}`,
  `textColor: {colors.ink}`, `{typography.button-md}`, `rounded: {rounded.lg}`.

**`button-danger`** — action destructive (quitter une partie, refuser un
delta)
- `backgroundColor: {colors.canvas}`, `textColor: {colors.danger}`, bordure
  1px `{colors.danger}`, `{typography.button-md}`, `rounded: {rounded.lg}`.

**`button-icon-circular`** — contrôles d'icône (retour, paramètres de
partie, zoom carte)
- `backgroundColor: {colors.parchment}`, icône `{colors.ink}`,
  `rounded: {rounded.full}`, taille 40px.

### Jeu — composants spécifiques

**`character-stat-bar`** + **`character-stat-bar-critical`**
- Barre horizontale (PV, mana, etc.), fond `{colors.hairline-soft}`, remplissage
  `{colors.success}` par défaut.
- Variante `critical` (sous un seuil défini par le JdR) : remplissage
  `{colors.accent-blood}` + label en `{typography.body-strong}`
  `{colors.accent-blood}`. Seule utilisation autorisée de `accent-blood`.

**`dice-roll-chip`**
- `backgroundColor: {colors.ink}`, `textColor: {colors.accent-gold}`,
  `{typography.label-dice}` (mono), `rounded: {rounded.full}`,
  `padding: 4px 12px`.
- Affiche le jet brut ("d20+3 = 17") juste avant la ligne de narration
  correspondante dans le journal de tour.

**`delta-proposal-card`**
- `backgroundColor: {colors.canvas}`, bordure 1px `{colors.accent-gold}`,
  élévation niveau 2, `rounded: {rounded.md}`.
- Liste les deltas proposés par le LLM (ex: "PV -12", "+ Épée rouillée") avec
  deux `button-primary`/`button-danger` ("Valider" / "Ignorer") en pied de
  carte. Ne disparaît qu'après action explicite de l'utilisateur.

**`session-status-pill`** (+ variantes `-waiting`, `-resolving`)
- `rounded: {rounded.full}`, `{typography.caption-sm}`, `padding: 4px 12px`.
- `waiting` : fond `{colors.hairline-soft}`, texte `{colors.ink}` — "2/4
  joueurs ont soumis".
- `resolving` : fond `{colors.accent-gold-soft}`, texte `{colors.ink}` —
  "Le MJ résout la scène..." (état transitoire pendant l'appel LLM).

**`game-card`** — carte de partie dans la liste "Mes parties"
- `backgroundColor: {colors.canvas}`, `rounded: {rounded.md}`, élévation
  niveau 2, `padding: 16px`.
- Contenu : nom du JdR (`{typography.heading-md}`), nom de partie
  (`{typography.body-strong}`), `{component.session-status-pill}`, dernière
  activité (`{typography.caption-sm}` `{colors.mute}`).

**`map-pin`** + **`map-pin-active`**
- Marqueur rond 20px, `rounded: {rounded.full}`, fond `{colors.ink}`,
  contour 2px `{colors.on-primary}`.
- `active` (lieu sélectionné) : fond `{colors.accent-gold}`, léger
  agrandissement (24px) — pas d'animation complexe, juste un changement de
  taille/couleur net.

**`invite-code-badge`**
- `backgroundColor: {colors.accent-gold-soft}`, `textColor: {colors.ink}`,
  `{typography.label-dice}` (mono, pour la lisibilité d'un code type
  `XK4R2P`), `rounded: {rounded.full}`, `padding: 6px 14px`.

**`turn-log-entry`**
- Pas de card/bordure — entrée de journal en flux continu.
- Structure : auteur (`{typography.body-strong}`) → action soumise
  (`{typography.body-md}` `{colors.mute}`) → `{component.dice-roll-chip}` si
  applicable → narration du MJ (`{typography.body-md}` `{colors.ink}`).
- Séparateur 1px `{colors.hairline}` entre chaque tour.

**`admin-badge-children`**
- Petit badge `{typography.caption-sm}`, fond `{colors.success}`,
  `textColor: {colors.on-primary}`, `rounded: {rounded.sm}` — marque un JdR
  "adapté enfants" dans le catalogue admin. Jamais visible côté joueur (pas
  besoin de l'exposer, c'est un filtre d'accès, pas une info de jeu).

**`quota-meter`**
- Barre fine (4px), fond `{colors.hairline-soft}`, remplissage
  `{colors.info}` sous 80% d'usage, `{colors.danger}` au-delà — visible côté
  admin uniquement pour surveiller le quota d'appels LLM/jour.

### Formulaires

**`action-input`** + **`action-input-focused`**
- Zone de texte pour soumettre une action de tour. Défaut : fond
  `{colors.canvas}`, bordure 1px `{colors.hairline}`, `rounded: {rounded.sm}`,
  `{typography.body-md}`.
- Focus : bordure 2px `{colors.ink}`. Pas de halo décoratif (contrairement à
  la référence Nike) — le contexte de jeu demande une interface qui ne
  distrait pas pendant l'écriture d'une action.

## Do's and Don'ts

### Do

- Réserver `{typography.display-title}` au titre d'accueil et au nom de
  partie en en-tête — jamais pour un titre de section courant.
- Laisser la carte du monde être la seule zone de l'app à porter une image
  plein cadre et de la couleur "libre" (non tokenisée).
- Garder `{colors.accent-gold}` pour une seule famille de sens : "résultat
  de jeu notable / en attente de validation".
- Afficher systématiquement un `{component.dice-roll-chip}` avant la
  narration qui en découle, jamais après.
- Garder `{component.delta-proposal-card}` visible jusqu'à action explicite
  de l'utilisateur — jamais d'auto-dismiss après un délai.

### Don't

- Ne pas introduire de texture "parchemin illustré" ou de fonte gothique
  décorative — le ton reste sobre, `{colors.parchment}` est un ton de fond,
  pas un pastiche visuel.
- Ne pas utiliser `{colors.accent-blood}` ailleurs que sur
  `{component.character-stat-bar-critical}`.
- Ne pas appliquer d'élévation (ombre) à autre chose que `{component.game-card}`
  et `{component.delta-proposal-card}`.
- Ne pas faire clignoter/animer `{component.session-status-pill-resolving}`
  de façon insistante — un changement d'état net suffit, l'app n'a pas
  besoin de "vendre" l'attente.
- Ne pas dupliquer la sémantique dice/damage : un jet raté qui inflige des
  dégâts reste UN SEUL `{component.dice-roll-chip}` suivi d'UNE seule barre
  `{component.character-stat-bar}` qui se met à jour — pas deux signaux
  redondants.

## Responsive Behavior

| Nom              | Largeur     | Changements clés                                                        |
| ----------------- | ----------- | --------------------------------------------------------------------------- |
| mobile            | 320–599px   | Colonne unique, `{typography.display-title}` réduit à 28px, carte du monde en plein écran (modale dédiée plutôt qu'inline) |
| tablet            | 600–1023px  | 2 colonnes possibles (liste de parties + détail), carte du monde inline avec la fiche perso repliable |
| desktop           | 1024px+     | 3 zones simultanées : liste de parties / journal de tour + saisie d'action / fiche perso + carte |

### Cibles tactiles

Tous les éléments interactifs respectent un minimum 44×44px, cohérent avec
un usage principal sur iPad/iPhone. `{component.button-icon-circular}` est à
40px avec zone de tap étendue à 48px via padding invisible, comme la
référence Nike sur ses paddles de carrousel.

## Iteration Guide

1. Avant d'ajouter un composant, vérifie s'il peut s'exprimer avec le
   vocabulaire existant (card + pill + trait fin) — comme pour la référence,
   la force du système est de ne presque jamais avoir besoin d'un nouveau
   token.
2. Toute nouvelle couleur sémantique de jeu doit être justifiée par un
   usage réel identifié dans `PRD.md`, pas ajoutée par anticipation.
3. Garder `{colors.accent-gold}` rare par écran — s'il apparaît plus de deux
   fois dans le même fold pour des raisons différentes, neutraliser l'une
   des deux occurrences.
4. La carte du monde ne doit jamais recevoir de token de couleur du système
   — elle reste l'image générée telle quelle, cadrée sans filtre appliqué.

## Known Gaps

- **États de connexion/déconnexion en partie** (joueur hors-ligne pendant le
  polling) non spécifiés — à définir lors de la tâche `03-session-engine`.
- **Écran d'onboarding PWA/Web Push** (explication "Ajouter à l'écran
  d'accueil") non maquetté — nécessaire vu la contrainte iOS documentée dans
  `PRD.md`.
- **Dark mode** non spécifié — à trancher séparément si besoin (usage
  familial en soirée pourrait le justifier).
