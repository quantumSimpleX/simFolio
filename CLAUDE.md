# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**simFolio** is an AI-powered investing simulation platform. Users trade with virtual cash using real-time market data, guided by AI personas of legendary investors ("Heroes"). This repo contains the app source and design handoff assets.

## Repository Structure

```
app/          — React 19 + Vite frontend (the actual application)
designV1/     — Design handoff bundle: wireframes, hi-fi HTML prototypes, and design notes
designSys/    — Quantum Simplex design system assets (fonts, brand tokens, CSS primitives)
```

## App Commands

All commands run from the `app/` directory:

```bash
npm run dev              # start dev server (Vite HMR)
npm run build            # production build
npm run preview          # preview production build locally
npm run lint             # ESLint
npm run test             # Vitest (run once)
npm run test:coverage    # Vitest with v8 coverage (enforces 80%+ line coverage)
npx vitest run src/test/execution.test.js   # run a single test file
```

## Tech Stack

- **React 19** with JSX (no TypeScript)
- **React Router DOM v7** for routing
- **Vite 8** as bundler
- **TanStack React Query v5** — all server state; query keys are `['portfolio']`, `['orders']`, `['quotes', ticker]`, `['hero-history', userId, heroId]`, `['conversation-history', userId]`
- **Supabase** — Postgres DB + Auth + Edge Functions (Deno/TypeScript)
- **Vitest + Testing Library** — 11 test files in `app/src/test/`

## Supabase Edge Functions

Live in `app/supabase/functions/`. Each is a standalone Deno module deployed separately:

| Function | Purpose |
|---|---|
| `place-order` | Validates + executes a trade; calls `_shared/execution.ts` for realistic fill pricing |
| `execute-queued` | Cron-like handler that fills queued orders at market open |
| `hero-chat` | Proxies messages to the LLM via OpenRouter; persists to `hero_conversations` |
| `market-data` | Fetches live quotes + candles from Yahoo Finance; writes to `market_data_cache` |
| `_shared/execution.ts` | Shared spread/slippage/partial-fill model; also used by `execute-queued` |

Edge functions require a logged-in user JWT (`session.access_token`) in the `Authorization` header — they return 401/422 otherwise.

## Key Patterns

**Tokens** — always import colors and font stacks from `src/tokens.js`, not from CSS directly:
```js
import { C, SANS, DISPLAY, MONO } from '../../tokens'
// C.ink900, C.ame400, C.aqua400, C.red, C.gold …
```

**Breakpoints** — three tiers, single source of truth in `src/hooks/useBreakpoint.js`:
- `mobile` < 768px · `tablet` 768–1023px · `desktop` ≥ 1024px
- Use `useBreakpoint()` or `useIsMobile()`; `App.jsx` also has a local `useIsMobile` for route switching

**Responsive zoom** — `body { zoom }` is applied in `src/index.css` (1.12 tablet / 1.28 desktop / 1.38 wide). Viewport-relative calcs inside zoomed elements must divide by `var(--zoom)`:
```css
height: calc(100dvh / var(--zoom) - 100px)
```

**Market data cache** — quotes are stored in `market_data_cache` (Supabase table) with a 5-hour TTL. `src/lib/marketCache.js` handles DB reads/writes. Fundamentals (P/E, market cap, etc.) are persisted separately and survive quote refreshes.

## Active Dev Shortcuts (TODO stubs to restore before production)

- `/` redirects straight to `/onboarding` — bypasses welcome/auth screens
- `PrivateRoute` and `OnboardingRoute` in `App.jsx` are transparent (no auth check)
- `usePlaceOrder` falls back to a no-op if `session` is null

## Design System (QSXC / Quantum Simplex)

Reference `designSys/colors_and_type.css` and `designSys/base.css` for all design tokens and component primitives. Key tokens:

