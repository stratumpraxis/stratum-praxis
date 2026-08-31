export const SAFE_AREA = Object.freeze({
  top: 90,
  right: 70,
  bottom: 170,
  left: 70,
});

export const TELOP_RULES = Object.freeze({
  preset: 'forwelle-editorial-v1',
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
    eyebrow: 'FORWELLE / SECURITY',
    counter: '01 / 04',
    lines: ['THE PAGE YOUR', 'AI READS CAN', 'BECOME THE ATTACK.'],
    accentLine: 2,
  },
  flow: {
    role: 'explain',
    eyebrow: 'ATTACK PATH',
    counter: '02 / 04',
    lines: ['CONTENT IS NOT', 'AUTHORITY.'],
    accentLine: 1,
  },
  boundary: {
    role: 'control',
    eyebrow: 'PERMISSION BOUNDARY',
    counter: '03 / 04',
    lines: ["DON'T TRUST HARDER.", 'LIMIT WHAT CAN HAPPEN.'],
    accentLine: 1,
  },
  end: {
    role: 'takeaway',
    eyebrow: 'FORWELLE // AGENT SECURITY',
    counter: '04 / 04',
    lines: ['READ THE WEB.', "DON'T OBEY THE WEB."],
    accentLine: 1,
  },
});
