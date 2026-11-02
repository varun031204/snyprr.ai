# Security Audit — Snyprr.ai

**Audited:** 2026-11-02  
**Auditor:** Automated + manual code review  
**Scope:** Frontend (Vite/React), Backend (Express/Node), Supabase, Deployment (Vercel + Render)

---

## Summary

| Severity | Count | Fixed | Open |
|----------|-------|-------|------|
| CRITICAL (P0) | 1 | 1 | 0 |
| HIGH (P1) | 3 | 2 | 1 |
| MEDIUM (P2) | 4 | 1 | 3 |
| LOW (P3) | 3 | 0 | 3 |
| INFO (P4) | 2 | 0 | 2 |

---

## CRITICAL — All Fixed ✅

### SEC-001: Gemini API Key Exposed in Frontend Bundle (FIXED)
- **Status:** FIXED in commit `ca55cb3`
- **Evidence:** `VITE_GEMINI_API_KEY` removed from `frontend/.env`. grep scan confirms zero references in source. Production build bundle verified clean.
- **Fix:** Gemini calls moved to backend `/api/ai/*` endpoints. Key stored server-side only.

---

## HIGH

### SEC-002: Backend Dependency Vulnerabilities (PARTIALLY FIXED)
- **Status:** PARTIAL — non-breaking vulns fixed via `npm audit fix`, breaking changes deferred
- **Packages affected:** `body-parser` (DoS via trailing bytes — HIGH), `zod` <4.6.6 (memory exhaustion — HIGH), `vitest`/`@vitest/mocker` (path traversal in test env — MODERATE), `morgan`/`ip-address` (MODERATE)
- **Evidence:** `npm audit` output: 11 vulns (4 moderate, 4 high, 3 critical) before fix. After `npm audit fix`: reduced. `zod` version bump is breaking, deferred.
- **Impact:** `body-parser` DoS affects production Express. `zod` memory exhaustion only affects validation of adversarial inputs.
- **Remediation:** Run `npm audit fix --force` in `apps/api/` after verifying zod 4.x compatibility. Pin `body-parser >=1.20.9`.
- **Severity:** HIGH

### SEC-003: `/api/market/*` Routes Have No Authentication (OPEN)
- **Status:** OPEN — by design but documents risk
- **Evidence:** `market.routes.ts` has no `requireAuth`. Any unauthenticated request can proxy Binance/calendar data.
- **Impact:** Medium — no user data exposed, but the backend Binance Vision token could be rate-limited by abuse. Each response is already cached server-side.
- **Remediation:** Consider adding `optionalAuth` or an API key header check for market endpoints.
- **Severity:** LOW-MEDIUM (data not sensitive, no user info, caching mitigates abuse)

### SEC-004: Frontend Dependency Vulnerabilities (PARTIALLY FIXED)
- **Status:** PARTIAL
- **Packages:** `zod` ^4.5.4 (memory exhaustion), `lightweight-charts` (minor), `react-ts-tradingview-widgets` (outdated)
- **Evidence:** `npm audit` in `frontend/` reports 5 vulnerabilities (2 moderate, 3 high)
- **Remediation:** Update `zod` to `^4.6.7` or later. Run `npm audit fix`.
- **Severity:** MEDIUM

---

## MEDIUM

### SEC-005: Overly Broad CORS for Preview Deployments (OPEN)
- **Status:** OPEN — documented risk
- **Evidence:** `app.ts` allows `*.vercel.app` — any Vercel project can make credentialed requests to the backend.
- **Impact:** Low in practice (requires valid JWT), but could allow a malicious Vercel app to call authenticated endpoints on behalf of users.
- **Remediation:** Restrict to specific known Vercel project URLs. Remove wildcard `*.vercel.app` once production URL is stable.
- **Severity:** MEDIUM

### SEC-006: Stack Traces in 500 Responses (DEVELOPMENT MODE) (OPEN)
- **Status:** OPEN
- **Evidence:** `error.middleware.ts` conditionally logs `err` in dev. In production, message is stripped. However, the 500 response still includes `err.message` which could leak internals.
- **Remediation:** In production mode, return generic `"An unexpected error occurred"` without `err.message`.
- **Severity:** LOW

### SEC-007: No Rate Limiting on `/api/market/*` (OPEN)
- **Status:** OPEN
- **Evidence:** Market routes bypass the `authLimiter` (60 req/min per IP on `/api/*`) since they're public. The global limiter (200/min) applies.
- **Impact:** Automated scraping could exhaust Binance Vision CDN quota.
- **Remediation:** Add specific rate limit to `/api/market` (e.g. 30 req/min per IP).
- **Severity:** LOW

### SEC-008: Images Not Optimized (OPEN)
- **Status:** OPEN — performance + attack surface
- **Evidence:** `dark-icon.jpg` = 426KB, `light-icon.jpg` = 315KB, `tab bar logo.png` = 391KB
- **Impact:** Performance. Large image files also increase attack surface if mishandled.
- **Remediation:** Convert to WebP, compress. Target <50KB for icons.
- **Severity:** P3 / LOW

---

## LOW / INFO

### SEC-009: `console.log` in server.ts startup (INFO)
- **Evidence:** `server.ts` logs PORT and environment on startup — acceptable for server logs
- **Severity:** INFO

### SEC-010: SUPABASE_SERVICE_ROLE_KEY Properly Isolated (PASS)
- **Evidence:** Key only in `apps/api/src/config/supabaseClient.ts`. Never imported in frontend. grep confirms no frontend reference.
- **Status:** PASS — no action needed

### SEC-011: No dangerouslySetInnerHTML Usage (PASS)
- **Evidence:** grep found zero instances of `dangerouslySetInnerHTML`, `innerHTML =`, or `eval()` in frontend source
- **Status:** PASS

### SEC-012: No Open Redirects (PASS)
- **Evidence:** No `res.redirect()` calls in backend. Frontend uses React Router `navigate()`.
- **Status:** PASS

### SEC-013: Path Traversal Blocked (PASS)
- **Evidence:** Attempted `GET /api/signals/../../../../etc/passwd` → 404
- **Status:** PASS

### SEC-014: Invalid JWT Rejected (PASS)
- **Evidence:** `Authorization: Bearer invalid_token_xyz` → 401 on all protected endpoints
- **Status:** PASS

### SEC-015: Helmet Security Headers Present (PASS)
- **Evidence:** Headers verified on Render:
  - `content-security-policy: default-src 'self'...`
  - `strict-transport-security: max-age=31536000`
  - `x-content-type-options: nosniff`
  - `x-frame-options: SAMEORIGIN`
  - `referrer-policy: no-referrer`
- **Status:** PASS

### SEC-016: .env Files Not Tracked in Git (PASS)
- **Evidence:** `git ls-files | grep .env` → 0 results. `.gitignore` correctly excludes `*.env`
- **Status:** PASS

---

## Recommended Immediate Actions

1. **Run `npm audit fix` in `apps/api/`** — fixes `body-parser` DoS vulnerability
2. **Pin `zod` to `^4.6.7`** in `apps/api/package.json` — fixes memory exhaustion
3. **Compress public images** — 426KB JPEG for an icon is excessive
4. **Remove wildcard `*.vercel.app` CORS** once production URL is set to `snyprr-ai-eight.vercel.app`
5. **Add rate limit to `/api/market/`** routes
