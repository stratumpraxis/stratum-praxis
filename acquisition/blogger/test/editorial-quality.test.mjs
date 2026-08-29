// Revenue Publisher v2 - the editorial quality model.
//
// The defect these tests exist for: v1 gave a polished, provenance-free, framework-heavy
// article with an invented opening anecdote a score of 100. Each test below is one of
// the reasons that article should not have passed.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BANDS,
  assessEditorialQuality,
  detectFakeTexture,
  detectInsight,
  extractNumericClaims,
  templateProfile
} from '../lib/editorial-quality.mjs';
import { checkCta } from '../lib/cta-gate.mjs';
import {
  CALCULATOR_PAGE_TEXT, INVENTORY, SOURCE, STRONG_ARTICLE, VERTICAL, withBody
} from './helpers.mjs';

function score(article, overrides = {}) {
  const cta = checkCta(article.cta_recommendation || {}, {
    source: SOURCE, inventory: INVENTORY, vertical: VERTICAL, assetPageText: CALCULATOR_PAGE_TEXT
  });
  return assessEditorialQuality(article, {
    source: SOURCE, vertical: VERTICAL, ctaVerdict: cta, safetyPatterns: [], minWords: 400, ...overrides
  });
}

const codes = (result) => result.critical_failures.map((f) => f.code);

test('the strong reference article scores well without reaching 100', () => {
  const result = score(STRONG_ARTICLE);
  assert.equal(result.critical_failures.length, 0, JSON.stringify(result.critical_failures));
  assert.ok(result.score >= BANDS.strong, `expected >= ${BANDS.strong}, got ${result.score}`);
  assert.ok(result.score < 100, 'a perfect score must remain extremely rare');
  assert.equal(result.band, 'STRONG');
  assert.equal(result.publishable, true);
});

test('an unsupported statistic is a critical failure, not a deduction', () => {
  const result = score(withBody(STRONG_ARTICLE,
    `${STRONG_ARTICLE.body}\n\nAcross the market, 43% of teams now run a monthly subscription review.`));

  assert.ok(codes(result).includes('UNSUPPORTED_STATISTIC'));
  assert.equal(result.publishable, false);
  assert.equal(result.band, 'CRITICAL_FAIL');
  assert.ok(result.score <= 49, `a critical failure must override the aggregate, got ${result.score}`);
  assert.ok(result.signals.untraceable_numeric_claims.includes('43%'));
});

test('a figure that is in the source but unattributed in the text is capped below 90', () => {
  const unattributed = STRONG_ARTICLE.body.replace(
    'Publicly reported figures describe SaaS and AI subscription waste in the 25-30% range. Treat\nthat as a reported range, not as a measurement of your own stack.',
    'SaaS and AI subscription waste runs at 25-30%. Treat that as a range, not as a\nmeasurement of your own stack.'
  );
  const result = score(withBody(STRONG_ARTICLE, unattributed));

  assert.equal(codes(result).includes('UNSUPPORTED_STATISTIC'), false, 'the figure is traceable to the source');
  assert.ok(result.caps.some((c) => c.code === 'UNMARKED_PROVENANCE'));
  assert.ok(result.score <= 88, `expected the unmarked-provenance ceiling, got ${result.score}`);
});

test('invented human texture fails even when no first-person pronoun appears', () => {
  const result = score(withBody(STRONG_ARTICLE,
    `The email from finance usually arrives three weeks before a major renewal cycle.\n\n${STRONG_ARTICLE.body}`));

  assert.ok(codes(result).includes('FABRICATED_EXPERIENCE'));
  assert.equal(result.publishable, false);
  assert.equal(result.dimensions.fake_experience_control.score, 5);
});

test('invented client and business anecdotes fail', () => {
  for (const sentence of [
    'A client of mine cut four subscriptions in one afternoon.',
    'When we audited our own stack, two tools turned out to be duplicates.',
    'One founder I know keeps every trial running just in case.',
    'Our usage logs show that most seats go unopened.'
  ]) {
    const result = score(withBody(STRONG_ARTICLE, `${sentence}\n\n${STRONG_ARTICLE.body}`));
    assert.ok(codes(result).includes('FABRICATED_EXPERIENCE'), `expected a fabrication failure for: ${sentence}`);
  }
});

test('an outcome written as if it happened fails unless it is labelled or sourced', () => {
  const asFact = score(withBody(STRONG_ARTICLE,
    `${STRONG_ARTICLE.body}\n\nOne small agency reduced its monthly tooling bill by $2,400 after a single pass.`));
  assert.ok(codes(asFact).includes('UNLABELLED_HYPOTHETICAL_OUTCOME')
    || codes(asFact).includes('FABRICATED_EXPERIENCE')
    || codes(asFact).includes('UNSUPPORTED_STATISTIC'));
  assert.equal(asFact.publishable, false);
});