| Token | Hex | Use |
|-------|-----|-----|
| `paper` | `#FAFAF7` | Default surface |
| `ink-900` | `#0A0E14` | Primary CTA, headings |
| `ink-400` | `#7E8794` | Muted labels |
| `ink-100` | `#E6E9ED` | Dividers, card borders |
| `ame-400` | `#8A60EB` | Brand primary, selection states |
| `aqua-400` | `#1FC3A4` | Gains, Sage avatar, markets-open indicator |
| `red` | `#D43A2F` | Losses, sell CTA |
| `gold` | `#B5860A` | Warnings, queued order state |

**Typography:**
- Display: MOMCAKE Bold — one number per screen only (portfolio value, stock price). **Allowed exception:** the "simFolio" nav wordmark also uses MOMCAKE and is excluded from the one-per-screen count (it is a brand mark, not a stat).
- UI sans: Barlow Condensed — all labels, body, buttons (load from Google Fonts)
- Mono: Source Code Pro — timestamps, IDs, trade receipts

**Component rules (locked):**
- Border radius: 0px blocks · 4px inputs/chips · 8px cards · 999px pills
- Primary CTA: ink-900 fill, white text, 4px radius, 48px height
- No gradients in product UI — sole exception: Master of Trading CTA (amethyst→gold)
- No emoji, ever
- Eyebrow labels: Barlow Condensed, 11px, uppercase, `letter-spacing: 0.14em`
- Hero messages: always italic, always a question or observation — never a directive

## Design Handoff

The primary product spec is `designV1/designHANDOFF.md`. Read it before implementing any UI. Hi-fi HTML prototypes live in `designV1/hifi/` — read the HTML source directly rather than rendering it. Key selected variations:

- **Onboarding variation**: A (Chat-first) selected
- **Portfolio layout**: 02B (Advisor's Room) selected — desktop two-column with hero sidebar, mobile two-tab (Portfolio / Ask)

## Core Architecture Concepts

### Hero System
- **Sage**: neutral onboarding guide (aqua, ◇ symbol). Steps back permanently after first trade.
- **Heroes**: AI personas (Warren Buffett, Cathie Wood, Ray Dalio, etc.) introduced AFTER the user's first trade — never before (one exception: user has zero stock ideas during onboarding).
- MVP scope: a single active mentor. The multi-hero council (up to 3 heroes introduced organically by Hero 1, sharing one chat window) is deferred to a later version.

### Trade Flow Rules
- Market orders placed outside market hours (Mon–Fri 9:30 AM–4:00 PM EST) are queued, executed at next open.
- Slippage always triggers an automatic education card when execution price differs from order price.
- Sell flow always shows a Hero inline comment (question form only) and a post-sell reflection prompt.

### Educational Tooltip System
- Dotted amethyst underline on terms → hover (desktop) or tap/long-press (mobile) shows definition.
- Mobile: full-width bottom sheet with EN/繁中 language tabs.
- Desktop: 8px radius card tooltip with EN/繁中 tabs.
- Tooltip content is driven by a central `glossary.json` (see PRD Appendix A1 for structure).

### Achievement System
- Declarative model in `app/src/gamification/defs.js`: 15 badges (`ACHIEVEMENTS`) are the only persisted unit. Medals (`MEDALS`) and trophies (`TROPHIES`) are derived — never stored — via `computeProgression()`.
- Medals: 4 thematic (require a full themed badge set) + 3 milestone "Explorer" tiers (any 5 / 10 / 15 badges). The single trophy, "Master of Trading" (`trophy_master`), requires every medal.
- Badge earned moments: full-screen ink-900, no bounce animations — deliberate and earned

### Database Schema
See PRD Appendix A2 (`designV1/uploads/simFolio_v01_00_MVP.md`) for migration-ready PostgreSQL DDL with correct numeric types (`NUMERIC(15,4)`) for financial accuracy.

## Bilingual Requirements

- UI: English only
- Educational tooltips and onboarding: English + Traditional Chinese (繁體中文)
- Hero responses: always English
- Language preference stored per user; toggle available from all screens
