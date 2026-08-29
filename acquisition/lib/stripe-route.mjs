// Convert verified Stripe Checkout Session evidence into the existing winner input.
// This adapter never invents traffic, CTA, checkout or purchase records.

function validRouteId(value) {
  value = String(value || '');
  return /^[a-zA-Z0-9_-]{1,200}$/.test(value) ? value : null;
}

export function purchaseFromCheckoutSession(session) {
  const routeId = validRouteId(
    session?.metadata?.attribution_route_id || session?.client_reference_id
  );
  const verified = session?.payment_status === 'paid'
    && session?.mode === 'payment'
    && Boolean(session?.payment_intent);

  if (!routeId || !verified) return null;

  return {
    route_id: routeId,
    attribution_state: 'ATTRIBUTED',
    purchase: 1,
    purchase_evidence: `stripe:${session.payment_intent}`,
    revenue_cents: Number(session.amount_total),
    currency: String(session.currency || '').toLowerCase(),
    activation: session?.metadata?.delivery_state === 'ACTIVATED' ? 1 : 0,
    checkout_session_id: session.id
  };
}

export function mergeStripePurchases(route, sessions) {
  const purchases = sessions
    .map(purchaseFromCheckoutSession)
    .filter((item) => item?.route_id === route.route_id);

  if (!purchases.length) return { ...route };

  return {
    ...route,
    attribution_state: 'ATTRIBUTED',
    purchase: purchases.length,
    purchase_evidence: purchases.map((item) => item.purchase_evidence).join(','),
    revenue_cents: purchases.reduce((sum, item) => sum + item.revenue_cents, 0),
    activation: purchases.reduce((sum, item) => sum + item.activation, 0)
  };
}
