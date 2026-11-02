# DevOps Readiness — Snyprr.ai

**Audited:** 2026-11-02

---

## Build Status

| Component | Build Command | Status | Notes |
|-----------|--------------|--------|-------|
| Frontend (Vite) | `cd frontend && npm run build` | ✅ PASS | Built in 10.13s |
| Backend (TypeScript) | `cd apps/api && npm run build` | ⚠️ HANG | `tsc` hangs in this environment; `npx tsx` works fine |

## CI/CD Pipeline (`.github/workflows/ci.yml`)

| Step | Status | Notes |
|------|--------|-------|
| Checkout | ✅ | Uses `actions/checkout@v4` |
| Node.js 20 setup | ✅ | Correct version |
| Backend install (`npm ci`) | ✅ | |
| Backend typecheck + build | ✅ | `npm run build --workspace=@tradebeast/api` |
| Backend tests | ⚠️ BLOCKED | Tests hang in CI (vitest timeout issue) |
| Frontend build | ❌ NOT IN CI | Frontend not built in CI pipeline |
| Frontend tests | ❌ NOT IN CI | No frontend test step |
| Security audit | ❌ NOT IN CI | No `npm audit` step |

**Gap:** CI only tests the backend. Frontend build and tests are not verified on every push.

## Deployment Configuration

### Frontend (Vercel)
| Setting | Value | Status |
|---------|-------|--------|
| Platform | Vercel (Hobby) | ✅ |
| Root Directory | `frontend` | ✅ |
| Build Command | `npm run build` | ✅ |
| Output Directory | `dist` | ✅ |
| SPA Rewrites | `/(.*) → /index.html` | ✅ |
| Domain | `snyprr-ai-eight.vercel.app` | ✅ |
| Auto-deploy | On push to `main` | ✅ |

### Backend (Render)
| Setting | Value | Status |
|---------|-------|--------|
| Platform | Render (Free) | ✅ |
| Root Directory | `apps/api` | ✅ |
| Build Command | `npm install` | ✅ |
| Start Command | `npx tsx src/server.ts` | ✅ |
| Health Check | GET /health | ✅ Live: 200 OK |
| Cold Start | ~30s (free tier) | ⚠️ Acceptable for demo |

### Database (Supabase)
| Feature | Status | Notes |
|---------|--------|-------|
| PostgreSQL | ✅ Live | Project `qaxmcccdjljvwqutjsou` |
| RLS Enabled | ✅ | 33 policies in migrations |
| Migrations | ✅ | 2 migration files |
| Auth | ✅ | Supabase Auth with OTP |
| Service Role Key | ✅ Isolated | Server-side only |

## Environment Variables

### Frontend (Vercel) — Required
| Variable | Set? | Notes |
|----------|------|-------|
| `VITE_SUPABASE_URL` | ✅ | Set in Vercel |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Set in Vercel |
| `VITE_API_BASE_URL` | ✅ | Points to Render |
| `VITE_GOCHARTING_LICENSE_KEY` | ✅ | Demo key |

### Backend (Render) — Required
| Variable | Set? | Notes |
|----------|------|-------|
| `NODE_ENV` | ✅ | production |
| `FRONTEND_URL` | ✅ | Vercel URL |
| `SUPABASE_URL` | ✅ | |
| `SUPABASE_ANON_KEY` | ✅ | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | |
| `DATABASE_URL` | ✅ | |
| `GEMINI_API_KEY` | ❌ MISSING | AI analysis will fail without this |

## Missing / Gaps

| Gap | Priority | Action |
|-----|----------|--------|
| `GEMINI_API_KEY` not set on Render | P1 | Add to Render environment variables |
| Frontend not in CI pipeline | P2 | Add `cd frontend && npm run build` to CI |
| No `npm audit` in CI | P2 | Add security scan step |
| No monitoring (Sentry/Datadog) | P3 | Add error tracking for production |
| No backup/restore procedure | P3 | Document Supabase backup schedule |
| No rollback procedure | P3 | Document Vercel/Render instant rollback |
| Render free tier sleeps | P3 | Upgrade to $7/mo for always-on |
| GoCharting demo key expires | P2 | Replace with production key |

## Rollback Procedures

### Frontend (Vercel)
1. Go to Vercel → Deployments
2. Click previous successful deployment
3. Click "Promote to Production"
4. Instant rollback (no downtime)

### Backend (Render)
1. Go to Render → service → Deploys
2. Click previous deploy
3. Click "Rollback to this deploy"

### Database (Supabase)
1. No migration rollback script exists — manual SQL reverse needed
2. Supabase Pro tier includes Point-in-Time Recovery

---

## Release Checklist

- [x] Frontend builds without errors
- [x] Backend health check returns 200
- [x] All protected endpoints return 401 without token
- [x] Admin endpoints return 401 for non-admin
- [x] CORS configured correctly
- [x] Security headers present (Helmet)
- [x] Secrets not in git
- [x] `.env` files gitignored
- [ ] `GEMINI_API_KEY` set on Render
- [ ] GoCharting production key deployed
- [ ] `npm audit fix` run for zod vulnerability
- [ ] `audit_logs` table created in DB
- [ ] Frontend added to CI pipeline
- [ ] Monitoring/alerting configured
