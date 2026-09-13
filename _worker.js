const GA4_ID = 'G-QXTYRB4TWY';
const GA4_TAG = `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${GA4_ID}');\n</script>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonicalize the homepage path without changing any product or revenue routes.
    if (url.pathname === '/index.html') {
      url.pathname = '/';
      return Response.redirect(url.toString(), 301);
    }

    const response = await env.ASSETS.fetch(request);

    if (request.method !== 'GET') return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();

    // Keep homepage references canonical even if a legacy /index.html link reappears.
    html = html
      .replaceAll('href="/index.html"', 'href="/"')
      .replaceAll("href='/index.html'", "href='/'")
      .replaceAll('https://stratumpraxis.com/index.html', 'https://stratumpraxis.com/');

    // Insert GA4 exactly once into the delivered <head>.
    if (!html.includes(GA4_ID)) {
      const headClose = /<\/head>/i;
      if (headClose.test(html)) {
        html = html.replace(headClose, `${GA4_TAG}\n</head>`);
      }
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
