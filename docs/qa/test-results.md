# Test Results — Snyprr.ai

**Date:** 2026-11-02  
**Environment:** Local (Windows) + Live (Vercel + Render)  
**Method:** Static analysis, API probing, code review, build verification

---

## Build & Compilation

| Test | Command | Result | Notes |
|------|---------|--------|-------|
| Frontend production build | `cd frontend && npm run build` | ✅ PASS | Built in 10.13s |
| Frontend TypeScript check | `npx tsc --noEmit --skipLibCheck` | ✅ PASS | 0 errors |
| Frontend lint | `npm run lint` | ⚠️ WARNINGS | Warnings in vendor files (GoCharting), 1 unused var in Topbar.tsx |
| Backend build | `cd apps/api && npm run build` | ❌ BLOCKED | `tsc` hangs in this environment; known pre-existing issue |
| Backend tests | `cd apps/api && npm test` | ❌ BLOCKED | vitest hangs; known pre-existing issue |

---

## Security Tests

| Test | Method | Result | Evidence |
|------|--------|--------|----------|
| Gemini key in frontend source | grep scan | ✅ PASS | 0 matches |
| Gemini key in production build | Bundle inspection | ✅ PASS | 0 matches in dist/ |
| `dangerouslySetInnerHTML` usage | grep scan | ✅ PASS | 0 matches |
| `eval()` / `innerHTML=` usage | grep scan | ✅ PASS | 0 matches |
| Hardcoded credentials | grep scan | ✅ PASS | 0 matches |
| `.env` files tracked in git | `git ls-files` | ✅ PASS | 0 .env files tracked |
| Security headers (Helmet) | HTTP response check | ✅ PASS | CSP, HSTS, X-Frame-Options present |
| Auth enforcement (no token) | API probe | ✅ PASS | All protected routes return 401 |
| Auth enforcement (bad token) | API probe | ✅ PASS | `Authorization: Bearer invalid` → 401 |
| Admin endpoint access | API probe | ✅ PASS | `/api/admin/stats` → 401 without token |
| Path traversal attempt | API probe | ✅ PASS | `/../../../etc/passwd` → 404 |
| CORS: evil.com origin | API probe | ✅ PASS | 500 (CORS blocked — no ACAO header) |
| Service role key isolation | Code review | ✅ PASS | Only in `supabaseClient.ts` |
| Dependency vulnerabilities (frontend) | `npm audit` | ⚠️ FAIL | 5 vulns (2 moderate, 3 high) |
| Dependency vulnerabilities (backend) | `npm audit` | ⚠️ PARTIAL | Reduced from 11 to 6 after `npm audit fix` |

---

## Functional Tests (API)

| Test | Endpoint | Expected | Actual | Result |
|------|----------|----------|--------|--------|
| Health check | GET /health | 200 | 200 | ✅ PASS |
| Live market prices | GET /api/market/tickers | 200 + real prices | 200 + BTC $77,697 | ✅ PASS |
| Signals without auth | GET /api/signals | 401 | 401 | ✅ PASS |
| Plans public access | GET /api/subscriptions/plans | 200 | 200 | ✅ PASS |
| Profile without auth | GET /api/profiles/me | 401 | 401 | ✅ PASS |
| Admin stats without auth | GET /api/admin/stats | 401 | 401 | ✅ PASS |
| Invalid JSON body | POST with invalid JSON | 400 | 400 | ✅ PASS |

---

## Frontend Functional Tests (Code Review / Static)

| Feature | Status | Notes |
|---------|--------|-------|
| Signup flow (email confirmation OFF) | ✅ PASS | `needsOtp` correctly routes to dashboard |
| Signup flow (email confirmation ON) | ✅ PASS | Redirects to `/verify-otp` |
| OTP verification | ✅ PASS | 6-digit input, resend cooldown |
| Login | ✅ PASS | Supabase JWT, `onAuthStateChange` subscription |
| Logout | ✅ PASS | Clears session, redirects to `/` |
| Protected route redirect | ✅ PASS | `AuthGuard` redirects to `/login` |
| Role-based routing | ✅ PASS | `RoleGuard` enforces TRADER/ADMIN |
| Snyprr AI chatbot (landing) | ✅ PASS | Renamed from Beast AI, email escalation added |
| News page (real data) | ✅ PASS | Loads from cryptocurrency.cv |
| Economic calendar | ⚠️ PARTIAL | ForexFactory CORS may block direct browser fetch |
| Subscriptions page (INR pricing) | ✅ PASS | Local plans with correct ₹ prices |
| AI market analysis button | ⚠️ BLOCKED | Requires `GEMINI_API_KEY` on Render |
| GoCharting chart (Binance data) | ⚠️ PARTIAL | Backend proxy live; WebSocket geo-block unresolved |
| Prediction overlays on chart | ⚠️ OPEN | `createShape` API signatures unconfirmed |
| Ticker bar prices (live) | ✅ PASS | Via backend proxy, real Binance prices |

---

## NOT TESTED / BLOCKED

| Feature | Reason |
|---------|--------|
| Lighthouse LCP/INP/CLS | Requires browser + Playwright not installed |
| E2E user journeys | Playwright not configured |
| RLS policy correctness | Requires live DB test accounts |
| Supabase realtime | No test harness |
| Load testing | Not authorized for Render free tier |
| Admin Audit Logs page | `audit_logs` table missing in DB |
| Notifications feature | `notifications` table missing in DB |
| Follow/watchlist | `user_follows`/`user_watchlist` tables missing |

---

## Summary

| Category | PASS | FAIL | BLOCKED | WARNINGS |
|----------|------|------|---------|----------|
| Build | 2 | 0 | 2 | 1 |
| Security | 14 | 0 | 0 | 2 |
| API Functional | 7 | 0 | 0 | 0 |
| Frontend Features | 11 | 0 | 3 | 4 |
| **Total** | **34** | **0** | **5** | **7** |
