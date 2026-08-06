#!/usr/bin/env bash
# ============================================================================
# Interactive environment setup helper.
#   ./scripts/setup-env.sh
# Copies .env.example → .env (if needed) and prompts for the key settings.
# ============================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

[ -f .env ] || cp .env.example .env
warn() { echo -e "\033[33m!\033[0m $*"; }
info() { echo -e "\033[34m>\033[0m $*"; }

ask() { # ask <var> <prompt> <default>
  local var="$1" prompt="$2" default="${3:-}"
  local val=""
  read -r -p "$prompt [$default]: " val
  val="${val:-$default}"
  sed -i.bak "s|^${var}=.*|${var}=${val}|" .env && rm -f .env.bak
}

info "Leave blank to keep defaults. Secrets with 'change-me' are auto-generated on deploy."
ask DOMAIN "Public domain (e.g. app.example.com)" "${DOMAIN:-example.com}"
ask LETSENCRYPT_EMAIL "Let's Encrypt contact e-mail" "${LETSENCRYPT_EMAIL:-admin@example.com}"
ask POSTGRES_DB "Database name" "${POSTGRES_DB:-neonpages}"
ask POSTGRES_USER "Database user" "${POSTGRES_USER:-neonpages}"
ask JWT_ACCESS_EXPIRES_IN "Access token lifetime" "${JWT_ACCESS_EXPIRES_IN:-15m}"
ask JWT_REFRESH_EXPIRES_IN "Refresh token lifetime" "${JWT_REFRESH_EXPIRES_IN:-7d}"
ask SEED_ADMIN_PASSWORD "Seed admin password" "${SEED_ADMIN_PASSWORD:-Admin@12345}"
ask SEED_USER_PASSWORD "Seed demo-user password" "${SEED_USER_PASSWORD:-User@12345}"

info "Done. Edit .env for advanced settings, then run ./scripts/deploy.sh"