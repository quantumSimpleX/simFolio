# Mentors (Heroes)

The AI personas users can chat with in simFolio. Sage is a fictional onboarding
guide; all others are real investors the LLM embodies.

Source of truth in code:
- `heroes.js` — hero data shown in the UI (names, bios, philosophy, matching)
- `supabase/functions/hero-chat/index.ts` — LLM persona prompts

| ID | Name | Style |
|----|------|-------|
| `sage` | Sage | Socratic · encouraging · plain language (onboarding guide, steps back after first trade) |
| `warren` | Warren Buffett | Value investing · long-term · quality businesses |
| `munger` | Charlie Munger | Mental models · concentrated bets · intellectual honesty |
| `lynch` | Peter Lynch | Growth at a reasonable price · everyday companies · homework |
| `bogle` | John Bogle | Index investing · low-cost · stay the course |
| `ray` | Ray Dalio | Macro · diversification · all-weather |
| `cathie` | Cathie Wood | Disruptive technology · concentrated · high-conviction |

Rules (from the design spec):
- Heroes are introduced only after the user's first trade; Sage guides before that.
- Maximum council of 3 heroes, sharing one chat window.
- Hero responses are always English, always questions/observations — never directives.
