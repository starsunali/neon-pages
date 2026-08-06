# Product Specification (source document)

This is the original product brief this repository implements. The full text lives in
the original hand-off; the sections below summarise the **non‑negotiable requirements**.

## Stack (mandated)

- **Frontend**: React · Next.js · TypeScript · TailwindCSS · Framer Motion · React Hook Form · Zod · Axios
- **Backend**: Node.js · NestJS 10 · PostgreSQL 16 · Prisma ORM
- **Auth**: JWT **access + refresh** tokens · Argon2/bcrypt · secure HttpOnly cookies · rate limiting · brute‑force lockout
- **Deploy**: Docker · Docker Compose · Nginx reverse proxy · HTTPS ready · env vars · logging · validation · testing

## Feature contract

- **Login**: dark/neon glassmorphism, blue/purple animation, glass panel, responsive, animated background/buttons, Remember Me, CAPTCHA, username+password, forgot-password link, animated validation, loading spinner, invalid-credentials shake, keyboard friendly, accessible.
- **Auth flow**: validate → sanitize → rate limit → authenticate → check hash → JWT → refresh token → secure cookie → role → `/admin` (ADMIN) or `/dashboard` (USER).
- **Admin panel** (ADMIN only): stats · users · pages · QR · recent activity · settings · logout. User management: create/delete/disable/enable, reset/change password, assign/remove pages, search/filter/sort/pagination/export.
- **Page system**: each page belongs to exactly one user; unique id, slug, title, content, QR, owner, dates, public URL `/p/{slug}`; public pages need no auth.
- **User dashboard (non-admin)**: welcome, QR, public link, copy link, download QR, change password, logout, profile, password-strength meter.
- **DB tables**: Users · Pages · Roles · Sessions · RefreshTokens · AuditLogs · LoginAttempts · PasswordHistory (all with FKs, indexes, unique constraints, cascade rules, soft deletes where apt, migrations, seed).
- **Security**: prevents SQLi, XSS, CSRF, clickjacking, session hijacking, brute force, open redirect, broken auth, weak passwords, sensitive-data exposure, directory traversal, command injection, file-upload vulns, token replay.
- **Docs & DevOps**: README, install guide, architecture diagram, API docs, DB schema, deployment guide, developer guide, security guide, troubleshooting, tests, CI/CD, QA report.

## Repository layout (mandated)

```
project/
├── frontend/  backend/  database/  nginx/  docker/  docs/  tests/  scripts/
```

This repository maps `database/` + `docker/` + `nginx/` as described in `ARCHITECTURE.md`.

## Definition of done

A milestone is complete only when: build passes, tests pass, docs updated, security review for its surface is enforced, and the integrated app still passes regression.