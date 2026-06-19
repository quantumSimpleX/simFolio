export const HERO_DATA = {
  sage: {
    id: 'sage',
    initials: '◇',
    name: 'Sage',
    color: 'var(--aqua-400)',
    philosophy: 'Neutral educational guide. Helps beginners learn the mechanics of investing without bias toward any particular strategy.',
    bio: 'Your onboarding guide. Steps back after your first trade.',
    style: 'Socratic · encouraging · plain language',
  },
  warren: {
    id: 'warren',
    initials: 'WB',
    name: 'Warren Buffett',
    color: 'var(--ame-400)',
    philosophy: 'Buy wonderful companies at fair prices and hold them forever. Focus on businesses you understand, with durable competitive advantages and honest management.',
    bio: 'Chairman of Berkshire Hathaway. Known for value investing and long-term thinking. One of the greatest investors of all time.',
    style: 'Value investing · long-term · quality businesses',
    matchFor: ['Build long-term wealth', 'Learn how investing works'],
    knownFor: 'Coca-Cola, Apple, American Express — businesses with moats',
  },
  munger: {
    id: 'munger',
    initials: 'CM',
    name: 'Charlie Munger',
    color: 'var(--ink-600)',
    philosophy: 'Use mental models from multiple disciplines to make better decisions. Own a few great businesses rather than diversifying into mediocrity.',
    bio: 'Vice Chairman of Berkshire Hathaway. Buffett\'s longtime partner. Known for mental models and intellectual rigor.',
    style: 'Mental models · concentrated bets · intellectual honesty',
    matchFor: ['Build long-term wealth'],
    knownFor: 'Thinking across disciplines, inversion, avoiding stupidity',
  },
  lynch: {
    id: 'lynch',
    initials: 'PL',
    name: 'Peter Lynch',
    color: 'var(--ame-500)',
    philosophy: 'Invest in what you know. Find great companies in everyday life before Wall Street discovers them. Do your homework; ten-baggers are found by ordinary investors.',
    bio: 'Ran Fidelity Magellan Fund 1977–1990, returning 29% annually. Author of "One Up on Wall Street".',
    style: 'Growth at a reasonable price · everyday companies · homework',
    matchFor: ['Learn how investing works', 'Just exploring for now'],
    knownFor: 'Dunkin Donuts, Taco Bell — found by walking the mall',
  },
  bogle: {
    id: 'bogle',
    initials: 'JB',
    name: 'John Bogle',
    color: 'var(--aqua-600)',
    philosophy: 'Own the whole market at the lowest cost. Time in the market beats timing the market. The relentless arithmetic of costs compounds against you.',
    bio: 'Founder of Vanguard. Creator of the first index fund. Saved investors hundreds of billions in fees.',
    style: 'Index investing · low-cost · stay the course',
    matchFor: ['Build long-term wealth', 'Beat my savings account', 'Save for something specific'],
    knownFor: 'VTI, VOO — total market index funds',
  },
  ray: {
    id: 'ray',
    initials: 'RD',
    name: 'Ray Dalio',
    color: 'var(--gold)',
    philosophy: 'Diversify across truly uncorrelated assets. Understand the economic machine. Build an all-weather portfolio that performs in any environment.',
    bio: 'Founder of Bridgewater Associates. Author of "Principles". Pioneer of risk parity and systematic macro investing.',
    style: 'Macro · diversification · all-weather',
    matchFor: ['Build long-term wealth', 'Beat my savings account'],
    knownFor: 'All-Weather Portfolio: stocks, bonds, gold, commodities',
  },
  graham: {
    id: 'graham',
    initials: 'BG',
    name: 'Benjamin Graham',
    color: 'var(--ink-400)',
    philosophy: 'Buy securities trading well below their intrinsic value. Always demand a margin of safety. The market is a voting machine short-term, a weighing machine long-term.',
    bio: 'The father of value investing. Buffett\'s teacher at Columbia. Author of "The Intelligent Investor" and "Security Analysis".',
    style: 'Deep value · margin of safety · defensive',
    knownFor: 'Net-nets, Mr. Market, the margin of safety principle',
  },
  soros: {
    id: 'soros',
    initials: 'GS',
    name: 'George Soros',
    color: 'var(--ame-600)',
    philosophy: 'Markets are driven by reflexivity — prices influence the fundamentals they are supposed to reflect. Find the flaw in the consensus and bet big when you are right.',
    bio: 'Founder of the Quantum Fund. Famous for "breaking the Bank of England" in 1992. Pioneer of global macro investing.',
    style: 'Global macro · reflexivity · bold contrarian bets',
    knownFor: 'Shorting the British pound, currency and macro trades',
  },
  cathie: {
    id: 'cathie',
    initials: 'CW',
    name: 'Cathie Wood',
    color: 'var(--aqua-400)',
    philosophy: 'Disruptive innovation creates exponential growth. Concentrate in platforms that are changing the world. Volatility is the price of extraordinary returns.',
    bio: 'Founder and CEO of ARK Invest. Pioneer of thematic innovation investing.',
    style: 'Disruptive technology · concentrated · high-conviction',
    matchFor: ['Build long-term wealth', 'Just exploring for now'],
    knownFor: 'Tesla, CRISPR, blockchain — transformative technologies',
  },
  templeton: {
    id: 'templeton',
    initials: 'JT',
    name: 'Sir John Templeton',
    color: 'var(--aqua-600)',
    philosophy: 'Buy at the point of maximum pessimism. Hunt for bargains globally, where others are too fearful to look. The four most dangerous words in investing are "this time it\'s different".',
    bio: 'Pioneer of international mutual funds. Famously bought beaten-down stocks during market panics and held for the long term.',
    style: 'Contrarian · global · bargain-hunting',
    knownFor: 'Buying during panics, pioneering global diversification',
  },
  tudorjones: {
    id: 'tudorjones',
    initials: 'PT',
    name: 'Paul Tudor Jones',
    color: 'var(--gold)',
    philosophy: 'Play great defense, not great offense. Cut losses fast, ride winners, and respect the trend. The most important rule is to protect your capital.',
    bio: 'Macro trader who famously predicted and profited from the 1987 Black Monday crash. Founder of Tudor Investment Corporation.',
    style: 'Macro · technical · risk-first trading',
    knownFor: 'Calling the 1987 crash, disciplined risk management',
  },
  druckenmiller: {
    id: 'druckenmiller',
    initials: 'SD',
    name: 'Stanley Druckenmiller',
    color: 'var(--ame-600)',
    philosophy: 'When you are right, bet big. Concentrate into your highest-conviction macro ideas and size up when the odds are in your favour. Preserve capital first, then go for home runs.',
    bio: 'Ran Soros\'s Quantum Fund and his own Duquesne Capital with a decades-long streak of no losing years.',
    style: 'Global macro · high-conviction · concentrated',
    knownFor: 'Decades with zero down years, big concentrated bets',
  },
  tepper: {
    id: 'tepper',
    initials: 'DT',
    name: 'David Tepper',
    color: 'var(--ink-600)',
    philosophy: 'Buy fear. The best opportunities come from distressed and beaten-down assets when everyone else is panicking. Be willing to be greedy when others are terrified.',
    bio: 'Founder of Appaloosa Management. Made enormous gains buying discounted bank stocks during the 2008 crisis.',
    style: 'Distressed · contrarian · opportunistic',
    knownFor: 'Buying distressed banks in 2008 for outsized gains',
  },
  icahn: {
    id: 'icahn',
    initials: 'CI',
    name: 'Carl Icahn',
    color: 'var(--ame-500)',
    philosophy: 'Find undervalued companies and push management to unlock value. A good activist forces change where boards are complacent.',
    bio: 'Legendary activist investor and corporate raider who forces public companies to restructure for shareholder value.',
    style: 'Activist · contrarian · value-unlocking',
    knownFor: 'Activist campaigns forcing corporate restructuring',
  },
  ackman: {
    id: 'ackman',
    initials: 'BA',
    name: 'Bill Ackman',
    color: 'var(--ame-400)',
    philosophy: 'Concentrate in a handful of high-quality, simple, predictable businesses — then engage actively when change is needed. Conviction over diversification.',
    bio: 'Founder of Pershing Square. Known for large, highly public, concentrated activist positions.',
    style: 'Concentrated activist · high-conviction · long-term',
    knownFor: 'Bold public campaigns through Pershing Square',
  },
  loeb: {
    id: 'loeb',
    initials: 'DL',
    name: 'Daniel Loeb',
    color: 'var(--ink-400)',
    philosophy: 'Find the catalyst. Event-driven situations — restructurings, spin-offs, management changes — create mispricings worth pressing hard.',
    bio: 'Founder of Third Point. Famous for sharp, aggressive letters to corporate boards demanding change.',
    style: 'Event-driven · activist · catalyst-focused',
    knownFor: 'Aggressive activist letters and event-driven bets',
  },
  chamath: {
    id: 'chamath',
    initials: 'CP',
    name: 'Chamath Palihapitiya',
    color: 'var(--aqua-400)',
    philosophy: 'Back bold, world-changing technology early. Growth and venture-style conviction can compound into generational outcomes — if you can stomach the volatility.',
    bio: 'Venture and growth investor who popularized SPACs during the tech boom. Founder of Social Capital.',
    style: 'Growth capital · venture · high-risk innovation',
    knownFor: 'Popularizing SPACs, early-stage tech bets',
  },
  simons: {
    id: 'simons',
    initials: 'JS',
    name: 'Jim Simons',
    color: 'var(--ink-600)',
    philosophy: 'Let the data decide. Systematic, quantitative models exploit tiny statistical edges across thousands of trades — emotion has no place in the process.',
    bio: 'Mathematician and founder of Renaissance Technologies, whose Medallion Fund is the most successful quant fund in history.',
    style: 'Quantitative · systematic · data-driven',
    knownFor: 'The Medallion Fund, mathematical trading',
  },
  griffin: {
    id: 'griffin',
    initials: 'KG',
    name: 'Kenneth C. Griffin',
    color: 'var(--ame-600)',
    philosophy: 'Diversify across many uncorrelated strategies and manage risk relentlessly. Edge comes from operational excellence and rigorous research at scale.',
    bio: 'Founder of Citadel, one of the world\'s leading multi-strategy hedge funds and a dominant market maker.',
    style: 'Multi-strategy · quantitative · risk-managed',
    knownFor: 'Building Citadel into an elite multi-strategy fund',
  },
  livermore: {
    id: 'livermore',
    initials: 'JL',
    name: 'Jesse Livermore',
    color: 'var(--gold)',
    philosophy: 'The trend is your friend until it ends. Read price action, trade with the market\'s direction, and never fight the tape. Patience and timing are everything.',
    bio: 'Early-1900s speculator who made and lost several fortunes reading price trends and market psychology.',
    style: 'Momentum · price action · speculative',
    knownFor: 'Tape reading and legendary momentum trades',
  },
  burry: {
    id: 'burry',
    initials: 'MB',
    name: 'Michael Burry',
    color: 'var(--ink-400)',
    philosophy: 'Do your own deep research and trust the numbers, even against the entire market. Asymmetric bets against consensus can pay off enormously when you are right.',
    bio: 'Value investor and founder of Scion Capital who famously forecast and bet against the 2008 subprime collapse.',
    style: 'Deep value · contrarian · research-intensive',
    knownFor: 'Shorting the 2008 subprime mortgage bubble',
  },
}

