---
paths:
  - "sitemap.xml"
  - "robots.txt"
  - "**/*.html"
---

# Indexability Consistency Guard

Treat search indexability as part of the revenue path, not as a cosmetic SEO task.

Before adding or retaining a URL in `sitemap.xml`, verify that the page is:

- intended to be discoverable in search;
- not marked `noindex`;
- canonical to itself unless there is a deliberate migration/duplicate-content reason;
- not merely a legacy redirect/bridge page to another active offer;
- not an obsolete, retired, paused, or intentionally hidden revenue route.

For legacy or superseded offer pages, keep the buyer-safe redirect/bridge when useful, but remove the legacy URL from the sitemap when it is `noindex` or canonicalizes to the current route.

When a revenue page changes status, check this consistency chain:

`page indexability -> canonical -> sitemap membership -> internal links -> live CTA -> active checkout -> delivery`

Prefer the current canonical revenue page in internal links and sitemap entries. Do not send contradictory discovery signals such as `noindex` plus sitemap inclusion.

This guard does not justify deleting historical files or breaking old inbound links. Preserve safe legacy routes while concentrating crawl and internal-link signals on the current active destination.
