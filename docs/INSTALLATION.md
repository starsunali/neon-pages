# Installation Guide

This guide covers **installation via Docker (recommended)** and the **default `docker-compose`** stack, plus a manual (non-Docker) option for development.

> **Quick start** — the fastest path is the single deploy script:
>
> ```bash
> ./scripts/deploy.sh
> ```
> It prepares your `.env`, generates secrets, builds everything, applies migrations, seeds data, and starts the whole stack.

---

## 1. Prerequisites

- **Docker Engine 24+** and **Docker Desktop / Docker Compose v2+** (`docker compose version`)
- **git** (only for cloning)
- A **domain (DNS A record)** pointing at your server, if you want HTTPS
- Docker Compose is bundled with Docker Desktop. On Linux run `sudo apt-get install docker docker-compose-plugin`.

Verify:

```bash
docker --version
docker compose version
```

---

## 2. Clone the repository

```bash
git clone <your-repo-url> neon-pages
cd neon-pages
```

---

## 3. Docker-based installation (recommended)

### 3.1 Set up your environment

```bash
# One-time interactive setup (copies .env.example → .env and asks for the key values)
./scripts/setup-env.sh

# ...or manually:
cp .env.example .env
nano .env               # set DOMAIN, e-mail, secrets
```

**Important:** use the auto-generated strong values for the JWT secrets and database password. If you leave `change-me-...` placeholders, the deploy script replaces them automatically with `openssl rand`.

### 3.2 Deploy with the single script

```bash
./scripts/deploy.sh
```

The script:

1. verifies Docker + Compose + openssl,
2. creates `.env` from the template if missing and generates strong secrets,
3. selects **`docker-compose.prod.yml`** (HTTPS) when `DOMAIN` is a real FQDN, otherwise falls back to the **default `docker-compose.yml`** (HTTP),
4. builds and starts **PostgreSQL + NestJS API + Next.js + Nginx**,
5. applies Prisma **migrations** and **seed** data,
6. waits for health checks,
7. prints the dashboard URLs and default accounts.

### 3.3 Default `docker-compose.yml` (manual)

The default compose file boots the full stack on port 80 without HTTPS — ideal for a first try or a private/development server.

```bash
# (optional) copy & edit the environment first
cp .env.example .env

# build and start every service (db, backend, frontend, nginx)
docker compose up -d --build

# follow the logs
docker compose logs -f

# stop the stack
docker compose down

# stop AND wipe all data (⚠ destructive)
docker compose down -v
```

| Service  | Purpose                | Internal port |
|----------|------------------------|---------------|
| `db`     | PostgreSQL 16          | 5432          |
| `backend`| NestJS REST API        | 3000          |
| `frontend`| Next.js application    | 3001          |
| `nginx`  | Reverse proxy (entry)  | **80 / 443 (host)** |

Everything is exposed through **Nginx on port 80**, so:

- Web UI → `http://<your-server>/`
- API → `http://<your-server>/api/v1`
- Swagger → `http://<your-server>/api/v1/docs`
- Health → `http://<your-server>/api/v1/health`

### 3.4 Production stack (`docker-compose.prod.yml`)

Used automatically when `DOMAIN` is a real FQDN. It:

- uses the multi-stage **Dockerfiles** (`backend/Dockerfile`, `frontend/Dockerfile`),
- enables **HTTPS** (Let's Encrypt via Certbot),
- mounts an HTTPS nginx configuration rendered for your domain,
- exposes ports **80 and 443**.

```bash
# If you already have certificates:
docker compose -f docker-compose.prod.yml up -d --build
# To obtain certificates first, see scripts/certbot-init.sh
```

---

## 4. First login (seeded accounts)

After seeding, the following demo accounts exist:

| Role  | Username | Default password  | Destination |
|-------|----------|-------------------|-------------|
| Admin | `admin`  | `Admin@12345`     | `/admin`    |
| User  | `demo`   | `User@12345`      | `/dashboard`|

> ⚠️ **Change these passwords immediately.** They are also set via `SEED_ADMIN_PASSWORD` / `SEED_USER_PASSWORD` in `.env`, which the deploy script applies on first seed.

---

## 5. Manual (non-Docker) development install

For local development with hot reload, run each part directly with Node 20+:

**Backend**

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma generate
npx prisma db seed        # creates admin + demo accounts and a sample page
npm run start:dev         # http://localhost:3000
```

**Frontend**

```bash
cd frontend
cp .env.example .env      # NEXT_PUBLIC_API_URL=http://localhost:3000/api
npm install
npm run dev               # http://localhost:3001
```

Then open `http://localhost:3001` (frontend) — login via the UI; API lives at `http://localhost:3000/api/v1`.

---

## 6. Common configuration values

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOMAIN` | `example.com` | Public domain; enables HTTPS when a real FQDN |
| `POSTGRES_PASSWORD` | `change-me...` | DB password |
| `JWT_ACCESS_SECRET` | generated | Access-token signing secret |
| `JWT_REFRESH_SECRET` | generated | Refresh-token signing secret |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token lifetime |
| `ACCOUNT_LOCK_THRESHOLD` | `5` | Failed attempts before lock |
| `ACCOUNT_LOCK_MINUTES` | `15` | Lock duration |
| `PUBLIC_BASE_URL` | `http://localhost` | Base URL encoded into QR codes |
| `LETSENCRYPT_EMAIL` | `admin@example.com` | Certbot contact |

---

## 7. Troubleshooting the install

- **Port 80 or 443 in use** → stop the other service on the host, or map them to free ports in `.env`: `NGINX_PORT=8081` and `NGINX_HTTPS_PORT=8443`. Both are respected by the default compose file.
- **Backend won't start → DB connection refused** → the Deploy script waits for the `db` health check; give it a minute: `docker compose logs -f db`.
- **HTTPS not working** → confirm DNS resolves, run `scripts/certbot-init.sh`, then `docker compose -f docker-compose.prod.yml up -d`.

See [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) for the full runbook.