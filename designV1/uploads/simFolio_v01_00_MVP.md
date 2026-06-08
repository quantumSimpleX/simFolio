# simFolio MVP Product Requirements Document (PRD)

Version: 1.0
Status: MVP

## Executive Summary

simFolio is an AI-powered investing simulation platform that helps beginners learn investing by making investment decisions alongside legendary investing Heroes.

### Core Differentiator
- Real market data
- Simulated portfolio
- AI-powered investing Heroes
- Learn-as-you-do experience
- Contextual investing education

## Product Vision

An investing flight simulator where users learn how legendary investors think by making real-world investment decisions in a safe environment.

## Product Principles

### Learn-As-You-Do
Users learn while making investment decisions. No mandatory courses, quizzes, or lessons.

### Hero-Driven Learning
Heroes are the primary educational mechanism.

### User-Controlled Experience
Nothing happens on a mandatory schedule. Portfolio reviews and learning opportunities are always optional.

### Educational Only
Heroes provide educational perspectives, not financial advice.

## Target Audience

- Beginner investors
- First-time investors
- Students
- Young professionals
- International users learning investing terminology

## MVP Scope

### Included
- User accounts
- Hero discovery interview
- Hero recommendation engine
- Hero selection (1–3 Heroes)
- Portfolio simulation
- Stocks
- ETFs
- Crypto
- Buy/Sell transactions
- Real-time market data
- Hero consultation
- Hero commentary
- Achievement system
- English and Traditional Chinese onboarding
- Light/Dark mode

### Excluded
- Real money investing
- Margin
- Options
- Futures
- Short selling
- Social features
- Copy trading

## Core User Journey

1. Create account
2. Complete onboarding interview
3. Discover recommended Heroes
4. Select 1–3 Heroes
5. Receive virtual portfolio capital based on user's stated investable capital
6. Begin investing
7. Consult Heroes before and after decisions
8. Learn through portfolio outcomes and Hero interactions

## Hero Discovery Engine

### Interview Topics
- Available investable capital
- Time horizon
- Investment goals
- Risk tolerance
- Investment interests
- Existing investing Hero (optional)

### Supported Languages
- English
- Traditional Chinese (Taiwan)

### Recommendation Engine
Recommend 3 Heroes based on:
- Capital available
- Time horizon
- Goals
- Risk profile
- Interests

## Hero Library

Initial curated Heroes:
- Warren Buffett
- Charlie Munger
- Peter Lynch
- John Bogle
- Ray Dalio
- Cathie Wood

Users may request another well-known investor if they admire someone specific.

## Hero Council

- Minimum: 1 Hero
- Maximum: 3 Heroes
- Hard cap: 3

Selected Heroes form the user's Hero Council.

## Hero Simulation Model

Heroes are AI-generated simulations based on:
- Books
- Shareholder letters
- Interviews
- Speeches
- Public writings
- Historical investment decisions
- Documented philosophies

Heroes respond in first person.

Example:

> I would want to understand the company's competitive advantage before investing.

Heroes always respond in English.

## Hero Consultation Engine

Users may ask Heroes free-form questions at any time.

Examples:
- What do you think of this company?
- Would you invest?
- What concerns you?
- What am I missing?
- Am I diversified enough?

## Hero Commentary Engine

Heroes may proactively comment during important moments:

- First stock purchase
- First crypto purchase
- Portfolio concentration
- Diversification milestone
- Large gains
- Large losses
- Frequent trading behavior

Commentary should be infrequent and high-value.

## Portfolio Reviews

The platform may suggest reviews.

Example:
> Your Heroes would like to review your portfolio.

User options:
- Review now
- Remind me later
- Dismiss

Reviews are always optional.

## Portfolio Simulator

### Supported Assets
- Stocks
- ETFs
- Crypto

### Supported Orders
- Market Order
- Limit Order

### Supported Transactions
- Buy
- Sell

## Market Data

Requirements:
- Real-time pricing
- Historical prices
- Company profiles
- ETF data
- Crypto data

## Achievement & Discovery System

No explicit curriculum.

### Examples
- First Stock Purchased
- First ETF Purchased
- First Crypto Purchased
- First Hero Consultation
- First Diversified Portfolio

### Collections
Achievements can belong to collections.

### Trophies
Collections can unlock trophies.

### Re-Engagement
If no new achievement is earned for 30 days, Heroes may suggest new investing experiences to explore.

## Language Requirements

### Onboarding
Available in:
- English
- Traditional Chinese

### Hero Responses
Always English.

No automatic translation in MVP.

## UI Requirements

### Global Controls
- Light mode toggle
- Dark mode toggle
- Language toggle

Available from all screens.

## Authentication

