#!/usr/bin/env bash
# ============================================================================
# Database and volume backup helper.
#   ./scripts/backup.sh [output-dir]
# Dumps the Postgres database to a timestamped SQL file and copies uploaded
# QR files from the volume. Restore example:
#   cat backup.sql | docker compose exec -T db psql -U <user> <db>
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT="${1:-./backups}"
mkdir -p "$OUT"
STAMP="$(date -u +%Y%m%d_%H%M%S)"

[ -f .env ] && { set -a; source .env; set +a; }
COMPOSE="docker compose"
[ -f docker-compose.prod.yml ] && [ "${NODE_ENV:-}" = "production" ] && COMPOSE_FILE="docker-compose.prod.yml" || COMPOSE_FILE="docker-compose.yml"

DB="${POSTGRES_DB:-neonpages}"
USER="${POSTGRES_USER:-neonpages}"

info() { echo -e "\033[34m[backup]\033[0m $*"; }

# Dump the database
info "Dumping database '${DB}'…"
$COMPOSE -f "$COMPOSE_FILE" exec -T db pg_dump -U "$USER" "$DB" > "$OUT/${DB}_${STAMP}.sql"
echo "✓ SQL dump → $OUT/${DB}_${STAMP}.sql"

# Copy QR files from the QR volume
QR_DIR="${QR_STORAGE_DIR:-uploads}"
if docker volume ls | grep -q qr-files; then
  info "Copying QR uploads…"
  docker run --rm -v qr-files:/src -v "$PWD/$OUT":/dst alpine sh -c \
    "cp -r /src/* /dst/qr_${STAMP}/ 2>/dev/null" || true
  if [ -d "$OUT/qr_${STAMP}" ]; then echo "    Files → $OUT/qr_${STAMP}"; fi
fi

echo "✓ Backup complete → $OUT"
echo "  Restore DB:  ${COMPOSE} -f \"$COMPOSE_FILE\" exec -T db psql -U $USER $DB < $OUT/${DB}_${STAMP}.sql"