#!/bin/sh
set -e

DEPLOY_DIR="${DEPLOY_DIR:-/opt/jdr}"
IMAGE="${IMAGE:-ghcr.io/slobodafr/home-jdr}"

cd "$DEPLOY_DIR/deploy"

export IMAGE
export IMAGE_TAG

# Convention harnais image-retention : AVANT le pull, fait de la place (garde 1 image du service en plus de celle en cours).
sh "$DEPLOY_DIR/deploy/scripts/prune-service-images.sh" --phase pre \
  --service jdr --image ghcr.io/slobodafr/home-jdr --tag "$IMAGE_TAG" --project jdr

docker compose pull
# Convention harnais docker-nonroot-volume : l'image tourne en uid 1000 mais le volume de donnees existant appartient a root
# (cree par l'ancienne image). Le service est arrete puis le volume rendu a 1000:1000, avant le `up`. Idempotent.
# ORDRE (non verifie par l'audit) : la sauvegarde pre-deploy-backup tourne AVANT ce script (deploy-vps.yml, sous le meme
# verrou d'hote) ; ne jamais deplacer ce chown avant elle, ni apres compose-up-healthy.sh. `set -e` : pas de `||`.
sh "$DEPLOY_DIR/deploy/scripts/fix-volume-owner.sh" --service jdr \
  --project jdr --volume jdr-data --stop jdr
# Convention harnais deploy-wait-healthy : `docker compose up -d --wait` (repli : boucle docker inspect) ; un conteneur
# qui n'est pas sain après 180 s fait échouer le déploiement (logs, sauvegarde et restauration affichées), sans retour arrière automatique.
sh "$DEPLOY_DIR/deploy/scripts/compose-up-healthy.sh" --service jdr \
  --restore-args "--project jdr --volume jdr-data --mount /app/backend/data --db-path ${DATABASE_PATH:-/app/backend/data/jdr.sqlite}" \
  -- --remove-orphans
# Convention harnais image-retention : APRÈS un déploiement sain uniquement (set -e), garde la courante + la précédente.
sh "$DEPLOY_DIR/deploy/scripts/prune-service-images.sh" --phase post \
  --service jdr --image ghcr.io/slobodafr/home-jdr --tag "$IMAGE_TAG" --project jdr

if ! command -v caddy >/dev/null 2>&1; then
  sudo apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt-get update -qq
  sudo apt-get install -y -qq caddy
fi

sudo mkdir -p /etc/caddy/sites
sudo cp "$DEPLOY_DIR/deploy/Caddyfile" /etc/caddy/sites/jdr.Caddyfile

if ! grep -q '^import sites/\*$' /etc/caddy/Caddyfile 2>/dev/null; then
  echo 'import sites/*' | sudo tee -a /etc/caddy/Caddyfile >/dev/null
fi

sudo caddy validate --config /etc/caddy/Caddyfile

sudo systemctl reload caddy
