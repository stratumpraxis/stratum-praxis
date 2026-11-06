// Parse Stripe Payment Link client_reference_id values without exposing direct identity.
//
// Legacy values remain route-only. New references carry the existing site-generated
// anonymous PostHog actor plus a stable route so Checkout can be reconciled to both.

const PART = /^[a-zA-Z0-9_-]+$/;
const COMPOUND = /^spb_([a-zA-Z0-9_-]{3,80})__spr_([a-zA-Z0-9_-]{1,120})$/;

function clean(value) {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

export function parseCheckoutReference(value) {
  const reference = clean(value);
  if (!reference || reference.length > 200 || !PART.test(reference)) {
    return { valid: false, version: null, reference: null, buyer_key: null, route_id: null };
  }

  const compound = COMPOUND.exec(reference);
  if (compound) {
    return {
      valid: true,
      version: 1,
      reference,
      buyer_key: `posthog:${compound[1]}`,
      route_id: compound[2]
    };
  }

  return {
    valid: true,
    version: 0,
    reference,
    buyer_key: null,
    route_id: reference
  };
}
