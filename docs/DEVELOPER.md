# Developer Guide

Standards and workflow for contributors to Neon Pages.

## Code standards

- **TypeScript strict mode** on both apps; no `any` except where unavoidable.
- **SOLID + Clean Architecture**: NestJS DI, repository access only through PrismaService.
- **DRY / KISS**: shared DTOs and validators; no duplicated logic between frontend/backend (Zod mirror of class-validator).
- ESLint + Prettier configured; run before pushing.
- Meaningful naming, comments only where they add context.

```bash
cd backend && npm run lint && npm test
cd frontend && npm run lint && npm run typecheck
```

## Local development

**Backend** (hot reload):

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy && npx prisma db seed
npm run start:dev        # :3000 — Swagger at /api/v1/docs
```

**Frontend** (hot reload):

```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # :3001
```

Both dev servers talk to the same Postgres — run `docker compose up -d db` for a DB-only container, or use the full stack with volumes.

## Testing

- **Unit/Integration (backend)**: Jest + ts-jest. `backend/test/auth.service.spec.ts` covers login failure paths, lockout, and password-confirmation mismatch.
- **E2E**: scaffolded under `tests/` (see below).
- **CI**: `.github/workflows/ci.yml` runs lint → tests → build → Docker build on every push/PR.

Run everything:

```bash
cd backend && npm test
```

### Runtime & load tests (`tests/`)

- `tests/e2e/smoke.http` — raw HTTP smoke probes (login → me → create page → public page → logout).
- `tests/e2e/README.md` — how to execute the smoke tests.
- `tests/load/` — k6 scaffolding: `k6 run tests/load/login.js`.

## Adding an endpoint

1. DTO in `backend/src/<mod>/dto/*.dto.ts` (class-validator + Swagger decorators).
2. Service method → Prisma queries only.
3. Controller route with guards (`@UseGuards(JwtAuthGuard)` or `@Public()`), consistent JSON errors.
4. Mirror the input schema in `frontend/src/lib/validators.ts`.
5. Update `docs/API.md` and the smoke tests.

## Environment variables

See `.env.example` (root) — the single source of truth. Never commit `.env`.

## UI conventions

- Neon glassmorphism: use `.glass`, `.glass-strong`, `.btn-neon`, `.input-neon`, `.neon-text` classes.
- Every interactive element must have visible focus states and an ARIA label.
- Test at 320 / 768 / 1024 / 1440 widths.

## Releasing

```bash
# bump versions, tag, and let CI build & push images
git tag v1.0.0 && git push origin v1.0.0
# on the server:
git pull && ./scripts/deploy.sh
```