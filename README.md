# simFolio

**Learn investing by doing it — with legendary investors as your guide. No real money, real consequences for your understanding.**

## Why

Most people learn to invest the expensive way: with real money, real losses, and no one to explain what just happened. Financial literacy content that *does* exist tends to be either too abstract (articles, courses) or too intimidating (a live brokerage app dropping a beginner into real markets with zero guidance).

simFolio exists to close that gap — a simulated trading environment where mistakes are free, feedback is immediate, and every trade is an opportunity to learn a real concept (slippage, market hours, diversification, order types) at the exact moment it becomes relevant.

## What

simFolio is an AI-powered investing simulation platform. Users trade with **virtual cash** against **real-time market data**, and are coached along the way by AI personas of legendary investors ("Heroes" — e.g. Warren Buffett, Cathie Wood, Ray Dalio).

Core mechanics:
- **Realistic trading** — live quotes, market-hours enforcement (orders placed outside 9:30 AM–4:00 PM EST queue for next open), spread/slippage modeling, and partial fills — so the numbers behave like a real market, not a toy.
- **Hero mentorship** — a neutral onboarding guide ("Sage") gets users through their first trade, then hands off to a Hero whose investing philosophy shapes how it comments on the user's decisions. Hero commentary is always framed as a question or observation, never a directive.
- **In-context education** — glossary-backed tooltips (hover on desktop, tap on mobile) explain financial terms exactly where they appear, in English and Traditional Chinese.
- **Gamification** — a declarative badge system (achievements → medals → trophies) rewards behaviors like diversifying, holding through volatility, or completing the onboarding flow, without needing real financial stakes to feel meaningful.

## Who it's for

- **Complete novices** — the primary audience starts at zero financial literacy. The app teaches concepts in the moment, not in a manual.
- **Non-native English speakers** — the trading UI stays in English (since real-world platforms are English-dominant), but educational content is bilingual (English / 繁體中文) so the *learning* isn't gated by language.
- **Anyone who wants to build trading intuition before risking real money** — practicing order types, reacting to slippage, or just getting comfortable with the mechanics of a portfolio.

## How it works (technical overview)

```
app/          — React 19 + Vite frontend (the actual application)
designV1/     — Design handoff bundle: wireframes, hi-fi HTML prototypes, design notes
designSys/    — Quantum Simplex (QSXC) design system assets: fonts, brand tokens, CSS primitives
```

### Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 (JSX, no TypeScript), React Router DOM v7, Vite 8 |
| Server state | TanStack React Query v5 (`portfolio`, `orders`, `quotes`, `hero-history`, `conversation-history` query keys) |
| Backend | Supabase — Postgres DB, Auth, Edge Functions (Deno/TypeScript) |
| Testing | Vitest + Testing Library (80%+ line coverage enforced) |

### Backend (Supabase Edge Functions — `app/supabase/functions/`)

| Function | Purpose |
|---|---|
| `place-order` | Validates and executes a trade; calls `_shared/execution.ts` for realistic fill pricing |
| `execute-queued` | Cron-like handler that fills queued orders at market open |
| `hero-chat` | Proxies messages to the LLM via OpenRouter; persists to `hero_conversations` |
| `market-data` | Fetches live quotes and candles from Yahoo Finance; writes to `market_data_cache` |
| `_shared/execution.ts` | Shared spread/slippage/partial-fill model used by both `place-order` and `execute-queued` |

Edge functions require a logged-in user JWT (`Authorization` header) — secrets and third-party API calls never happen client-side. Market data is cached for 5 hours to bound external API volume; fundamentals (P/E, market cap, etc.) persist independently of quote refreshes.

### Design system

Visual and interaction rules come from **QSXC (Quantum Simplex)** — see `designSys/colors_and_type.css` and `designSys/base.css`. Locked conventions include a fixed border-radius scale (0/4/8/999px), no gradients (one deliberate exception), no emoji, and a strict one-display-number-per-screen typography rule. Full product spec lives in `designV1/designHANDOFF.md`.

## Getting started

```bash
cd app
npm install
npm run dev              # start dev server (Vite HMR)
```

Other commands (run from `app/`):

```bash
npm run build             # production build
npm run preview           # preview production build locally
npm run lint               # ESLint
npm run test                # Vitest (run once)
npm run test:coverage    # Vitest with coverage (80%+ line coverage enforced)
```

> **Note:** this repo currently has some active dev shortcuts in place (e.g. `/` redirects straight to onboarding, auth is bypassed) — see `CLAUDE.md` for the full list before treating any branch as production-ready.

## Contributing / development guide

`CLAUDE.md` in the repo root is the canonical reference for architecture, tokens, breakpoints, and core product rules (Hero system, trade flow rules, achievement system, bilingual requirements) — read it before making non-trivial changes.
