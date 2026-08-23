export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = new Set([
      'https://stratumpraxis.github.io',
      'https://stratumpraxis.com'
    ]);
    const headers = {
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    };
    if (allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET' || url.pathname !== '/verify') {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
    }

    const sessionId = url.searchParams.get('session_id');
    const offer = url.searchParams.get('offer');
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return new Response(JSON.stringify({ error: 'Invalid session_id' }), { status: 400, headers });
    }
    if (!['report', 'kit'].includes(offer)) {
      return new Response(JSON.stringify({ error: 'Invalid offer' }), { status: 400, headers });
    }
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Server is not configured' }), { status: 500, headers });
    }

    const offers = {
      report: {
        priceId: env.REPORT_PRICE_ID,
        paymentLinkId: env.REPORT_PAYMENT_LINK_ID,
        amount: 1980,
        currency: 'jpy'
      },
      kit: {
        priceId: env.KIT_PRICE_ID,
        paymentLinkId: env.KIT_PAYMENT_LINK_ID,
        amount: 4980,
        currency: 'jpy'
      }
    };
    const expected = offers[offer];
    if (!expected.priceId || !expected.paymentLinkId) {
      return new Response(JSON.stringify({ error: 'Offer is not configured' }), { status: 500, headers });
    }

    try {
      const stripeUrl = `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price`;
      const r = await fetch(stripeUrl, {
        headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
      });
      const s = await r.json();
      if (!r.ok) {
        return new Response(JSON.stringify({ error: 'Stripe verification failed' }), { status: 502, headers });
      }

      const lineItems = s.line_items?.data || [];
      const exactPriceMatch = lineItems.length === 1 &&
        lineItems[0]?.price?.id === expected.priceId &&
        Number(lineItems[0]?.quantity || 0) === 1;
      const paid = s.payment_status === 'paid';
      const correctMode = s.mode === 'payment';
      const correctAmount = Number(s.amount_total) === expected.amount;
      const correctCurrency = String(s.currency || '').toLowerCase() === expected.currency;
      const correctPaymentLink = s.payment_link === expected.paymentLinkId;

      const authorized = paid && correctMode && exactPriceMatch && correctAmount && correctCurrency && correctPaymentLink;
      if (!authorized) {
        return new Response(JSON.stringify({
          paid: false,
          error: 'Payment not confirmed for this offer'
        }), { status: 402, headers });
      }

      return new Response(JSON.stringify({
        paid: true,
        offer,
        session_id: s.id,
        amount_total: s.amount_total,
        currency: s.currency,
        price_id: expected.priceId,
        payment_link: s.payment_link
      }), { status: 200, headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Verification error' }), { status: 500, headers });
    }
  }
};
