# E2E smoke tests

Two ways to run them:

## Option A — VSCode REST Client

1. Install the **REST Client** extension (humao.rest-client).
2. Open `tests/e2e/smoke.http`.
3. Click **Send Request** on each block in order (they share variables via `@name`).

## Option B — curl script

```bash
BASE=http://localhost ./tests/e2e/run-smoke.sh
```

## Option C — automated (backend Jest e2e)

```bash
cd backend
# start stack first: docker compose up -d
npm run test:e2e
```

## Expected results

| Step | Expect |
|------|--------|
| health | 200 `{"status":"ok","db":"up"}` |
| login demo | 200 + `accessToken`/`refreshToken` |
| me | 200 with `username: demo` |
| wrong password | 401 (5× then account lock) |
| admin login | 200 + `role: ADMIN` |
| admin stats | 200 numbers |
| public page | 200 page content |
| SQLi probe | 404/400 — never 500 or data leak |
| XSS probe | 200; content stored safely |

> The smoke suite is the first thing to run after every deploy:
> `./scripts/healthcheck.sh && BASE=https://your.domain ./tests/e2e/run-smoke.sh`