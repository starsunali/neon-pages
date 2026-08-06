#!/usr/bin/env bash
# ============================================================================
# Obtain renew / Let's Encrypt certificates for the HTTPS nginx config.
#   ./scripts/certbot-init.sh
# Requirements: DNS A record for $DOMAIN must resolve to this server,
# and the container `nginx` must not already hold port 80.
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f .env ] || { echo "Missing .env — run ./scripts/setup-env.sh first."; exit 1; }
set -a; source .env; set +a
DOMAIN="${DOMAIN:-example.com}"

docker run --rm \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -p 80:80 \
  certbot/certbot certonly --standalone --non-interactive --agree-tos \
    --email "$LETSENCRYPT_EMAIL" -d "$DOMAIN"

# Render the HTTPS config for the domain
sed "s/__DOMAIN__/${DOMAIN}/g" nginx/conf.d/prod-https.conf.template > nginx/conf.d/prod-https.conf
echo "✓ Certificate ready for $DOMAIN. Start the stack with docker compose -f docker-compose.prod.yml up -d"