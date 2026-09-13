# Trade Beast ⚡

> **A Premium Trading Prediction SaaS Platform**  
> *Built with React 19, TypeScript, Tailwind CSS, TanStack Query, Zustand, and Zod.*

---

## 🎯 Product & Domain Model

Trade Beast is an auditable, transparent trading **prediction** platform.

```
TRADER (Analyst)
   ↓ creates
PREDICTION (Entry / Stop Loss / Take Profit / R:R / Strategy / Analysis)
   ↓ verified & published on
TRADE BEAST PLATFORM
   ↓ follows / subscribes / tracks
USER (Subscriber / Trader / Admin)
```

### Core Architecture Rules:
1. **Prediction Only**: The core engine records forecasts with explicit declared levels (Entry, Stop Loss, Target). There are **no direct orders, live execution, or copy trading** in the prediction domain.
2. **Decoupled Market Context**: Market ticker state (`useMarketStore`) is strictly used for visual chart background context and is completely decoupled from prediction truth.
3. **Integration Boundary Reserved**: Future exchange execution plugins (such as Delta Exchange or external brokers) plug directly into `src/features/integrations/` without touching or modifying the core prediction model, state stores, or routing tree.

---

## 🧱 Project Architecture & Folder Structure

```
src/
├── app/
│   ├── guards/         # AuthGuard and RoleGuard (RBAC)
│   ├── providers/      # QueryProvider and ThemeProvider
│   └── router/         # React Router configuration with lazy-loading
├── components/
│   ├── ai/             # Beast AI Assistant Drawer
│   ├── charts/         # SimpleChart SVG candlestick adapter with level overlays
│   ├── feedback/       # ToastContainer & ToastCard
│   ├── search/         # GlobalSearchModal (⌘K shortcut)
│   └── ui/             # GlassCard, Button, Input, Select, Modal, Badge, StatCard
├── constants/          # Role permissions, instruments, timeframes, strategies
├── features/
│   ├── admin/          # Users, Traders, Moderation, Subscriptions, Audit Logs, Settings
│   ├── analytics/      # Quantitative win-rate and R:R distribution analytics
│   ├── auth/           # Login & Signup with DEV role switcher shortcuts
│   ├── calendar/       # Macroeconomic and volatility catalyst calendar
│   ├── dashboard/      # User, Trader, and Admin dashboards
│   ├── integrations/   # [RESERVED BOUNDARY] for future Delta Exchange / Broker APIs
│   ├── journal/        # Trader psychology and discipline reflection journal
│   ├── landing/        # Public hero, KPI statistics, preview feed, top analysts
│   ├── notifications/  # Alert feed with mark-as-read mutations
│   ├── performance/    # Theoretical return curve and monthly track records
│   ├── predictions/    # Multi-filter search, creation form, detail view, outcome modal
│   ├── pricing/        # Public plan comparison
│   ├── profile/        # Personal settings and 2FA security
│   ├── settings/       # Alert toggles & color theme settings
│   ├── subscriptions/  # In-app tier upgrades & simulated checkout modal
│   ├── traders/        # Verified directory & analyst public profiles
│   └── watchlist/      # Saved forecast tracker
├── hooks/              # Query & mutation hooks (TanStack Query) & useDebounce
├── layouts/            # AppShell, Collapsible Sidebar, Topbar, AuthLayout
├── schemas/            # Zod validation schemas (direction-aware superRefine)
├── services/
│   ├── api/            # API client contracts and typed response interfaces
│   └── mock/           # In-memory mock service and sample database
├── state/              # Zustand stores (useAuthStore, useUIStore, useMarketStore, etc.)
└── types/              # Domain TypeScript types
```

---

## 🔐 RBAC (Role-Based Access Control)

| Role | Access Permissions |
|---|---|
| **USER** | Browse public & subscribed predictions, follow analysts, manage personal watchlist, configure alert preferences |
| **TRADER** | Create and publish forecasts, declare target/stop outcomes, record mindset journal reflections, configure public analyst profile |
| **ADMIN** | Manage platform users & roles, approve/revoke verified trader badges, moderate prediction setups, view security audit logs, configure system flags |

> **DEV Note:** Use the topbar Role Switcher dropdown to instantly test the platform from any role's perspective.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Run Test Suite
```bash
npx vitest run
```

### 4. Build Production Bundle
```bash
npm run build
```

---

## 🧪 Testing & Verification

- **14 Unit & Integration Tests**: Validates Zod direction schemas (`superRefine`), Zustand stores (`useAuthStore`, `useUIStore`, `useUserStore`), and mathematical Risk/Reward calculation formulas.
- **Production Bundle**: All 60+ routes and chunks are code-split and compile in under **1.5s** with zero errors.
