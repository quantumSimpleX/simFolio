# simFolio — Setup Guide

## Prerequisites
- Node.js 18+
- [Supabase account](https://supabase.com) (free tier works)
- [Finnhub account](https://finnhub.io) — free API key
- [OpenRouter account](https://openrouter.ai) — free API key + free model

---

## 1. Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/migrations/001_initial_schema.sql`
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (needed for Edge Functions)

---

## 2. Environment Variables

**Frontend** (`app/.env.local`):
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Edge Function Secrets** (set via Supabase Dashboard → Edge Functions → Secrets, or via CLI):
```
FINNHUB_API_KEY=your-finnhub-key
OPENROUTER_API_KEY=your-openrouter-key
APP_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 3. Deploy Edge Functions (optional for dev)

If you want to use Edge Functions locally, install the Supabase CLI:
```bash
npx supabase login
npx supabase link --project-ref your-project-id
npx supabase functions serve
```

Or deploy to production:
```bash
npx supabase functions deploy market-data
npx supabase functions deploy place-order
npx supabase functions deploy hero-chat
```

Without deployed Edge Functions, the app boots and shows UI — live prices, trading, and hero chat will return errors until the functions are deployed.

---

## 4. Run the App

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Flow

1. **Sign up** → fills in name/email/password → creates Supabase auth user
2. **Onboarding** → 8 questions → seeds `user_balances` (starting capital) + `hero_selections`
3. **Portfolio** → live holdings via `usePortfolio` hook (Finnhub prices via `market-data` Edge Fn)
4. **Buy/Sell** → `place-order` Edge Fn → executes with slippage → writes `executions` + updates `positions` + triggers achievements
5. **Hero chat** → `hero-chat` Edge Fn → OpenRouter LLM → persisted to `hero_conversations`
6. **Achievements** → Postgres trigger on `executions` insert → writes to `achievements`

---

## Architecture

```
React (Vite)                Supabase                        External
─────────────────           ────────────────────────        ──────────────
AuthContext              →  Auth (email/password)
ThemeContext             →  users.theme_preference
LanguageContext          →  users.language_preference
TanStack Query hooks     →  Postgres (RLS per user)
  useQuotes()            →  Edge Fn: market-data   ───────→  Finnhub REST
  usePortfolio()         →  positions + user_balances
  usePlaceOrder()        →  Edge Fn: place-order   ───────→  Finnhub (exec price)
  useHeroChat()          →  Edge Fn: hero-chat     ───────→  OpenRouter LLM
  useAchievements()      →  achievements table
  useOrders()            →  orders + executions tables
```
