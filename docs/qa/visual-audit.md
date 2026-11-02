# Visual Audit — Snyprr.ai

**Date:** 2026-11-02  
**Method:** Code review + CSS analysis (screenshots not available in this environment — browser automation required for pixel-level inspection)

---

## Responsive Breakpoints Checked (Code Analysis)

| Breakpoint | Target Width | Tailwind Class | Notes |
|------------|-------------|----------------|-------|
| Mobile S | 320px | Default | |
| Mobile M | 375px | Default | |
| Mobile L | 390px | Default | |
| Tablet | 768px | `md:` | |
| Laptop | 1024px | `lg:` | |
| Desktop | 1280px | `xl:` | |
| Wide | 1440px | `2xl:` | |
| Ultra-wide | 1920px | `2xl:` | |

---

## Visual Issues Found (Code Analysis)

### P2-VIS-001: Sidebar overlap on mobile
- **File:** `Sidebar.tsx`, `AppShell.tsx`
- **Issue:** Sidebar uses `fixed` positioning. On mobile, the backdrop (`bg-black/50`) correctly overlays, but main content padding must adjust.
- **Evidence:** `md:pl-16` padding class on `AppShell` main area — verified. OK on desktop, but transition from 64px→0 on mobile may cause brief layout shift.
- **Status:** ACCEPTABLE — standard sidebar pattern

### P2-VIS-002: GoCharting chart height on mobile
- **File:** `GoChartingWidget.tsx`
- **Issue:** Height is passed as prop (e.g. `height={580}`) — fixed pixel height. On 320px wide screens this maintains height but chart may feel cramped.
- **Severity:** P3

### P3-VIS-003: Ticker bar horizontal scroll on narrow screens
- **File:** `UserDashboardPage.tsx`
- **Issue:** `overflow-x-auto` applied. On 320px screens, 6 tickers will overflow and require horizontal scroll. No visual indicator.
- **Severity:** P3

### P3-VIS-004: Landing page hero video performance
- **File:** `LandingPage.tsx`
- **Issue:** `<video autoPlay loop muted playsInline>` — no `poster` attribute. First frame flash may appear before video loads.
- **Fix:** Add `poster="/hero-poster.jpg"` fallback.
- **Severity:** P3

### P4-VIS-005: Theme toggle persistence
- **File:** `main.tsx`
- **Issue:** Theme saved to `localStorage` as `snyprr_theme`. Works correctly. Light/dark themes both apply `data-theme` on `<html>`.
- **Status:** PASS

### P4-VIS-006: Font loading
- **File:** `index.html`
- **Issue:** Google Fonts Inter loaded via `<link>` synchronously. No `font-display: swap` observed in CSS.
- **Fix:** Add `&display=swap` to font URL (already present — PASS).
- **Status:** PASS

---

## Component State Coverage

| Component | Default | Hover | Focus | Active | Disabled | Loading | Empty | Error |
|-----------|---------|-------|-------|--------|----------|---------|-------|-------|
| Button | ✅ | ✅ | ✅ (ring) | ✅ | ✅ (opacity-50) | ✅ (spinner) | N/A | N/A |
| Input | ✅ | N/A | ✅ (border) | N/A | N/A | N/A | ✅ (placeholder) | ✅ (danger border) |
| GlassCard | ✅ | ✅ (optional) | N/A | N/A | N/A | N/A | N/A | N/A |
| Skeleton | N/A | N/A | N/A | N/A | N/A | ✅ (pulse) | N/A | N/A |
| Modal | ✅ | N/A | ✅ | N/A | N/A | N/A | N/A | N/A |
| Sidebar | ✅ expanded | ✅ | ✅ | ✅ (active) | N/A | N/A | N/A | N/A |
| Chart | ✅ | N/A | N/A | N/A | N/A | ✅ (loading message) | N/A | ✅ (onError) |

---

## Dark/Light Theme

| Area | Dark Mode | Light Mode | Status |
|------|-----------|------------|--------|
| Background colors | `--bg-base: #050507` | `--bg-base: #f7f6fa` | ✅ |
| Text colors | `--text-primary: #f4f3f8` | `--text-primary: #18151f` | ✅ |
| Brand colors | `--brand-primary: #b17cfe` | `--brand-primary: #8d58e7` | ✅ |
| Chart theme | `'dark'` / `'light'` passed to GoCharting | ✅ |
| CSS variable coverage | Consistent across all components | ✅ |

---

## Typography

- Font: Inter (loaded from Google Fonts) ✅
- Monospace numbers: `.font-mono-num` utility class used for prices ✅
- Font sizes: Consistent use of Tailwind `text-xs/sm/base/lg/xl/2xl/3xl` ✅
- Line heights: `leading-relaxed`, `leading-snug` used appropriately ✅

---

## Accessibility Notes (Code Analysis)

| Issue | Severity | Evidence |
|-------|----------|----------|
| Chatbot close button missing visible label | P3 | Has `title="Dismiss"` but not `aria-label` |
| GoCharting chart div has `aria-label` | PASS | `aria-label={instrument + " live chart"}` |
| Sidebar nav links use `<Link>` (semantic) | PASS | Correct HTML element |
| Buttons have title/aria-label for icon-only buttons | PASS | All sidebar icon buttons have `title` and `aria-label` |
| `<img>` tags have `alt` text | PASS | Verified in code |
| Color contrast | NOT TESTED | Requires contrast checker tool |
| Keyboard navigation | NOT TESTED | Requires browser |
| Focus traps in modals | PARTIAL | Modals close on Escape key, but focus trap not explicitly implemented |

---

## Screenshots

> Browser automation (Playwright) was not available in this environment.  
> Screenshots should be captured manually using DevTools device emulation at:  
> 320px, 375px, 768px, 1280px, 1440px on both `https://snyprr-ai-eight.vercel.app` and localhost.

See `docs/qa/test-artifacts/` for any manually captured screenshots.
