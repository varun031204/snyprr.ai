# Defect Backlog — Snyprr.ai

**Last Updated:** 2026-11-02  
**Severity Key:** P0=Critical | P1=High | P2=Medium | P3=Low | P4=Info

---

## P1 — High Priority (Fix Before Production)

| ID | Title | Component | Status | Evidence |
|----|-------|-----------|--------|----------|
| DEF-001 | Backend `body-parser` DoS vulnerability | `apps/api` deps | OPEN | `npm audit` HIGH: GHSA-27r3-jxmh-p828 |
| DEF-002 | `audit_logs` DB table missing — Admin Audit Logs page broken | `AdminAuditLogsPage`, DB | OPEN | DB migration does not create `audit_logs` table; page would 500 on load |
| DEF-003 | `signal_versions`, `signal_events` tables missing | DB Schema | OPEN | Confirmed in migration files — no versioning/history for signals |
| DEF-004 | Payment gateway not integrated — subscribe always returns `success: false` | `subscriptionsService.ts` | OPEN | Code comment: "Payment gateway integration is out of V1 scope" |

## P2 — Medium Priority

| ID | Title | Component | Status | Evidence |
|----|-------|-----------|--------|----------|
| DEF-005 | Chart overlays (Buy/Sell zone lines) may not render | `GoChartingWidget.tsx` | OPEN | `createShape` API signatures untested — 4 attempts tried, none confirmed working |
| DEF-006 | Binance API geo-blocked in India — chart falls back to synthetic prices | `datafeed.ts` | PARTIAL | Backend proxy via `data-api.binance.vision` deployed; WebSocket still fails from India |
| DEF-007 | GoCharting chart loaded from CDN — adds ~2s load time | `GoChartingWidget.tsx` | OPEN | SDK loaded async from CDN; no preload hint |
| DEF-008 | `user_follows` and `user_watchlist` tables missing — follow/watchlist features broken | DB Schema | OPEN | Returns mock data only |
| DEF-009 | `notifications` table missing — notifications page shows empty state | DB Schema | OPEN | No backend table |
| DEF-010 | Trader win rate always hardcoded to 0 | `signalsService.ts` | OPEN | Adapter comment: "hardcoded values" |
| DEF-011 | Calendar page is an empty placeholder | `CalendarPage.tsx` | OPEN | Page renders with no content |
| DEF-012 | Paper trading positions not persisted to backend | `usePaperTradingStore.ts` | OPEN | Zustand only, resets on refresh |
| DEF-013 | `AreaChart` bundle 349KB — recharts not tree-shaken | Bundle | OPEN | Single bundle, import entire recharts lib |
| DEF-014 | Large public images (426KB dark-icon.jpg) | `frontend/public/` | OPEN | Should be converted to WebP <50KB |

## P3 — Low Priority

| ID | Title | Component | Status | Evidence |
|----|-------|-----------|--------|----------|
| DEF-015 | `roleMenuOpen` unused variable in Topbar.tsx | `Topbar.tsx:34` | OPEN | Lint warning |
| DEF-016 | GoCharting vendor JS files in `public/vendor/` add 3.6MB to deployment | `frontend/public/vendor/` | OPEN | Necessary for SDK but large |
| DEF-017 | `3d` timeframe maps to `1D` (daily) instead of 3-day | `GoChartingWidget.tsx` | OPEN | GoCharting doesn't support 3D interval natively |
| DEF-018 | News article descriptions sometimes contain encoding artifacts (â€™) | `NewsPage.tsx` | OPEN | UTF-8 encoding issue from cryptocurrency.cv API |
| DEF-019 | ForexFactory calendar not proxied (503 on CORS) | `calendarService.ts` | OPEN | Calendar fetches directly from browser; backend calendar proxy exists but may not be called |
| DEF-020 | Render free tier cold start ~30s | Deployment | OPEN | Acceptable for demo; use paid tier for production |

## P4 — Informational

| ID | Title | Component | Status |
|----|-------|-----------|--------|
| DEF-021 | CI pipeline only tests backend — frontend not tested in CI | `.github/workflows/ci.yml` | OPEN |
| DEF-022 | No monitoring/alerting configured (Sentry, Datadog, etc.) | DevOps | OPEN |
| DEF-023 | GEMINI_API_KEY missing from `apps/api/.env` — AI analysis will fail | `apps/api/.env` | OPEN — Owner action required |
| DEF-024 | GoCharting demo license key adds watermark | `GoChartingWidget.tsx` | OPEN — Permanent key arriving in 3-4 days |

---

## Fixed Defects

| ID | Title | Fixed In | Evidence |
|----|-------|----------|----------|
| DEF-F01 | Gemini API key exposed in frontend bundle | Commit `ca55cb3` | grep scan confirmed |
| DEF-F02 | Signup always redirected to OTP regardless of confirmation setting | Commit (see auth store) | `needsOtp` return value added |
| DEF-F03 | Beast AI renamed to Snyprr AI | Commit (chatbot) | grep scan confirmed |
| DEF-F04 | `FRONTEND_URL` env var not set on Render | Manual action | Backend CORS blocking fixed |
| DEF-F05 | Vercel env vars missing `VITE_` prefix | Manual action | Site now loads |
| DEF-F06 | GoCharting SDK on private npm registry failing Vercel build | CDN migration | `build` passes |
| DEF-F07 | Backend `body-parser`/`morgan` vulnerabilities (non-breaking) | `npm audit fix` in apps/api | Partially fixed |
