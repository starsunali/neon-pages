# Deployment Guide

Production deployment of Neon Pages — a **fully containerized** stack of **PostgreSQL + NestJS API + Next.js frontend + Nginx** with optional HTTPS.

---

## 1. Target layout (on the server)

```
/opt/neon-pages/
├── .env                      # real secrets (never committed)
├── docker-compose.prod.yml
├── backend/  frontend/  nginx/  scripts/  certbot/  backups/
```

---

## 2. Production steps

### 2.1 Get the code

```bash
sudo mkdir -p /opt/neon-pages && sudo chown $USER /opt/neon-pages
cd /opt/neon-pages
git clone <your-repo-url> .

# Pull the Docker images or build locally
docker compose -f docker-compose.prod.yml build
```

### 2.2 Configure

```bash
cp .env.example .env
./scripts/setup-env.sh          # DOMAIN, e-mail, passwords
# generate strong secrets (the deploy script does this automatically):
#   JWT_ACCESS_SECRET=$(openssl rand -base64 48)
#   JWT_REFRESH_SECRET=$(openssl rand -base64 48)
#   POSTGRES_PASSWORD=$(openssl rand -hex 24)
```

### 2.3 DNS + HTTPS

Point an **A record** for `$DOMAIN` to the server IP, allow inbound **80/443**, then:

```bash
# Option A (automatic, DNS must already resolve):
./scripts/deploy.sh

# Option B (manual cert issuance):
./scripts/certbot-init.sh
docker compose -f docker-compose.prod.yml up -d
```

Certificates are stored in `./certbot/conf` and auto-renewed by the optional `certbot` service (`docker compose --profile tls -f docker-compose.prod.yml up -d certbot`).

### 2.4 Verify

```bash
./scripts/healthcheck.sh
curl -s https://$DOMAIN/api/v1/health   # {"status":"ok","db":"up",...}
```

---

## 3. Zero-downtime updates

```bash
cd /opt/neon-pages
git pull
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f
```

Compose runs new containers while keeping the old ones healthy; the API redone.

---

## 4. Backups

```bash
./scripts/backup.sh ./backups
```

Creates a timestamped Postgres SQL dump plus a copy of the stored QR files. Schedule with cron:

```cron
0 3 * * * /opt/neon-pages/scripts/backup.sh /opt/backups >> /var/log/neon-backup.log 2>&1
```

**Restore** the database:

```bash
docker compose -f docker-compose.prod.yml exec -T db \
  psql -U neonpages neonpages < backups/neonpages_YYYYMMDD_HHMMSS.sql
```

---

## 5. Security hardening checklist

- [ ] Change default `admin` / `demo` passwords.
- [ ] Use generated secrets in `.env`; never commit `.env`.
- [ ] Run behind a firewall; only open ports **80** and **443**.
- [ ] Enable HTTPS + HSTS (done in prod nginx config).
- [ ] Add `CORS_ORIGINS` — only your real domain.
- [ ] Back up `./certbot/conf` and `./.env`.
- [ ] Keep images updated (`docker compose pull` / rebuild regularly).
- [ ] Review audit logs in the admin panel (**Recent activity**).

---

## 6. Production database notes

- Named volume `pgdata` persists the DB across container restarts.
- `docker compose down -v` **deletes all data** — never run it on production.
- Consider an external managed Postgres for very high availability; point `DATABASE_URL` at it and run migrations via `npx prisma migrate deploy`.

---

## 7. Scaling

Add replicas by scaling the stateless services (the API and frontend keep no local state beyond QR uploads, which live in the shared `qr-files` volume):

```bash
docker compose -f docker-compose.prod.yml up -d --scale backend=3 --scale frontend=2
```

A load balancer (or Nginx upstream rotation) then balances across the replicas.