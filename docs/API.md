# API Reference (REST · Swagger/OpenAPI)

Interactive docs are served by the running app at **`/api/v1/docs`** (Swagger UI).

Base path (versioned): **`/api/v1`**

---

## Conventions

- **Auth**: `Authorization: Bearer <accessToken>`. The refresh token is sent as a signed, HttpOnly **cookie** (`rt`), so the refresh endpoint is called without an explicit header.
- **Errors** — consistent shape:
  ```json
  { "statusCode": 401, "error": "Unauthorized", "message": "...", "timestamp": "...", "path": "/api/v1/auth/login" }
  ```
- All input is validated (class-validator) and **whitelisted**; unknown fields are rejected.
- Rate limited via `@nestjs/throttler`; login is limited to a low per-IP budget (brute-force protection).

---

## Endpoints

### `POST /auth/login` — public, rate-limited
Body: `{ "username", "password", "captcha" }`
→ `200` `{ accessToken, refreshToken, user:{id,username,role} }`
Fails → `401` invalid creds, `403` disabled/locked.

### `POST /auth/refresh` — public
No body; uses the `rt` HttpOnly cookie. Rotates the refresh token and returns a fresh pair. Revoked/expired → `401`.

### `POST /auth/logout` — protected
Revokes the current refresh token. → `{ success:true }`.

### `GET /auth/me` — protected
→ `{ id, username, role }`.

### `POST /auth/change-password` — protected
Body: `{ currentPassword, newPassword, confirmPassword }`. Validates, checks password history, rotates all refresh tokens.

### `GET /pages/me` — protected (USER)
Your own page (with `qrCodePng` / `qrCodeSvg` paths) or `null`.

### `POST /pages/me` — protected (USER)
Body: `{ slug, title, content, seoTitle?, description? }`. Creates your page (one per user) and generates the QR codes.

### `PATCH /pages/me` — protected (USER)
Body: partial `{ title?, content?, isPublished?, seoTitle?, description? }`. Updates your page.

### `GET /p/{slug}` — **Public**, no auth
Returns `{ slug, title, content, seoTitle?, description?, updatedAt }` for a published page. `404` otherwise.

### `GET /files/qr/{filename}` — protected
Downloads a generated QR (`.png` / `.svg`). Filename strictly validated (no directory traversal).

### `GET /admin/users/stats` · `GET /admin/users` · `GET /admin/users/export` · `GET /admin/users/activity` — Admin
Dashboard stats, paginated list (`?page&limit&search&role&sortBy&sortOrder`), CSV export, recent audit feed.

### Admin user mutations — Admin only
- `POST /admin/users` — create user `{ username, email, password, role? }`
- `PATCH /admin/users/:id/active` — enable/disable `{ isActive }`
- `PATCH /admin/users/:id/reset-password` — `{ newPassword }`
- `DELETE /admin/users/:id` — delete user (blocks deleting the last admin)

### `GET /health` — Public
`{ status, db, uptime, timestamp }`.

---

## Roles & access

| Endpoint group | USER | ADMIN | Public |
|----------------|:----:|:-----:|:------:|
| `/auth/*`      | ✓ (own) | ✓ | login/refresh |
| `/pages/me`, `/p/{slug}` | ✓ | ✓ | `/p/{slug}` |
| `/admin/*`     | ✗ | ✓ | ✗ |
| `/files/qr/*`  | ✓ (own) | ✓ | ✗ |

Authorization is enforced by global guards: all routes are authenticated by default (`JwtGlobalGuard`), plus `RolesGuard(ADMIN)` on admin routes.