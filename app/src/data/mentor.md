# Mentors (Heroes)

The AI personas users can chat with in simFolio. Sage is a fictional onboarding
guide; all others are real investors the LLM embodies.

Source of truth in code:
- `heroes.js` — hero data shown in the UI (names, bios, philosophy, matching)
- `supabase/functions/hero-chat/index.ts` — LLM persona prompts

| ID | Name | Style | Famous For |
|----|------|-------|------------|
| `sage` | Sage | Socratic · encouraging · plain language (onboarding guide, steps back after first trade) | Fictional guide — not a real investor. |
| `warren` | Warren Buffett | Value Investing | Building Berkshire Hathaway and advocating long-term fundamental stock ownership. |
| `munger` | Charlie Munger | Value Investing & Mental Models | Serving as Buffett's witty partner and promoting multidisciplinary thinking in business. |
| `graham` | Benjamin Graham | Traditional Value Investing | Writing *The Intelligent Investor* and defining the "margin of safety" concept. |
| `lynch` | Peter Lynch | Growth at a Reasonable Price (GARP) | Generating 29% average annual returns with the Fidelity Magellan Fund. |
| `templeton` | Sir John Templeton | Contrarian & Global Investing | Pioneering international mutual funds and buying assets during market panics. |
| `soros` | George Soros | Global Macro Trading | Shorting the British pound in 1992 and making $1 billion in a single day. |
| `ray` | Ray Dalio | Global Macro & Risk Parity | Founding Bridgewater Associates and creating the "All Weather" portfolio strategy. |
| `tudorjones` | Paul Tudor Jones | Macro Trading & Technical Analysis | Predicting and heavily profiting from the 1987 Black Monday market crash. |
| `druckenmiller` | Stanley Druckenmiller | Global Macro | Managing Soros's Quantum Fund and achieving a multi-decade streak with zero losing years. |
| `tepper` | David Tepper | Distressed Asset Investing | Buying heavily discounted bank stocks during the 2008 financial crisis for massive gains. |
| `icahn` | Carl Icahn | Activist Investing | Corporate raiding and forcing public companies to restructure to lift share prices. |
| `ackman` | Bill Ackman | Concentrated Activist Investing | Launching massive, highly publicized corporate campaigns through Pershing Square. |
| `loeb` | Daniel Loeb | Event-Driven & Activist Investing | Writing aggressive, sharp letters to corporate boards to force executive changes. |
| `cathie` | Cathie Wood | Aggressive Growth Investing | Making bold, high-profile bets on disruptive innovation and tech through ARK Invest. |
| `chamath` | Chamath Palihapitiya | Growth Capital & Venture Capital | Popularizing Special Purpose Acquisition Companies (SPACs) during the tech boom. |
| `simons` | Jim Simons | Quantitative & Algorithmic Trading | Creating the Medallion Fund, the most profitable mathematical fund in history. |
| `griffin` | Kenneth C. Griffin | Multi-Strategy Quantitative Trading | Building Citadel into an elite hedge fund and dominant global market maker. |
| `bogle` | John C. (Jack) Bogle | Passive Index Investing | Founding Vanguard and inventing the low-cost retail index fund for everyday people. |
| `livermore` | Jesse Livermore | Momentum & Price Action Trading | Making and losing multiple fortunes in the early 1900s through price trend reading. |
| `burry` | Michael Burry | Value & Credit Default Swaps | Correctly forecasting and betting against the 2008 U.S. subprime mortgage collapse. |

Implemented in the app today: `sage`, `warren`, `munger`, `lynch`, `bogle`,
`ray`, `cathie`. The rest are candidates — adding one requires an entry in
`heroes.js`, a persona in the `hero-chat` edge function, and an avatar in
`HeroMessage.jsx`.

Rules (from the design spec):
- Heroes are introduced only after the user's first trade; Sage guides before that.
- Maximum council of 3 heroes, sharing one chat window.
- Hero responses are always English, always questions/observations — never directives.
