# Security Guide & Audit Baseline

This app treats security as the primary requirement. Below are the threats the spec requires blocking, the controls implemented, and the hardening checklist.

## Threat → control map

| Threat                  | Control |
|-------------------------|---------|
| SQL injection           | Prisma only — all queries parameterized, no raw SQL |
| XSS                     | Output encoding in React; Zod/class-validator sanitation; CSP-ready headers |
| CSRF                    | SameSite=Strict cookie, Bearer-token auth, JSON Content-Type enforced |
| Clickjacking            | `X-Frame-Options: DENY` (nginx + Next.js headers) |
| Session hijacking       | Short access tokens, rotating refresh tokens, revoke-on-use |
| Brute force             | `@nestjs/throttler` + failed-attempt counter → account lock (default 5 → 15 min) |
| Open redirect           | No server-side redirect from user input |
| Broken authentication   | Centralized JwtGlobalGuard, role checks on admin routes |
| Weak passwords          | Argon2id hashing + policy (upper/lower/number/special, ≥8) + history check |
| Sensitive data exposure | Secrets only in env, hidden from client; `server_tokens off` |
| Directory traversal     | QR file endpoint validates filenames against a strict whitelist + `path.startsWith` |
| Command injection       | No shell execution with user input |
| Token replay            | Refresh tokens one-time use (rotation), access tokens short TTL |
| Logging / audit         | `AuditLog` records every sensitive action (attempts, logins, admin ops) |

## Implemented controls

### Authentication
- **Argon2id** password hashing (bcrypt also included as a fallback).
- **JWT** access (15m) + **refresh (7d)**; refresh token is:
  - stored **hashed (SHA-256)** in the DB,
  - delivered via a **Secure + HttpOnly + SameSite cookie**,
  - **rotated** on every use (old one revoked, `replacedBy` chains it).
- Account **lockout** after N failed attempts; disabled users blocked at login.
- **Rate limiting** (`ThrottlerModule`) — strict limit on `/auth/login`.

### Authorization
- Global `JwtGlobalGuard` — every endpoint authorized by default.
- `RolesGuard` with `@Roles(ADMIN)` on the admin surface; `@Public()` open only where intended (login, refresh, health, `/p/{slug}`).

### Transport & headers
- Helmet middleware (CSP, nosniff, HSTS-ready).
- Nginx security headers + `server_tokens off`.
- CORS restricted to `CORS_ORIGINS` whitelist, `credentials: true`.
- HTTPS via Certbot in production (see `nginx/conf.d/prod-https.conf.template`).

### Input & output
- `ValidationPipe` with `whitelist + forbidNonWhitelisted` on every body/DTO.
- Zod client-side validation as first gate.
- Escaped output by default in React.
- QR download endpoint strictly validates the filename (regex + path containment).

## Monitoring the iron

- `AuditLog` — run the admin **Recent activity** feed.
- `LoginAttempt` — watch for a spike in failures (brute-force indicator).
- Backend logs — JSON-ish via Nest logger; container `docker compose logs -f backend`.

## Hardening checklist (operator)

1. Regenerate all `.env` secrets before first real deploy.
2. Change the two seeded passwords immediately.
3. Firewall: open only **80/443** inbound.
4. Pin image versions (no `latest`) for staged rollouts.
5. Reconcile the Certbot renewal; back up `./certbot/conf`.
6. Periodically rotate `JWT_REFRESH_SECRET` (logs out all users — do off-peak).
7. Enable security scanning (Trivy/Snyk) in CI (see `.github/workflows/ci.yml`).

## Pen-test baseline (future)

The `tests/` folder scaffolds smoke tests for auth, validation, and SQLi/XSS probes. Extend into full OWASP ZAP or Burp runs before external launch — see `docs/DEVELOPER.md`.