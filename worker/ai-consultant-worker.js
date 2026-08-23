export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allowed = new Set([
      'https://stratumpraxis.github.io',
      'https://stratumpraxis.com'
    ]);
    const corsOrigin = allowed.has(origin) ? origin : 'https://stratumpraxis.github.io';
    const headers = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
    if (url.pathname !== '/verify') return new Response(JSON.stringify({error:'Not found'}), {status:404, headers});
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId || !sessionId.startsWith('cs_')) return new Response(JSON.stringify({error:'Invalid session_id'}), {status:400, headers});
    if (!env.STRIPE_SECRET_KEY) return new Response(JSON.stringify({error:'Server is not configured'}), {status:500, headers});
    try {
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items.data.price`, {
        headers: {Authorization:`Bearer ${env.STRIPE_SECRET_KEY}`}
      });
      const s = await r.json();
      if (!r.ok) return new Response(JSON.stringify({error:'Stripe verification failed'}), {status:502, headers});
      const paid = s.payment_status === 'paid' || s.status === 'complete' && s.amount_total === 0;
      const priceIds = (s.line_items?.data || []).map(x => x.price?.id).filter(Boolean);
      const allowedPrices = [env.REPORT_PRICE_ID, env.KIT_PRICE_ID].filter(Boolean);
      const authorizedOffer = priceIds.some(id => allowedPrices.includes(id));
      if (!paid || !authorizedOffer) return new Response(JSON.stringify({paid:false,error:'Payment not confirmed for this product'}), {status:402, headers});
      return new Response(JSON.stringify({paid:true,session_id:s.id,amount_total:s.amount_total,currency:s.currency,price_ids:priceIds}), {status:200, headers});
    } catch (e) {
      return new Response(JSON.stringify({error:'Verification error'}), {status:500, headers});
    }
  }
};
