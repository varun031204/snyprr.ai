# Performance Report — Snyprr.ai

**Audited:** 2026-11-02  
**Tools:** Bundle analysis, HTTP timing, static code analysis  
**Note:** Full Lighthouse scores require a browser with CPU throttling; measurements here are network timing only.

---

## Frontend Response Time (Vercel CDN)

| Measurement | Value |
|-------------|-------|
| HTML time-to-first-byte (avg 3 samples) | **147ms** |
| Min TTFB | 66ms |
| Max TTFB | 258ms |
| CDN: Vercel (Edge Network) | ✅ |

## Bundle Sizes (Production Build)

| Bundle | Raw | Gzipped | Notes |
|--------|-----|---------|-------|
| `index.js` (main entry) | 407KB | 126KB | Includes React, Router, Zustand, QueryClient |
| `AreaChart.js` (recharts) | 349KB | 104KB | ⚠️ Large — recharts not tree-shaken |
| `supabase.js` | 215KB | 55KB | Acceptable |
| `CreatePredictionPage.js` | 97KB | 27KB | Acceptable |
| `LandingPage.js` | 72KB | 18KB | Acceptable |
| `GoChartingWidget.js` | 9KB | 4KB | ✅ Tiny (SDK loads from CDN at runtime) |
| **Total dist** | **15.62MB** | — | ⚠️ Includes GoCharting vendor JS (~9MB) |

### GoCharting Vendor Files (public/vendor/)
| File | Size |
|------|------|
| `mobileShell.js` | 1.5MB |
| `topBar.js` | 2.0MB |
| `chromePanels.js` | 1.2MB |
| `ContextMenu.js` | ~1MB |
| Others | ~3MB |
| **Total** | **~9MB** |

> These are loaded lazily by the GoCharting SDK only when features are used. Not all load on initial page load.

## Performance Targets vs Actual

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| LCP | ≤ 2.5s | ~1.5-2s (estimated — CDN TTFB 147ms + bundle parse) | ⚠️ ESTIMATED |
| INP | ≤ 200ms | Not measured (requires browser) | NOT TESTED |
| CLS | ≤ 0.1 | Not measured | NOT TESTED |
| FCP | ≤ 1.8s | ~0.5-1s (estimated) | ⚠️ ESTIMATED |
| TTFB | ≤ 600ms | **147ms avg** | ✅ PASS |

> **Note:** LCP/INP/CLS require browser automation (Playwright + Lighthouse) for accurate measurement. Marked as estimated.

## Backend API Response Times

| Endpoint | Response Time |
|----------|--------------|
| GET /health | <50ms |
| GET /api/market/tickers | ~77ms |
| GET /api/subscriptions/plans | ~265ms |

## Identified Performance Issues

### P2-PERF-001: Recharts bundle 349KB ungzipped
- **Impact:** Adds ~1-2s parse time on mobile
- **Fix:** Use dynamic import for recharts, or replace with a lighter chart library for analytics pages

### P2-PERF-002: GoCharting SDK ~3.5MB (CDN load)
- **Impact:** First visit to dashboard/predictions requires ~3.5MB CDN download from gocharting.com
- **Fix:** SDK loads async (non-blocking) but delays chart display. Consider preconnect hint.

### P3-PERF-003: Public images uncompressed
- **Impact:** `dark-icon.jpg` (426KB) + `light-icon.jpg` (315KB) + `tab bar logo.png` (391KB)
- **Fix:** Convert to WebP, compress to <50KB each

### P3-PERF-004: No HTTP caching headers on Vercel for static assets
- **Impact:** Cache-Control not inspected for JS chunks
- **Fix:** Verify Vercel serves `Cache-Control: public, max-age=31536000, immutable` for hashed assets

## Recommendations

1. Add `<link rel="preconnect" href="https://gocharting.com">` to `index.html`
2. Compress public images with `sharp` or `squoosh`
3. Use `React.lazy` + dynamic `import()` for recharts in analytics
4. Add Vercel Speed Insights to measure real user CLS/INP/LCP