// Affinity of each hero to the onboarding goal choices (order = strength)
const GOAL_AFFINITY = {
  'Shielding purchasing power from inflation': ['bogle', 'ray', 'warren', 'graham', 'templeton'],
  'Harnessing exponential compound wealth growth': ['warren', 'munger', 'cathie', 'bogle', 'chamath', 'ackman'],
  'Generating reliable passive dividend income': ['bogle', 'warren', 'graham', 'ray', 'templeton'],
  'Spreading risk through asset diversification': ['ray', 'bogle', 'soros', 'griffin', 'simons'],
  'Owning pieces of profitable global corporations': ['warren', 'munger', 'lynch', 'graham', 'templeton', 'icahn'],
}

const HORIZON_AFFINITY = {
  'Less than a year': ['lynch', 'soros', 'cathie', 'tudorjones', 'livermore', 'druckenmiller'],
  '1 – 3 years': ['lynch', 'graham', 'ray', 'tepper', 'loeb'],
  '3 – 10 years': ['warren', 'bogle', 'munger', 'simons', 'griffin'],
  '10+ years': ['warren', 'bogle', 'munger', 'cathie', 'templeton', 'burry'],
}

// Ranked hero ids for the onboarding selection grid.
// Warren Buffett is always included; the rest are ordered by goal + horizon fit.
export function rankHeroesForSelection(answers, count = 8) {
  const goals = Array.isArray(answers.goal) ? answers.goal : [answers.goal]
  const score = {}
  Object.keys(HERO_DATA).filter(id => id !== 'sage').forEach(id => { score[id] = 0 })
  goals.forEach(g => (GOAL_AFFINITY[g] || []).forEach((id, i) => { score[id] += 4 - i * 0.5 }))
  ;(HORIZON_AFFINITY[answers.horizon] || []).forEach((id, i) => { score[id] += 3 - i * 0.5 })
  const rest = Object.keys(score).filter(id => id !== 'warren').sort((a, b) => score[b] - score[a])
  return ['warren', ...rest].slice(0, count)
}

