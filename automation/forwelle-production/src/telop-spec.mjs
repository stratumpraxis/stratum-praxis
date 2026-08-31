export const SAFE_AREA = Object.freeze({
  top: 90,
  right: 70,
  bottom: 170,
  left: 70,
});

export const TELOP_RULES = Object.freeze({
  preset: 'forwelle-editorial-v2',
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
    eyebrow: 'FORWELLE / AI AGENTS',
    counter: '01 / 05',
    lines: ['AI AGENTS ARE LEAVING', 'THE SCREEN.'],
    accentLine: 1,
  },
  devices: {
    role: 'evidence',
    eyebrow: 'PHYSICAL AI',
    counter: '02 / 05',
    lines: ['NOW THEY CAN OPERATE', 'PHYSICAL DEVICES.'],
    accentLine: 1,
  },
  speed: {
    role: 'impact',
    eyebrow: 'INTEGRATION SHIFT',
    counter: '03 / 05',
    lines: ['WEEKS OF INTEGRATION', 'CAN DROP TO HOURS.'],
    accentLine: 1,
  },
  realtime: {
    role: 'capability',
    eyebrow: 'REAL-TIME CONTROL',
    counter: '04 / 05',
    lines: ['AGENTS CAN ADJUST', 'EXPERIMENTS IN REAL TIME.'],
    accentLine: 1,
  },
  end: {
    role: 'takeaway',
    eyebrow: 'SOURCE / ANTHROPIC',
    counter: '05 / 05',
    lines: ['THE NEXT AI INTERFACE', 'MAY BE THE PHYSICAL WORLD.'],
    accentLine: 1,
  },
});
