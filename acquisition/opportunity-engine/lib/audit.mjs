const REJECT_REASONS = new Set([
  'ENTRY_FEE',
  'PRIZE_RELEASE_FEE',
  'CRYPTO_TRANSFER_REQUIRED',
  'JAPAN_NOT_ELIGIBLE',
  'INDIVIDUAL_NOT_ALLOWED',
  'AI_PROHIBITED',
  'OPEN_ENDED_EMPLOYMENT',
  'MANDATORY_POST_WIN_SERVICE',
  'UNTRUSTED_SPONSOR'
]);

const HUMAN_REVIEW_REASONS = new Set([
  'JAPAN_ELIGIBILITY_UNCLEAR',
  'AI_RULE_UNCLEAR',
  'IP_ASSIGNMENT',
  'MANDATORY_PHASE_2',
  'INTERVIEW_REQUIRED',
  'PUBLICITY_REQUIRED',
  'POST_WIN_BURDEN_OVER_LIMIT',
  'PAYMENT_ROUTE_UNCLEAR',
  'RULES_ACCEPTANCE_REQUIRED',
  'TERMS_ACCEPTANCE_REQUIRED',
  'CAPTCHA_OR_LIVENESS',
  'KYC_REQUIRED',
  'TAX_FORM_REQUIRED',
  'LEGAL_DECLARATION_REQUIRED',
  'SIGNATURE_REQUIRED'
]);

function bool(v) {
  return v === true;
}

export function auditOpportunity(input = {}) {
  const reasons = [];
  const requiredHumanGates = [];

  const platform = String(input.platform || '').toLowerCase();
  if (!['kaggle', 'devpost'].includes(platform)) reasons.push('UNSUPPORTED_PLATFORM');

  if (input.entry_fee === true) reasons.push('ENTRY_FEE');
  if (input.prize_release_fee === true) reasons.push('PRIZE_RELEASE_FEE');
  if (input.crypto_transfer_required === true) reasons.push('CRYPTO_TRANSFER_REQUIRED');

  if (input.japan_eligible === false) reasons.push('JAPAN_NOT_ELIGIBLE');
  if (input.japan_eligible == null) reasons.push('JAPAN_ELIGIBILITY_UNCLEAR');

  if (input.individual_allowed === false) reasons.push('INDIVIDUAL_NOT_ALLOWED');
  if (input.ai_policy === 'PROHIBITED') reasons.push('AI_PROHIBITED');
  if (!input.ai_policy || input.ai_policy === 'UNCLEAR') reasons.push('AI_RULE_UNCLEAR');

  if (input.open_ended_employment === true) reasons.push('OPEN_ENDED_EMPLOYMENT');
  if (input.mandatory_post_win_service === true) reasons.push('MANDATORY_POST_WIN_SERVICE');
  if (input.trusted_sponsor === false) reasons.push('UNTRUSTED_SPONSOR');

  if (input.ip_policy === 'ASSIGN_ALL') reasons.push('IP_ASSIGNMENT');
  if (input.mandatory_phase_2 === true) reasons.push('MANDATORY_PHASE_2');
  if (input.interview_required === true) reasons.push('INTERVIEW_REQUIRED');
  if (input.publicity_required === true) reasons.push('PUBLICITY_REQUIRED');

  const hours = Number(input.post_win_hours_estimate ?? 0);
  if (Number.isFinite(hours) && hours > 4) reasons.push('POST_WIN_BURDEN_OVER_LIMIT');

  if (input.payment_route_clear === false || input.payment_route_clear == null) {
    reasons.push('PAYMENT_ROUTE_UNCLEAR');
  }

  const gateMap = {
    rules_acceptance_required: 'RULES_ACCEPTANCE_REQUIRED',
    terms_acceptance_required: 'TERMS_ACCEPTANCE_REQUIRED',
    captcha_or_liveness: 'CAPTCHA_OR_LIVENESS',
    kyc_required: 'KYC_REQUIRED',
    tax_form_required: 'TAX_FORM_REQUIRED',
    legal_declaration_required: 'LEGAL_DECLARATION_REQUIRED',
    signature_required: 'SIGNATURE_REQUIRED'
  };

  for (const [field, reason] of Object.entries(gateMap)) {
    if (bool(input[field])) {
      reasons.push(reason);
      requiredHumanGates.push(reason);
    }
  }

  if (input.http_status && [401, 403, 429].includes(Number(input.http_status))) {
    reasons.push(`HTTP_${input.http_status}_STOP`);
    requiredHumanGates.push(`HTTP_${input.http_status}_STOP`);
  }

  const uniqueReasons = [...new Set(reasons)];
  const hardReject = uniqueReasons.some((r) => REJECT_REASONS.has(r) || r === 'UNSUPPORTED_PLATFORM');
  const humanReview = uniqueReasons.some((r) => HUMAN_REVIEW_REASONS.has(r) || r.startsWith('HTTP_'));

  let decision = 'AUTO_ELIGIBLE';
  if (hardReject) decision = 'REJECT';
  else if (humanReview) decision = 'HUMAN_REVIEW';

  const safeToPrepare = decision !== 'REJECT';
  const safeToSubmitAutomatically = decision === 'AUTO_ELIGIBLE' && platform === 'kaggle';

  return {
    decision,
    safe_to_prepare: safeToPrepare,
    safe_to_submit_automatically: safeToSubmitAutomatically,
    required_human_gates: [...new Set(requiredHumanGates)],
    reasons: uniqueReasons,
    post_win_burden_hours: Number.isFinite(hours) ? hours : null
  };
}