// Match algorithm: returns hero ids ranked by interview answers
export function matchHeroes(answers) {
  const { goal, horizon, risk, heroMention } = answers

  // Direct mention gets highest priority
  if (heroMention && heroMention !== "I don't follow any particular investor") {
    const mentioned = heroMention.toLowerCase()
    const directMatch = Object.values(HERO_DATA).find(h =>
      h.name.toLowerCase().includes(mentioned) || mentioned.includes(h.id)
    )
    if (directMatch) return [directMatch.id, 'bogle', 'ray'].slice(0, 3)
  }

  // Short-term goals → Lynch + momentum-oriented
  if (horizon === 'Less than a year') return ['lynch', 'cathie', 'ray']

  // Long-term + wealth → Warren default
  if (goal === 'Build long-term wealth' || goal === 'Learn how investing works') {
    if (risk === "Buy more — it's a discount") return ['warren', 'cathie', 'ray']
    return ['warren', 'bogle', 'ray']
  }

  // Savings / conservative → Bogle first
  if (goal === 'Beat my savings account' || goal === 'Save for something specific') {
    return ['bogle', 'warren', 'ray']
  }

  // Tech interest / exploring → Cathie
  return ['cathie', 'lynch', 'warren']
}

// The pool the LLM ranks from. Onboarding excludes Warren (he's pinned separately); the
// "find a new mentor" flow passes includeWarren=true to rank from the full 20.
// Sent to the rank-heroes edge function so heroes.js stays the single source of truth.
export function candidateHeroes(includeWarren = false) {
  return Object.values(HERO_DATA)
    .filter(h => h.id !== 'sage' && (includeWarren || h.id !== 'warren'))
    .map(({ id, name, style, philosophy }) => ({ id, name, style, philosophy }))
}

