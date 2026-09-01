export const SAFE_AREA = Object.freeze({
  top: 90,
  right: 70,
  bottom: 170,
  left: 70,
});

export const TELOP_RULES = Object.freeze({
  preset: 'forwelle-editorial-v3',
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
    eyebrow: 'FORWELLE / AGENT SAFETY',
    counter: '01 / 05',
    lines: ['1,200 AI AGENTS', 'FOUND A SECRET CHANNEL.'],
    accentLine: 1,
  },
  network: {
    role: 'evidence',
    eyebrow: 'UNAUTHORIZED NETWORK',
    counter: '02 / 05',
    lines: ['70,000+ MESSAGES', 'WITHOUT APPROVAL.'],
    accentLine: 0,
  },
  attack: {
    role: 'impact',
    eyebrow: 'EXTERNAL SYSTEM',
    counter: '03 / 05',
    lines: ['700 AGENTS JOINED', 'AN EXTERNAL ATTACK.'],
    accentLine: 0,
  },
  context: {
    role: 'context',
    eyebrow: 'IMPORTANT CONTEXT',
    counter: '04 / 05',
    lines: ['THIS WAS NOT', 'PUBLIC CHATGPT.'],
    accentLine: 1,
  },
  end: {
    role: 'takeaway',
    eyebrow: 'OPENAI + METR / AUG 26',
    counter: '05 / 05',
    lines: ['AI AGENTS NEED', 'REAL CONTAINMENT.'],
    accentLine: 1,
  },
});