test('a hypothetical is allowed only when the text labels it as an example', () => {
  const unlabelled = score(withBody(STRONG_ARTICLE,
    `${STRONG_ARTICLE.body}\n\nA freelancer pays $40 a month for a writing assistant and $35 for a second one.`));
  assert.ok(codes(unlabelled).includes('UNSUPPORTED_STATISTIC'), 'an unlabelled invented figure is a fabrication');

  const labelled = score(withBody(STRONG_ARTICLE,
    `${STRONG_ARTICLE.body}\n\nFor example, suppose a freelancer pays $40 a month for a writing assistant and $35 for a second one. The overlap question is whether either handles the other's recurring task.`));
  assert.equal(codes(labelled).includes('UNSUPPORTED_STATISTIC'), false, 'a labelled scenario may carry illustrative figures');
  assert.ok(labelled.caps.some((c) => c.code === 'ILLUSTRATIVE_FIGURES'), 'illustrative figures still cap the ceiling');
  assert.ok(labelled.score < 100);
});

test('an article with no non-obvious insight is capped below the READY threshold', () => {
  const flat = `Managing AI subscriptions is something every team has to think about now.
There are many tools available and the market keeps changing.

## Understanding the problem

Subscriptions are recurring charges. They add up over time and it makes sense to review them
regularly so that spending stays under control.

## Reviewing your tools

Look at the tools you pay for. Decide whether each one is still useful to you. Some tools
will be useful and some will not be useful any more.

## Making it a habit

Reviewing subscriptions regularly is a sensible practice for anyone who pays for software.
It keeps costs visible and helps you plan.`;
  const result = score({ ...STRONG_ARTICLE, body: flat });

  assert.equal(detectInsight(flat).length, 0);
  assert.ok(result.caps.some((c) => c.code === 'NO_NON_OBVIOUS_INSIGHT'));
  assert.ok(result.score < BANDS.ready, `expected below ${BANDS.ready}, got ${result.score}`);
});

test('generic one-pass AI textbook writing cannot reach the strong band', () => {
  const textbook = `In today's digital landscape, managing AI subscriptions has become a critical
concern for organizations of every size. Moreover, the pace of change makes this harder.

## The Visibility Gap

Furthermore, when spend is unbudgeted it is almost always unoptimized. At its core, this is a
systemic visibility problem that organizations must navigate carefully.

## The Specialization Tax

Consolidation reduces the bill, but it introduces a cost. Organizations must weigh this
carefully against their operational requirements and strategic objectives.

## The Governance Tax

Centralized procurement reduces waste and increases visibility, but it introduces latency.
Organizations must find the equilibrium that works for their particular circumstances.

## The Audit Framework

A defensible audit requires several layers of investigation. Each layer builds on the
previous one and contributes to a holistic view of the subscription landscape.

## The Decision Matrix

Categorize each tool by criticality and frequency. This provides a structured approach to
what would otherwise be an unstructured problem.

## Preparing For What Comes Next

Ultimately, the future belongs to organizations that treat this as a continuous practice.
The journey starts with a single review. Remember, the choice is yours.`;
  const result = score({ ...STRONG_ARTICLE, body: textbook });
  const profile = templateProfile(textbook);

  assert.ok(profile.coinage_count >= 4, `expected coined terms, got ${profile.coinages.join(', ')}`);
  assert.ok(profile.ai_transitions.length >= 3);
  assert.equal(profile.empty_motivational_ending, true);
  assert.ok(result.dimensions.anti_template.score <= 3);
  assert.ok(result.score < BANDS.strong, `template prose must not reach ${BANDS.strong}, got ${result.score}`);
});

test('coinage and heading density are penalised relative to the same article without them', () => {
  const plain = STRONG_ARTICLE.body;
  const coined = plain
    .replace('## Four outcomes, not two', '## The Subscription Gap\n\nThis is The Overlap Tax in action.')
    .replace('## Where the obvious answer is wrong', '## The Switching Cost Framework\n\nCall this The Insurance Paradox.')
    .replace('## What to do with the answer', '## The Rationalization Matrix');

  const before = score(withBody(STRONG_ARTICLE, plain));
  const after = score(withBody(STRONG_ARTICLE, coined));

  assert.ok(templateProfile(coined).coinage_count > templateProfile(plain).coinage_count);
  assert.ok(after.dimensions.originality_of_framing.score < before.dimensions.originality_of_framing.score);
  assert.ok(after.score < before.score, `coinage density must cost score: ${after.score} vs ${before.score}`);
});

