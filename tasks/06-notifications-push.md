# 06 — Notifications push (PWA + Web Push)

**Dépend de** : `00-scaffold-monorepo` (mergé), l'entité `GameSession`
publiée tôt par `03-session-engine` (même note de coordination que
`05-world-map`).
**Parallélisable avec** : `03-session-engine` (une fois l'entité publiée),
`05-world-map`.

## Objectif

Rendre l'app installable en PWA et envoyer une notification push quand
c'est au tour d'un joueur d'agir, ou quand une scène vient d'être résolue —
seul mécanisme retenu pour prévenir rapidement les joueurs (voir `PRD.md`).
Rappel important : sur iOS/iPadOS, le push ne fonctionne **que** si l'app
est installée via "Ajouter à l'écran d'accueil" — ce n'est pas une option
technique, c'est une contrainte Apple à documenter clairement pour
l'utilisateur.

## Périmètre

- `frontend/` :
  - `manifest.json` PWA (nom, icônes, `display: standalone`, thème
    cohérent avec `DESIGN.md`).
  - Service worker : cache minimal pour l'installabilité + gestion des
    événements `push` et `notificationclick` (redirection vers la partie
    concernée).
  - Écran/bandeau d'onboarding expliquant "Ajoute cette app à ton écran
    d'accueil pour recevoir les notifications" avec instructions adaptées
    iOS/Android (détection simple de plateforme).
  - Écran de gestion des notifications (activer/désactiver, visible dans
    les paramètres du compte).
- `backend/src/domain/` : port `PushNotificationPort`
  (`send(subscription, payload): Promise<void>`), entité
  `PushSubscription` (`id`, `userId`, `endpoint`, `keys` (p256dh/auth),
  `createdAt`).
- `backend/src/application/` : `RegisterPushSubscriptionUseCase`,
  `NotifyPlayersTurnPendingUseCase` (appelé depuis `03-session-engine` —
  ajouter le point d'appel dans `SubmitTurnActionUseCase`/
  `ResolveSceneUseCase` sans dupliquer leur logique, via un événement
  domaine simple type `TurnResolvedEvent`/`WaitingForPlayerEvent` — utiliser
  l'`EventEmitter` de NestJS plutôt qu'un couplage direct entre modules).
- `backend/src/infrastructure/` : `WebPushAdapter` (librairie `web-push`,
  clés VAPID en config), `TypeOrmPushSubscriptionRepository`.
- `backend/src/interfaces/http/` :
  `POST /api/push-subscriptions` (enregistrement d'un abonnement navigateur),
  `DELETE /api/push-subscriptions/:id`.

## Détail

- Générer une paire de clés VAPID une fois (script ou commande dev),
  documenter dans le README comment les régénérer/stocker dans
  1Password aux côtés des autres secrets du projet.
- Le contenu de la notification reste minimal (pas de contenu narratif
  sensible dans le payload push, qui peut transiter par des systèmes tiers
  selon navigateur) — ex: "C'est ton tour dans [nom de partie]".
- Découpler proprement de `03-session-engine` : cette tâche ne doit pas
  modifier directement `SubmitTurnActionUseCase`, mais s'abonner à un
  événement émis par lui. Si l'événement n'existe pas encore au moment de
  cette tâche, l'ajouter en modification minimale isolée (un seul appel
  `eventEmitter.emit(...)`) plutôt que de restructurer le use-case.

## Critères d'acceptation

- L'app passe l'audit d'installabilité PWA basique (manifest valide, service
  worker enregistré, icônes présentes).
- Un abonnement push enregistré reçoit effectivement une notification lors
  d'un événement `WaitingForPlayerEvent` (test manuel documenté, ou test
  d'intégration avec `WebPushAdapter` mocké).
- Désinscription (`DELETE`) arrête bien l'envoi de notifications futures à
  cet abonnement.

## Hors périmètre

- Notification par email (non retenu, voir `PRD.md` — Resend disponible
  mais explicitement écarté pour ce besoin).
- Notification tierce type OneSignal (explicitement écarté, voir `PRD.md`).
