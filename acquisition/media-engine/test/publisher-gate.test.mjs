import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTO_PUBLISH_CONDITIONS,
  PROOF_CONTRACT,
  PROOF_STATES,
  checkDisclosure,
  queueStateFor,
  resolvePublishState,
  validateProofState
} from '../lib/publisher-gate.mjs';
import { QUEUE_STATES } from '../../lib/taxonomy.mjs';
import { loadDerivations, loadMediaContext } from '../lib/context.mjs';

const context = await loadMediaContext();
const doc = await loadDerivations();
const en = doc.derivations.find((d) => d.desk_id === 'en_desk');

const passing = { truth: true, duplication: true, safety: true };

/** A hypothetical fully-authorised channel. Nothing in the repository looks like this. */
const authorizedChannel = {
  channel_id: 'devto',
  source_routing_key: 'devto',
  supported_desks: ['en_desk'],
  supported_languages: ['en'],
  account_alias: 'stratumpraxis',
  account_state: 'CONNECTED',
  ai_content_policy_state: 'VERIFIED_COMPATIBLE',
  disclosure_required: ['ai_assistance', 'commercial_relationship'],
  one_time_owner_action: null
};

/** A provider policy in which one active publisher owns devto. */
const enablingPolicy = {
  providers: {
    'dev-community': { status: 'active', publishingEnabled: true, allowedServices: ['devto'] }
  }
};

test('no channel in the repository currently reaches AUTO_PUBLISH_ALLOWED', () => {
  for (const channel of Object.values(context.channels)) {
    for (const desk of Object.values(context.desks)) {
      const result = resolvePublishState(
        { derivation_id: 'probe', channel_id: channel.channel_id, disclosure: {}, body: '' },
        { channel, desk, providerPolicy: context.providerPolicy, sourceRouting: context.sourceRouting, gates: passing }
      );
      assert.notEqual(result.state, 'AUTO_PUBLISH_ALLOWED',
        `${channel.channel_id}/${desk.desk_id} must not auto-publish on current evidence`);
    }
  }
});