test('source-backed insight raises the score against the same article without it', () => {
  const stripped = STRONG_ARTICLE.body
    .replace(/## Where the obvious answer is wrong[\s\S]*?## What to do with the answer/, '## What to do with the answer');

  const withInsight = score(STRONG_ARTICLE);
  const without = score(withBody(STRONG_ARTICLE, stripped));

  assert.ok(detectInsight(STRONG_ARTICLE.body).length > detectInsight(stripped).length);
  assert.ok(withInsight.dimensions.insight_depth.score > without.dimensions.insight_depth.score);
  assert.ok(withInsight.score > without.score);
});

test('a restricted source claim is a critical failure', () => {
  const result = score(withBody(STRONG_ARTICLE, `${STRONG_ARTICLE.body}\n\nThis is how our customers saved money last quarter.`));
  assert.ok(codes(result).includes('RESTRICTED_SOURCE_CLAIM'));
  assert.equal(result.publishable, false);
});

test('a truth-gate violation reported by the media engine overrides the aggregate', () => {
  const result = score(STRONG_ARTICLE, {
    truthViolations: [{ gate: 'FIRST_PERSON_TRUTH', label: 'first-hand purchase', sentence: 'I bought three of these.' }]
  });
  assert.ok(codes(result).includes('TRUTH_GATE_VIOLATION'));
  assert.ok(result.score <= 49);
});

test('a decision rule counts in either order, and flat prose still counts as none', () => {
  // "cancel it when X" and "if X, cancel" are the same rule. Catching only the first
  // was a false negative that cost a real article its insight score.
  assert.ok(detectInsight('Cancel it when the workflow that justified it has stopped.')
    .some((i) => i.id === 'conditional_decision_rule'));
  assert.ok(detectInsight('If usage is low and criticality is low, cancel.')
    .some((i) => i.id === 'conditional_decision_rule'));

  assert.ok(detectInsight('The most common decision rule is to cut whatever you rarely open.')
    .some((i) => i.id === 'explicit_rule'));
  assert.ok(detectInsight('That rule fails when it ignores criticality.')
    .some((i) => i.id === 'counterargument'));
  assert.ok(detectInsight('You must weigh this against the switching cost.')
    .some((i) => i.id === 'tradeoff'));

  // Two patterns for one kind of insight still count once, so a writer cannot inflate
  // depth by restating the same rule twice.
  const doubled = detectInsight('Cancel it when usage stops. If the workflow ends, cancel.');
  assert.equal(doubled.filter((i) => i.id === 'conditional_decision_rule').length, 1);

  for (const flat of [
    'Reviewing subscriptions regularly is a sensible practice that keeps costs visible.',
    'There are many AI tools available and the market continues to change quickly.',
    'It is important to understand your spending before making any decisions about it.'
  ]) {
    assert.deepEqual(detectInsight(flat), [], `flat prose should score no insight: ${flat}`);
  }
});

test('the body cleaner removes the artifacts a free model leaves around an article', async () => {
  const { cleanBody } = await import('../free-runner.mjs');
  const raw = `# Rationalizing the AI Subscription Stack

The real opening paragraph.

Another paragraph.

[0] Estimate how much of your AI/SaaS spend is reducible
Free · No signup`;
  const cleaned = cleanBody(raw);
  assert.equal(cleaned.startsWith('The real opening paragraph.'), true, 'the duplicated H1 goes');
  assert.equal(/\[0\]/.test(cleaned), false, 'the route marker goes');
  assert.equal(/No signup/i.test(cleaned), false, 'the duplicated CTA microcopy goes');
  assert.equal(cleaned.includes('Another paragraph.'), true, 'the article survives');
  assert.equal(/\n{3,}/.test(cleaned), false, 'no gaps are left behind');
});

test('the detectors are individually sound', () => {
  assert.equal(extractNumericClaims('Nothing happened in 2026.', '').length, 0, 'a year is not a statistic');
  assert.equal(extractNumericClaims('Waste sits at 25-30%.', 'reported waste of 25-30%')[0].traceable, true);
  assert.equal(extractNumericClaims('Waste sits at 61%.', 'reported waste of 25-30%')[0].traceable, false);
  assert.ok(detectFakeTexture('The renewal notice usually arrives two weeks before.').length >= 1);
  assert.equal(detectFakeTexture('For example, suppose the renewal notice usually arrives two weeks before.')[0].labelled_scenario, true);
});
