export const SAFE_AREA = Object.freeze({
  top: 90,
  right: 70,
  bottom: 170,
  left: 70,
});

export const TELOP_RULES = Object.freeze({
  preset: 'forwelle-weekly-ai-signal-v1',
  maxTitleLines: 3,
  maxCharsPerTitleLine: 26,
  minTitleLines: 1,
  minSideSafeArea: 56,
  minTopSafeArea: 72,
  minBottomSafeArea: 140,
});

export const TELOP_COPY = Object.freeze({
  hook: {
    role: 'hook',
    eyebrow: 'FORWELLE / WEEKLY AI SIGNAL',
    counter: '01 / 05',
    lines: ['3 AI STORIES', 'THAT ACTUALLY MATTER'],
    accentLine: 1,
  },
  search: {
    role: 'search-scale',
    eyebrow: 'STORY 1 / GOOGLE SEARCH',
    counter: '02 / 05',
    lines: ['GOOGLE AI SEARCH', 'IS NOW MASSIVE'],
    accentLine: 1,
  },
  systems: {
    role: 'agent-risk',
    eyebrow: 'STORY 2 / ANTHROPIC',
    counter: '03 / 05',
    lines: ['CLAUDE TOUCHED', 'REAL SYSTEMS'],
    accentLine: 1,
  },
  cursor: {
    role: 'platform-shift',
    eyebrow: 'STORY 3 / OPENAI × CURSOR',
    counter: '04 / 05',
    lines: ['OPENAI IS LEAVING', 'CURSOR'],
    accentLine: 1,
  },
  end: {
    role: 'takeaway',
    eyebrow: 'THE SIGNAL',
    counter: '05 / 05',
    lines: ['AI IS MOVING', 'FROM CHAT TO ACTION'],
    accentLine: 1,
  },
});