// Resolve a partial/unreliable LLM ranking into a final 8-hero selection list.
// Always returns ['warren', ...up to 7 non-Warren ids], deduped, with Warren first and never
// duplicated. Invalid ids are dropped; any shortfall is filled from the rule-based ranking so the
// grid is always complete even when the LLM fails or returns junk.
export function resolveSelectionHeroes({ llmIds = [], answers = {} } = {}) {
  const valid = new Set(
    Object.keys(HERO_DATA).filter(id => id !== 'sage' && id !== 'warren'),
  )
  const seen = new Set()
  const picked = []

  const take = id => {
    if (valid.has(id) && !seen.has(id) && picked.length < 7) {
      seen.add(id)
      picked.push(id)
    }
  }

  if (Array.isArray(llmIds)) llmIds.forEach(take)

  if (picked.length < 7) {
    rankHeroesForSelection(answers, Object.keys(HERO_DATA).length)
      .filter(id => id !== 'warren')
      .forEach(take)
  }

  return ['warren', ...picked]
}

// Resolve an LLM ranking into a final 8-hero list for the "find a new mentor" flow. Unlike
// resolveSelectionHeroes, Warren is NOT pinned — the 8 are ranked freely from all 20. Always
// returns up to 8 unique valid ids; invalid ids are dropped and any shortfall is filled from the
// rule-based ranking, so the grid is complete even when the LLM fails or returns junk.
export function resolveMentorHeroes({ llmIds = [], answers = {} } = {}) {
  const valid = new Set(Object.keys(HERO_DATA).filter(id => id !== 'sage'))
  const seen = new Set()
  const picked = []

  const take = id => {
    if (valid.has(id) && !seen.has(id) && picked.length < 8) {
      seen.add(id)
      picked.push(id)
    }
  }

  if (Array.isArray(llmIds)) llmIds.forEach(take)

  if (picked.length < 8) {
    rankHeroesForSelection(answers, Object.keys(HERO_DATA).length).forEach(take)
  }

  return picked
}

// Map a free-text / chosen "investor I admire" answer to a hero id, or null if none matches.
export function heroIdFromName(name) {
  if (!name) return null
  const n = name.toLowerCase()
  const match = Object.values(HERO_DATA).find(
    h => h.id !== 'sage' && (h.name.toLowerCase().includes(n) || n.includes(h.id)),
  )
  return match ? match.id : null
}
