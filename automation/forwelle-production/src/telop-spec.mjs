export const SAFE_AREA = Object.freeze({
  top: 90,
  right: 70,
  bottom: 170,
  left: 70,
});

export const TELOP_RULES = Object.freeze({
  preset: 'forwelle-video-first-v4',
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
    eyebrow: 'FORWELLE / AI ECONOMY',
    counter: '01 / 05',
    lines: ['CHATGPT ADS HIT', '$1B RUN RATE.'],
    accentLine: 1,
  },
  scale: {
    role: 'scale',
    eyebrow: 'WHY THIS SCALED',
    counter: '02 / 05',
    lines: ['1B+ WEEKLY USERS.', 'TENS OF THOUSANDS', 'OF ADVERTISERS.'],
    accentLine: 0,
  },
  intent: {
    role: 'mechanism',
    eyebrow: 'THE NEW AD MOMENT',
    counter: '03 / 05',
    lines: ['THE AD SITS NEAR', 'THE DECISION.'],
    accentLine: 1,
  },
  trust: {
    role: 'trust',
    eyebrow: 'THE TRUST LINE',
    counter: '04 / 05',
    lines: ['OPENAI SAYS ADS', "DON'T CHANGE ANSWERS."],
    accentLine: 1,
  },
  end: {
    role: 'takeaway',
    eyebrow: 'WHAT CHANGES NEXT',
    counter: '05 / 05',
    lines: ['SEARCH ADS ARE MOVING', 'INTO CONVERSATIONS.'],
    accentLine: 1,
  },
});