test('a disabled provider cannot auto-publish', () => {
  const result = resolvePublishState(en, {
    channel: authorizedChannel,
    desk: context.desks.en_desk,
    providerPolicy: context.providerPolicy,   // the real policy: devto publishingEnabled false
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.notEqual(result.state, 'AUTO_PUBLISH_ALLOWED');
  assert.equal(result.conditions.provider_publishing_enabled, false);
  assert.ok(result.human_steps.some((s) => s.condition === 'provider_publishing_enabled'));
});

test('a missing account authorization cannot auto-publish', () => {
  const result = resolvePublishState(en, {
    channel: { ...authorizedChannel, account_state: 'NOT_CONNECTED', account_alias: 'UNKNOWN' },
    desk: context.desks.en_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.conditions.account_authorized, false);
  assert.equal(result.state, 'HUMAN_PUBLISH_REQUIRED');
});

test('an unverified AI-content policy cannot auto-publish', () => {
  const result = resolvePublishState(en, {
    channel: { ...authorizedChannel, ai_content_policy_state: 'UNVERIFIED' },
    desk: context.desks.en_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.conditions.ai_content_policy_compatible, false);
  assert.equal(result.state, 'HUMAN_REVIEW_REQUIRED');
});

test('an unmet disclosure requirement blocks publication outright', () => {
  const undisclosed = { ...en, disclosure: {}, body: 'A body with no disclosure text in it.' };
  const result = resolvePublishState(undisclosed, {
    channel: authorizedChannel,
    desk: context.desks.en_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.state, 'BLOCKED');
  assert.ok(result.blockers.some((b) => b.includes('disclosure requirement')));
});

test('a declared disclosure that is not actually in the body does not count', () => {
  const claimed = {
    ...en,
    disclosure: { ai_assistance: 'Written with AI assistance.', commercial_relationship: 'Commercial link.' },
    body: 'A body that never contains either disclosure sentence.'
  };
  const check = checkDisclosure(claimed, authorizedChannel);
  assert.equal(check.ok, false);
  assert.deepEqual(check.missing.sort(), ['ai_assistance', 'commercial_relationship']);
});

test('every one of the nine conditions must be proven before AUTO_PUBLISH_ALLOWED', () => {
  const result = resolvePublishState(en, {
    channel: authorizedChannel,
    desk: context.desks.en_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.state, 'AUTO_PUBLISH_ALLOWED', JSON.stringify(result.unmet_conditions));
  for (const condition of AUTO_PUBLISH_CONDITIONS) {
    assert.equal(result.conditions[condition], true, `${condition} must be proven`);
  }

  // Knock out any single condition and the lane closes again.
  for (const gate of ['truth', 'duplication', 'safety']) {
    const broken = resolvePublishState(en, {
      channel: authorizedChannel,
      desk: context.desks.en_desk,
      providerPolicy: enablingPolicy,
      sourceRouting: context.sourceRouting,
      gates: { ...passing, [gate]: false }
    });
    assert.notEqual(broken.state, 'AUTO_PUBLISH_ALLOWED', `a failed ${gate} gate must close the lane`);
  }
});

test('a channel that is not in the repository routing map is refused, never invented', () => {
  const result = resolvePublishState(en, {
    channel: { ...authorizedChannel, channel_id: 'mastodon', source_routing_key: 'mastodon' },
    desk: context.desks.en_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.conditions.destination_configured, false);
  assert.ok(result.blockers.some((b) => b.includes('distribution/source-routing.json')));
});

test('two active publishers for one channel block the lane', () => {
  const result = resolvePublishState(en, {
    channel: authorizedChannel,
    desk: context.desks.en_desk,
    providerPolicy: {
      providers: {
        a: { status: 'active', publishingEnabled: true, allowedServices: ['devto'] },
        b: { status: 'active', publishingEnabled: true, allowedServices: ['devto'] }
      }
    },
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.state, 'BLOCKED');
  assert.ok(result.blockers.some((b) => b.includes('single-publisher rule')));
});

test('a channel that does not carry the desk is blocked, not merely reviewed', () => {
  const result = resolvePublishState(en, {
    channel: authorizedChannel,           // en_desk only
    desk: context.desks.es_desk,
    providerPolicy: enablingPolicy,
    sourceRouting: context.sourceRouting,
    gates: passing
  });
  assert.equal(result.state, 'BLOCKED');
});

test('PUBLISH_REQUESTED is not PUBLISHED', () => {
  const requested = {
    proof_state: 'PUBLISH_REQUESTED',
    publish_proof: { human_approved: true, requested_at: '2026-08-28T00:00:00Z' }
  };
  assert.deepEqual(validateProofState(requested), []);

  // The same record claiming PUBLISHED has no post id, timestamp or account.
  const errors = validateProofState({ ...requested, proof_state: 'PUBLISHED' });
  assert.ok(errors.some((e) => e.includes('external_post_id')));
  assert.ok(errors.some((e) => e.includes('published_at')));
  assert.ok(errors.some((e) => e.includes('account_id')));
});

test('PUBLISHED is not VERIFIED', () => {
  const published = {
    proof_state: 'PUBLISHED',
    publish_proof: {
      external_post_id: 'probe-post-id',
      published_at: '2026-08-28T01:00:00Z',
      account_id: 'probe-account'
    }
  };
  assert.deepEqual(validateProofState(published), []);

  const errors = validateProofState({ ...published, proof_state: 'VERIFIED' });
  assert.ok(errors.some((e) => e.includes('canonical_url')));
  assert.ok(errors.some((e) => e.includes('independent_status_read')));

  // An independent read that did not verify is not a verification.
  const failedRead = validateProofState({
    proof_state: 'VERIFIED',
    publish_proof: {
      ...published.publish_proof,
      canonical_url: 'https://example.test/post',
      verified_at: '2026-08-28T02:00:00Z',
      independent_status_read: { verified: false, checked_at: '2026-08-28T02:00:00Z' }
    }
  });
  assert.ok(failedRead.some((e) => e.includes('independent_status_read.verified === true')));
});

test('the proof ladder maps onto the existing acquisition queue states', () => {
  for (const state of PROOF_STATES) {
    const queueState = queueStateFor(state);
    assert.ok(QUEUE_STATES.includes(queueState),
      `${state} maps to ${queueState}, which is not an acquisition queue state`);
  }
  assert.equal(PROOF_CONTRACT.PUBLISH_REQUESTED.queue_state, 'SCHEDULED');
  assert.notEqual(PROOF_CONTRACT.PUBLISH_REQUESTED.queue_state, PROOF_CONTRACT.PUBLISHED.queue_state);
});

test('no shipped derivation claims a publish it cannot prove', () => {
  for (const derivation of doc.derivations) {
    assert.deepEqual(validateProofState(derivation), [], `${derivation.derivation_id} claims an unproven state`);
    assert.equal(derivation.published_at, null);
    assert.equal(derivation.publish_proof?.external_post_id ?? null, null);
  }
});
