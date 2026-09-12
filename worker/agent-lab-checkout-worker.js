import memberWorker from './agent-lab-worker.js';

const PRICE = 'price_1UD1ziJMK7zFs9974xN7gZqZ';
const PUBLIC_ORIGIN = 'https://stratumpraxis.com';

function ref(value) {
  const cleaned = String(value || '').slice(0, 180).replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return cleaned || 'agent_lab_direct';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.pathname !== '/agent-lab/checkout') {
      return memberWorker.fetch(request, env, ctx);
    }

    if (!env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Checkout is not configured.' }, { status: 503 });
    }

    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('line_items[0][price]', PRICE);
    body.set('line_items[0][quantity]', '1');
    body.set('success_url', `${PUBLIC_ORIGIN}/agent-lab/access.html?session_id={CHECKOUT_SESSION_ID}`);
    body.set('cancel_url', `${PUBLIC_ORIGIN}/agent-lab/?checkout=cancelled`);
    body.set('client_reference_id', ref(url.searchParams.get('route_id')));
    body.set('metadata[market_route]', 'agent_lab_membership');
    body.set('metadata[entry]', 'agent_lab_site');

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const value = await response.json();
    if (!response.ok || !value?.url) {
      console.error('Agent Lab checkout create failed', value?.error?.type, value?.error?.code, value?.error?.message);
      return Response.json({
        error: 'Checkout could not be created.',
        stripe_type: String(value?.error?.type || ''),
        stripe_code: String(value?.error?.code || ''),
      }, { status: 500 });
    }
    return Response.redirect(value.url, 303);
  },
};
