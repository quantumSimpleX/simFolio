export const C = {
  paper:    'var(--paper)',
  white:    'var(--white)',
  ink900:   'var(--ink-900)',
  ink800:   'var(--ink-800)',
  ink700:   'var(--ink-700)',
  ink600:   'var(--ink-600)',
  ink500:   'var(--ink-500)',
  ink400:   'var(--ink-400)',
  ink300:   'var(--ink-300)',
  ink200:   'var(--ink-200)',
  ink100:   'var(--ink-100)',
  ink50:    'var(--ink-50)',
  ame400:   'var(--ame-400)',
  ame500:   'var(--ame-500)',
  ame600:   'var(--ame-600)',
  ame200:   'var(--ame-200)',
  ame100:   'var(--ame-100)',
  ame50:    'var(--ame-50)',
  aqua400:  'var(--aqua-400)',
  aqua600:  'var(--aqua-600)',
  aqua50:   'var(--aqua-50)',
  red:      'var(--red)',
  redBg:    'var(--red-bg)',
  gold:     'var(--gold)',
  goldBg:   'var(--gold-bg)',
  goldLight:'var(--gold-light)',
};

export const SANS    = "'Barlow Condensed','Helvetica Neue',system-ui,sans-serif";
export const DISPLAY = "'MOMCAKE','Helvetica Neue',system-ui,sans-serif";
export const MONO    = "'Source Code Pro',ui-monospace,monospace";

export const HEROES = [
  { id:'warren', initials:'WB', name:'Warren Buffett', color:'var(--ame-400)',  style:'Value investing · long-term' },
  { id:'cathie',  initials:'CW', name:'Cathie Wood',    color:'var(--aqua-400)', style:'Disruptive technology · growth' },
  { id:'ray',     initials:'RD', name:'Ray Dalio',      color:'var(--gold)',     style:'Macro · diversification' },
  { id:'lynch',   initials:'PL', name:'Peter Lynch',    color:'var(--ame-500)',  style:'Growth at a reasonable price' },
  { id:'bogle',   initials:'JB', name:'John Bogle',     color:'var(--aqua-600)', style:'Index investing · low-cost' },
  { id:'munger',  initials:'CM', name:'Charlie Munger', color:'var(--ink-600)',  style:'Mental models · quality businesses' },
];

export const GOALS = [
  'Build long-term wealth',
  'Save for something specific',
  'Beat my savings account',
  'Learn how investing works',
  'Just exploring for now',
];

export const HOLDINGS = [
  { ticker:'AAPL', name:'Apple Inc.',        qty:5,  value:984.50,  cost:789.60, pnl:194.90, pct:24.7,  pos:true  },
  { ticker:'NVDA', name:'NVIDIA Corp.',      qty:2,  value:1760.00, cost:900.00, pnl:860.00, pct:95.6,  pos:true  },
  { ticker:'VTI',  name:'Vanguard Total Mkt',qty:10, value:2350.00, cost:2100.00,pnl:250.00, pct:11.9,  pos:true  },
  { ticker:'TSLA', name:'Tesla Inc.',        qty:5,  value:859.90,  cost:1000.00,pnl:-140.10,pct:-14.0, pos:false },
  { ticker:'BTC',  name:'Bitcoin',           qty:0.1,value:6234.00, cost:5100.00,pnl:1134.00,pct:22.2,  pos:true  },
];

export const BADGES = [
  { id:'first_trade',   name:'First Trade',       desc:'Make your first simulated trade',            earned:false },
  { id:'diversified',   name:'Diversified',        desc:'Hold 5 different securities',                earned:false },
  { id:'patient',       name:'Patient Investor',   desc:'Hold a position for 30+ days',               earned:false },
  { id:'researcher',    name:'Researcher',          desc:'View 10 different stock detail pages',        earned:false },
  { id:'contrarian',    name:'Contrarian',          desc:'Buy when a stock is down 10%+ on the day',   earned:false },
  { id:'etf',           name:'ETF Explorer',        desc:'Add an ETF to your portfolio',               earned:false },
  { id:'limit',         name:'Limit Setter',        desc:'Place your first limit order',               earned:false },
  { id:'reflection',    name:'Reflective',          desc:'Write a reflection note after a sell',       earned:false },
  { id:'council',       name:'Council Builder',     desc:'Unlock your second hero advisor',            earned:false },
  { id:'steady',        name:'Steady Hand',         desc:'Hold through a 5%+ drop without selling',   earned:false },
  { id:'macro',         name:'Macro Thinker',       desc:'Ask your council about market conditions',   earned:false },
  { id:'long_term',     name:'Long-term Thinker',   desc:'Hold a position for 90+ days',               earned:false },
  { id:'momentum',      name:'Momentum Rider',      desc:'Buy a stock up 5%+ on the day',             earned:false },
  { id:'etf2',          name:'Index Believer',       desc:'Invest in 3 different ETFs',                earned:false },
];
