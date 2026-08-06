# Docker helpers

This directory is a shared home for Docker assets that back the compose files.

Services and their build contexts:

| Compose file            | Runtime             | Dockerfiles used               |
|-------------------------|---------------------|--------------------------------|
| `docker-compose.yml`    | HTTP (dev/first)    | `backend/Dockerfile`, `frontend/Dockerfile` |
| `docker-compose.prod.yml`| HTTPS (production)  | same Dockerfiles               |

Both files internally use:

- **Named volumes** for persistence: `pgdata` (Postgres), `qr-files` (generated QR PNG/SVG), `dhparam` (nginx).
- **An isolated bridge network** `neon-net`.
- **Health checks** on `db`, `backend`, and `frontend` so the stack starts in the right order.

## Build the images alone

```bash
docker build -t neonpages/backend:latest ./backend
docker build -t neonpages/frontend:latest ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://your.domain/api \
  --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain
```

## Tips

- The frontend Dockerfile emits a **standalone** build (`output: 'standalone'`) for a tiny runtime image.
- The backend Dockerfile runs `prisma migrate deploy` in its `CMD`, so migrations apply on every container start.
- QR files and DB live in named volumes; back them up with `scripts/backup.sh`.