MVP:
- Email login
- Password login

Future:
- Google login
- Apple login

## Core Data Model

### Users
- id
- email
- password_hash
- language_preference
- theme_preference

### Hero Selections
- user_id
- hero_id

### Portfolios
- user_id
- starting_capital
- cash_balance

### Holdings
- asset_symbol
- quantity
- average_cost_basis

### Transactions
- symbol
- buy_or_sell
- quantity
- price
- timestamp

### Achievements
- achievement_type
- unlocked_at

### Hero Conversations
- hero_id
- message
- response
- timestamp

## Hero Response Inputs

- Hero identity
- Hero knowledge profile
- User onboarding data
- User portfolio
- Current holdings
- Current market data
- Conversation history

## Compliance

Display disclaimer during onboarding:

> Heroes are AI-generated simulations based on publicly available information. Responses are educational only and do not constitute financial advice.

## Success Metrics

Primary:
- Onboarding completion rate
- Hero selection rate
- First investment rate
- Hero consultation rate
- WAU / MAU
- Retention

Secondary:
- Questions per user
- Portfolio review participation
- Achievement unlocks

## MVP Success Definition

The MVP succeeds if users demonstrate that they want to learn investing by interacting with legendary Heroes while managing a simulated portfolio.

## APPENDIX: Technical Implementation Specifications for AI Coding Agent

### A1. Unified Bilingual Jargon Dictionary (`glossary.json`)
The frontend framework must render educational tooltips via touch/hover interactions using a central dictionary mapped to English UI components:

{
  "market_order": {
    "en": { "title": "Market Order", "definition": "Buy or sell right now at the current market price." },
    "zh-TW": { "title": "市價單 (Market Order)", "definition": "立即進行買進或賣出。您願意立刻接受市場上目前的任何報價。" }
  },
  "limit_order": {
    "en": { "title": "Limit Order", "definition": "Set a maximum buy price or minimum sell price. Executes only if hit." },
    "zh-TW": { "title": "限價單 (Limit Order)", "definition": "由您決定價格。只有當股票達到您設定的精確價格時，交易才會執行。" }
  },
  "cost_basis": {
    "en": { "title": "Cost Basis", "definition": "The total average amount of money you spent to buy your current shares." },
    "zh-TW": { "title": "持倉成本 (Cost Basis)", "definition": "您購買目前持有股數所花費的平均總金額（包含交易手續費）。" }
  }
}

### A2. Relational Database Schema (PostgreSQL)
Expand the MVP 'Core Data Model' into strict, migration-ready DDL. Enforce cascading deletes for users, track strict numeric types for financial accuracy, and isolate Hero selections:

CREATE TYPE order_status AS ENUM ('QUEUED', 'FILLED', 'CANCELLED');
CREATE TYPE order_type AS ENUM ('MARKET', 'LIMIT');
CREATE TYPE txn_side AS ENUM ('BUY', 'SELL');
CREATE TYPE asset_class AS ENUM ('STOCK', 'ETF', 'CRYPTO');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    language_preference VARCHAR(10) DEFAULT 'en',
    theme_preference VARCHAR(10) DEFAULT 'dark',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_balances (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    cash_balance NUMERIC(15, 4) NOT NULL,
    starting_capital NUMERIC(15, 4) NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE hero_selections (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    hero_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, hero_id)
);

CREATE TABLE orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    asset_type asset_class NOT NULL,
    side txn_side NOT NULL,
    type order_type NOT NULL,
    requested_qty NUMERIC(12, 4) NOT NULL,
    limit_price NUMERIC(12, 4),
    status order_status DEFAULT 'QUEUED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE executions (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(order_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    filled_qty NUMERIC(12, 4) NOT NULL,
    execution_price NUMERIC(12, 4) NOT NULL,
    fees_deducted NUMERIC(8, 2) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE positions (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    asset_type asset_class NOT NULL,
    total_qty NUMERIC(12, 4) NOT NULL CHECK (total_qty >= 0),
    average_cost_basis NUMERIC(12, 4) NOT NULL,
    PRIMARY KEY (user_id, ticker)
);

### A3. Core API Routes & Computational Logic
1. `GET /api/v1/portfolio` 
   - Calculate Valuation: `Cash Balance + Sum(Positions.total_qty * Current Market Price)`.
2. `POST /api/v1/orders/place`
   - Evaluate standard market hours (Mon-Fri, 9:30 AM – 4:00 PM EST).
   - If market is closed and `type == 'MARKET'`, insert order as `QUEUED`.
   - If execution occurs, inject a simulated `0.01% - 0.05%` slippage to `execution_price`, update `user_balances`, and dynamically recalculate `positions.average_cost_basis`.