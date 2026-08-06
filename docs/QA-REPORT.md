# QA Report & Acceptance Baseline

Status: **Baseline scaffold** — tracks the QA gates the orchestrator asserts on every milestone. Expand strongly against the release checklist before external launch.

## Quality gates (applied per milestone)

| Gate | Status | Notes |
|------|--------|-------|
| Static review / lint | ✅ implemented | ESLint+Prettier both apps; CI runs it |
| Unit tests | 🔶 partial | `auth.service.spec.ts` covers login failure, lockout, password confirm; extend coverage |
| Integration tests | 🔶 scaffold | e2e smoke probes under `tests/` |
| Security audit | ✅ configured | guards, throttler, Argon2, rotation, headers; see `SECURITY.md` |
| Responsive/UX | ✅ design tokens | 320px→4K neon glassmorphism theme; manual QA pending |
| API design | ✅ | versioned REST + Swagger at `/api/v1` |
| DB schema | ✅ | normalized, FK/indexes, no raw SQL |
| Documentation | ✅ | all docs present in `docs/` |
| CI/CD | ✅ | GitHub Actions workflow |

## Known limitations (baseline scope)

- **CAPTCHA** is a validated placeholder (4–6 alphanumerics). Production should integrate **reCAPTCHA/hCaptcha** server-side.
- **Public page rendering** shows Markdown as raw text; a Markdown renderer (e.g. `react-markdown`) is the next enhancement.
- **Admin panel** implements user management + stats; page management and QR re-generation live on the user profile page.
- **Rate limiting** is per-instance (in-memory); scale out with a shared store (Redis) for multi-node.
- **e2e + load tests** are scaffolds; run and expand before release.

## Accessibility checklist (implemented)

- ✅ ARIA labels on form fields and buttons
- ✅ Keyboard navigation + `:focus-visible`
- ✅ `prefers-reduced-motion` respected
- ✅ Semantic HTML (`main`, `article`, `label`, `table`)
- ✅ High-contrast neon palette (AA-friendly intend)
- ⬜ Full automated axe/Jest DOM audit (add to CI)

## Performance checklist (implemented)

- ✅ Next.js App Router + code splitting (routing-based)
- ✅ Standalone Docker image (small runtime)
- ✅ Static caching via Nginx
- ✅ Indexed DB queries
- ✅ Rate limits guard hot paths

## Release-blocking TODO (open)

1. Replace CAPTCHA with real provider.
2. Add `react-markdown` for public pages.
3. Wire admin "create page / generate QR" end-to-end (currently via user profile).
4. Extend unit + e2e coverage to green CI.
5. Run OWASP ZAP / Trivy scan and fix findings.
6. Load-test with k6 (`tests/load/login.js`) and record numbers in this file.

> A feature is considered **done** only when: it builds, a test covers it, docs mention it, and the security checklist for its surface is enforced.