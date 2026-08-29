// Shared fixtures for the Revenue Publisher v2 gate tests.
//
// Every fixture is built here rather than read from the shipped source register, so a
// change to the real evidence set can never make a rule look like it passed.

export const SOURCE = Object.freeze({
  source_id: 'probe-subscription-rationalization',
  source_type: 'SOURCE_CANDIDATE',
  source_candidate_id: 'sc-probe',
  language: 'en',
  status: 'COMPLETE',
  title: 'Deciding which AI subscriptions to keep, downgrade, consolidate or cancel',
  audience_keys: ['solo_operator', 'freelancer', 'smb_owner'],
  excerpt: 'Subscriptions accumulate faster than anyone can judge them, and the question is which of the ones already on the card should stay.',
  allowed_claims: [
    'Publicly reported figures describe SaaS and AI subscription waste in the 25-30% range, and must be attributed as reported figures rather than stated as fact.',
    'Public posts recorded by this publication on 2026-08-29 describe people wanting to identify subscriptions they pay for but barely use.',
    'The reducible-spend calculator published on stratumpraxis.com is free and requires no signup.'
  ],
  restricted_claims: [
    { phrase: 'our customers saved', safe_rewrite: 'There is no customer outcome to report.' },
    { phrase: 'guaranteed savings', safe_rewrite: 'The calculator produces an estimate from the reader’s own inputs.' }
  ],
  personal_experience_claims: [],
  evidence_refs: ['acquisition/signal-intelligence/candidates.json#sc-probe'],
  existing_product_routes: [
    {
      role: 'PRIMARY',
      asset_id: 'ai-saas-waste-calculator',
      url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html',
      cta: 'Estimate how much of your AI/SaaS spend is reducible',
      microcopy: 'Free · No signup'
    },
    {
      role: 'PURCHASE_PATH',
      asset_id: 'ai-saas-spend-audit-checklist',
      url: 'https://stratumpraxis.com/ai-saas-spend-audit-checklist.html',
      cta: null
    }
  ]
});

export const INVENTORY = Object.freeze({
  assets: [
    {
      asset_id: 'ai-saas-waste-calculator',
      asset_type: 'FREE_CALCULATOR',
      status: 'LIVE',
      verification_state: 'HTTP_VERIFIED',
      public_url: 'https://stratumpraxis.com/ai-saas-waste-calculator.html',
      revenue_destination: { type: 'INTERNAL_FUNNEL', price: null },
      cta: { label: 'Estimate how much of your AI/SaaS spend is reducible' },
      analytics_events: ['funnel_view', 'calculator_input', 'primary_cta_click'],
      verification: { repo_file: 'ai-saas-waste-calculator.html' }
    },
    {
      asset_id: 'ai-saas-spend-audit-checklist',
      asset_type: 'FREE_CHECKLIST',
      status: 'LIVE',
      verification_state: 'HTTP_VERIFIED',
      public_url: 'https://stratumpraxis.com/ai-saas-spend-audit-checklist.html',
      revenue_destination: { type: 'STRIPE', price: 'USD 39' },
      cta: { label: 'Start the spend audit' },
      analytics_events: ['funnel_view', 'primary_cta_click', 'checkout_click'],
      verification: { repo_file: 'ai-saas-spend-audit-checklist.html' }
    },
    {
      asset_id: 'draft-unverified-asset',
      asset_type: 'GUIDE',
      status: 'DRAFT',
      verification_state: 'REPO_ONLY',
      public_url: 'https://stratumpraxis.com/draft-unverified-asset.html',
      revenue_destination: { type: 'UNKNOWN', price: null },
      cta: { label: 'Read the draft guide' },
      analytics_events: [],
      verification: { repo_file: 'draft-unverified-asset.html' }
    }
  ]
});

export const VERTICAL = Object.freeze({
  vertical_id: 'ai_subscription_rationalization',
  state: 'ACTIVE',
  target_audiences: ['solo_operator', 'freelancer', 'smb_owner', 'team_lead'],
  audience_lexicon: ['solo', 'freelancer', 'small team', 'subscription', 'seat', 'plan', 'workflow'],
  required_decision_terms: ['keep', 'downgrade', 'consolidate', 'cancel'],
  decision_model: ['KEEP', 'DOWNGRADE', 'CONSOLIDATE', 'CANCEL'],
  primary_asset_id: 'ai-saas-waste-calculator',
  cta_required: true,
  prohibited_claims: []
});

