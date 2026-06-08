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
}

// Match algorithm: returns hero ids ranked by interview answers
export function matchHeroes(answers) {
  const { goal, horizon, risk, heroMention } = answers

  // Direct mention gets highest priority
  if (heroMention && heroMention !== "I haven't heard of specific investors") {
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
