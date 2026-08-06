# Troubleshooting Runbook

Common symptoms and fixes for the Docker deployment.

## Stack won't start

| Symptom | Cause / fix |
|---------|-------------|
| `backend` keeps restarting | DB not ready yet → wait for `db` health check (`docker compose logs -f db`); or wrong `POSTGRES_PASSWORD` in `.env` |
| `port is already allocated` | Another process uses 80/443 → stop it or change `NGINX_PORT` in `.env` |
| `Error response from daemon: pull access denied` | Image tag wrong → rebuild locally: `docker compose -f docker-compose.prod.yml build` |
| Backend log: `Environment variable not found: DATABASE_URL` | `.env` missing or not sourced → `cp .env.example .env`, then `docker compose down && docker compose up -d` |
| Backend log: `P1010 user does not exist` | DB user/password mismatch → fix `.env`, recreate volume only if desired: `docker compose down -v && docker compose up -d` |

## Login problems

| Symptom | Cause / fix |
|---------|-------------|
| `Account is locked` | 5 failed attempts → wait 15 min, or reset via admin: `PATCH /admin/users/:id/active` + `reset-password` |
| `Invalid username or password` | Wrong creds; or user is `isActive=false` (admin disabled it) |
| Login works but instantly logs out | Access token expired & refresh cookie blocked → ensure cookies are allowed for the domain, `Secure` cookie requires HTTPS |
| CAPTCHA rejected | The placeholder expects a 4–6 alphanumeric code; replace with a real reCAPTCHA/hCaptcha integration before production |

## HTTPS / certificates

| Symptom | Cause / fix |
|---------|-------------|
| `certbot: HTTP-01 ... domain name does not resolve` | DNS A record not live yet → wait and re-run `./scripts/certbot-init.sh` |
| `unable to verify ACME challenge` | Port 80 blocked → open it, or another server holds 80 → stop it temporarily |
| Site loads but browser warns | Certs not issued → `certbot/conf/live/<domain>` missing; re-run certbot |
| Certs expired | The `certbot` service (profile `tls`) renews automatically; also `docker compose -f docker-compose.prod.yml run --rm certbot renew` |

## QR codes

| Symptom | Cause / fix |
|---------|-------------|
| QR download 400 | Filename invalid → regenerate the page QR (delete + recreate page) |
| QR points to `localhost` | `PUBLIC_BASE_URL` wrong → set `https://$DOMAIN` in `.env` and redeploy |

## Performance

| Symptom | Cause / fix |
|---------|-------------|
| Slow first paint | Images/CSS cached by Nginx; add `proxy_cache` for static assets if needed |
| DB saturation | Views counter uses `UPDATE` per view → index exists (`pages_slug_idx`); for heavy traffic, move to a queue/worker |

## Reset / reinstall

```bash
docker compose down            # stop
docker compose down -v         # stop + DELETE all volumes (db + qr) ⚠️
rm -f .env                     # fresh env next deploy
./scripts/deploy.sh            # fresh start
```

## Useful diagnostics

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
curl -s http://localhost/api/v1/health
./scripts/healthcheck.sh
```