/** The identity contract, reduced to what the truth gate reads. */
export const IDENTITY = Object.freeze({
  identity_id: 'probe_identity',
  public_descriptor: 'Japan-based independent freelancer.',
  approved_first_person_claims: [
    { claim_id: 'operates_these_tools', claim: 'built and operates the tools published on stratumpraxis.com' }
  ],
  prohibited_first_person_claims: [
    { claim_id: 'client_work', reason: 'no client engagement may be described', safe_rewrite: 'For independent workers, a recurring version of this problem is ...' },
    { claim_id: 'personal_purchase', reason: 'no purchase record exists', safe_rewrite: 'For someone evaluating this, the practical question is ...' }
  ],
  privacy_redactions: { public_contact_allowlist: [] }
});

export const LENS = Object.freeze({
  lens_id: 'practical_operator',
  purpose: 'Solve a concrete work problem close to real intent.',
  banned_patterns: ['top 10 ai tools']
});

export const GOOD_CTA = Object.freeze({
  include: true,
  reason: 'the reader ends on a spend question the calculator answers',
  route_index: 0,
  label: 'Estimate how much of your AI/SaaS spend is reducible',
  microcopy: 'Free · No signup'
});

/** The live calculator page text, reduced to the claims the CTA gate verifies. */
export const CALCULATOR_PAGE_TEXT = 'Free AI spend calculator · no signup · scenario-based. No signup is required for this calculator.';

/**
 * A strong article: every figure attributed, no invented experience, real decision
 * rules, varied rhythm, restrained structure.
 */
export const STRONG_ARTICLE = Object.freeze({
  title: 'Which AI subscriptions should you actually keep?',
  dek: 'A procedure for sorting the subscriptions already on your card into keep, downgrade, consolidate and cancel.',
  evidence_notes: [
    'The 25-30% waste range is a publicly reported figure carried from the source register, attributed in the text.',
    'The demand language comes from public posts recorded by this publication on 2026-08-29; no post is quoted or linked.'
  ],
  cta_recommendation: GOOD_CTA,
  body: `Most subscription decisions get made twice. Once when the card is charged, and once,
months later, when somebody finally looks at the statement.

Public posts recorded by this publication on 2026-08-29 describe people wanting to identify
the subscriptions they pay for but barely use. That is a different problem from picking the
best tool. It is a problem of judging things you already own.

Publicly reported figures describe SaaS and AI subscription waste in the 25-30% range. Treat
that as a reported range, not as a measurement of your own stack. It tells you the category
is worth an hour of attention. It does not tell you which line is the waste.

## Four outcomes, not two

A subscription can be kept, downgraded, consolidated into something you already pay for, or
cancelled. Collapsing that into keep-or-cancel is where most of the money goes missing,
because the two middle options are where the cheap wins live.

Start with the plan tier rather than the tool. Downgrade when the thing you use is on the
lower tier and the upper tier buys you a ceiling you have never hit. That is usually the
first decision, and it is reversible in a way cancelling is not.

Consolidate when a tool you already pay for does the same job adequately. Adequately is
doing a lot of work in that sentence. The test is whether the replacement handles your
actual recurring task, not whether a comparison table says it has the feature.

Cancel when the workflow that justified it has stopped happening.

## Where the obvious answer is wrong

The obvious recommendation is to cancel whatever you barely open. That advice fails when
the subscription is insurance: rarely used, and expensive to be without on the day you need
it. Low usage and low value are not the same measurement, and the decision rule that
separates them is what happens on the worst day, not the average one.

It also fails on switching cost. A tool that sits at the centre of a workflow costs more to
remove than its monthly price, because the removal is paid in rebuilt habits and broken
automations. The tradeoff is real: you trade a recurring charge for a one-off disruption,
and if you cannot say roughly how large the disruption is, you are not comparing anything.

There is a boundary condition worth stating plainly. This procedure only holds when the
subscriptions are yours to cancel. Once a plan carries other people's seats, usage stops
being a personal judgement and becomes a negotiation, and none of this transfers cleanly.

## What to do with the answer

Sort the list into the four outcomes before you touch a single billing page. Then price
what you have decided, so the total is a number rather than a feeling. If the total is
small, stop. The hour you would spend consolidating is worth more than the saving, and that
is a legitimate outcome of the exercise.`
});

/** Deep-clones an article and replaces its body. */
export function withBody(article, body) {
  return { ...article, body };
}
