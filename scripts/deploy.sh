#!/usr/bin/env bash
# ============================================================================
# Neon Pages — SINGLE deployment script
#
#   ./scripts/deploy.sh
#
# One command that:
#   1. verifies prerequisites (docker, docker compose, git, openssl)
#   2. prepares ./backend/.env and ./frontend/.env (from examples, if missing)
#   3. generates strong secrets when placeholders are detected
#   4. optionally enables HTTPS (obtains Let's Encrypt certificates via Certbot)
#   5. builds and starts the complete stack (db + backend + frontend + nginx)
#   6. waits for the API and frontend health checks
#   7. prints the summary with URLs and default accounts
#
# Run as a regular user; add yourself to the `docker` group if needed.
# ============================================================================
set -euo pipefail

# ------------------------------------------------ helpers
C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'; C_BLU=$'\033[34m'; C_RST=$'\033[0m'
info()  { echo -e "${C_BLU}[deploy]${C_RST} $*"; }
ok()    { echo -e "${C_GRN}[deploy]✓${C_RST} $*"; }
warn()  { echo -e "${C_YEL}[deploy]!${C_RST} $*"; }
fail()  { echo -e "${C_RED}[deploy]✗ $*${C_RST}" >&2; exit 1; }
is_secret() { case "$1" in change-me*|''|dev-only*|*secret) return 0;; *) return 1;; esac; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ---------------------------------------------------------------- prereqs
command -v docker >/dev/null 2>&1 || fail "docker is not installed (see docs/INSTALLATION.md)."
docker compose version >/dev/null 2>&1 || \
  docker-compose version >/dev/null 2>&1 || fail "docker compose plugin not available."
command -v openssl >/dev/null 2>&1 || fail "openssl is required to generate secrets."

info "Deploying Neon Pages from $ROOT"

# ---------------------------------------------------------------- env setup
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from template — review and set your values."
fi

# Export the vars so compose interpolates them
set -a; source .env; set +a

# Generate secrets where placeholders remain
changed_secrets=0
for var in JWT_ACCESS_SECRET JWT_REFRESH_SECRET; do
  value="${!var:-}"
  if is_secret "$value"; then
    gen="$(openssl rand -base64 48 | tr -d '\n')"
    if grep -q "^${var}=" .env; then
      sed -i.bak "s|^${var}=.*|${var}=${gen}|" .env && rm -f .env.bak
    else
      echo "${var}=${gen}" >> .env
    fi
    info "Generated strong ${var} (was a placeholder)."
    changed_secrets=1
  fi
done
[ "$changed_secrets" = "1" ] && set -a; source .env; set +a

# NEON the db password if still a placeholder
if is_secret "${POSTGRES_PASSWORD:-}"; then
  gen="$(openssl rand -hex 24)"
  sed -i.bak "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${gen}|" .env && rm -f .env.bak
  set -a; source .env; set +a
  info "Generated strong POSTGRES_PASSWORD."
fi

DOMAIN="${DOMAIN:-}"
COMPOSE_FILE="docker-compose.yml"
if [ "${USE_HTTPS:-false}" = "true" ] || [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ] && [ "$DOMAIN" != "example.com" ]; then
  COMPOSE_FILE="docker-compose.prod.yml"
  ok "Production mode selected (domain: $DOMAIN, HTTPS)."
else
  warn "Default HTTP mode (DOMAIN not a real FQDN). Using docker-compose.yml."
fi

if command -v docker-compose >/dev/null 2>&1 && ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  COMPOSE="docker compose"
fi

# ---------------------------------------------------------------- HTTPS (optional)
if [ "$COMPOSE_FILE" = "docker-compose.prod.yml" ]; then
  if [ ! -d certbot/conf/live ]; then
    info "Enabling HTTPS with Let's Encrypt…"
    mkdir -p certbot/www certbot/conf
    # Obtain the certificate using the standalone challenge via the compose net
    docker run --rm \
      -v "$PWD/certbot/www:/var/www/certbot" \
      -v "$PWD/certbot/conf:/etc/letsencrypt" \
      -p 80:80 \
      certbot/certbot certonly --standalone --non-interactive --agree-tos \
        --email "$LETSENCRYPT_EMAIL" -d "$DOMAIN" || warn "Certbot failed — run scripts/certbot-init.sh after DNS is live."
  else
    ok "Existing certificate found for $DOMAIN."
  fi

  # Render the HTTPS nginx config for this domain
  sed "s/__DOMAIN__/${DOMAIN}/g" nginx/conf.d/prod-https.conf.template > nginx/conf.d/prod-https.conf
  ok "Rendered nginx HTTPS config for $DOMAIN."
fi

# ---------------------------------------------------------------- build & start
info "Building and starting the stack ($COMPOSE_FILE)…"
${COMPOSE} -f "$COMPOSE_FILE" up -d --build --remove-orphans

# ---------------------------------------------------------------- migrations & seed
info "Applying database migrations and seed data…"
# Wait for migrations to complete by watching the backend logs
set +e
${COMPOSE} -f "$COMPOSE_FILE" exec -T backend sh -c \
  "npx prisma migrate deploy && npx ts-node --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts" 2>/dev/null || \
${COMPOSE} -f "$COMPOSE_FILE" run --rm backend sh -c \
  "npx prisma migrate deploy && npx ts-node --compiler-options '{\"module\":\"commonjs\"}' prisma/seed.ts"
set -e

# ---------------------------------------------------------------- health check
info "Waiting for services to become healthy…"
for service in backend frontend; do
  for i in $(seq 1 40); do
    cid="$(${COMPOSE} -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null || true)"
    if [ -n "$cid" ]; then
      health="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || true)"
      if [ "$health" = "healthy" ]; then ok "$service is healthy."; break; fi
    fi
    [ "$i" = "40" ] && warn "$service not healthy yet — check ${COMPOSE} -f \"$COMPOSE_FILE\" logs -f $service"
    sleep 3
  done
done

# ---------------------------------------------------------------- summary
BASE="${PUBLIC_BASE_URL:-http://localhost}"
echo
echo "════════════════════════════════════════════════════════════"
echo "  Neon Pages deployed"
echo "════════════════════════════════════════════════════════════"
echo "  Frontend : $BASE"
echo "  API      : $BASE/api/v1"
echo "  Swagger  : $BASE/api/v1/docs"
echo "  Health   : $BASE/api/v1/health"
echo "  Admin    : $BASE/admin    (admin / ${SEED_ADMIN_PASSWORD:-Admin@12345})"
echo "  User     : $BASE/dashboard (demo  / ${SEED_USER_PASSWORD:-User@12345})"
echo "────────────────────────────────────────────────────────────"
echo "  Manage   : ${COMPOSE} -f \"$COMPOSE_FILE\""
echo "  Logs     : ${COMPOSE} -f \"$COMPOSE_FILE\" logs -f"
echo "  Stop     : ${COMPOSE} -f \"$COMPOSE_FILE\" down"
echo "  Reset    : ${COMPOSE} -f \"$COMPOSE_FILE\" down -v   (⚠ deletes data)"
echo "════════════════════════════════════════════════════════════"