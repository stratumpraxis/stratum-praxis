# Systems Library — operating notes

This directory is the Stratum Praxis Systems Library. It extends the existing site; it is
not a second brand, a second site or a second publishing mechanism.

## Source of truth

`manifest.json` is the only place product facts are written. `build.mjs` generates every
page under `/systems/` from it.

```
node systems/build.mjs           # regenerate the pages
node systems/build.mjs --check   # fail if the committed pages are stale (runs in CI)
```

Never hand-edit `systems/index.html`, `systems/products/*/index.html`,
`systems/licenses/index.html`, `systems/docs/index.html` or `systems/changelog/index.html`.
Edit the manifest or the generator and rebuild.

`systems/packages/**` is the opposite: those files are the product. They are written by
hand, they carry their own README, LICENSE, CHANGELOG and tests, and the generator only
links to them.

## What is generated vs. what is hand-written

| Path | Generated? |
| --- | --- |
| `systems/index.html` and the other `index.html` pages | generated |
| `systems/manifest.json` | hand-written — the source |
| `systems/inventory.json` | hand-written — the asset audit behind the selection |
| `systems/packages/**` | hand-written — the deliverables |
| `systems/build.mjs` | hand-written — the generator |

## Mechanisms this reuses without changing

- `scos-analytics.js` — reused byte-for-byte. The Systems Library pages opt in through
  the existing contract: `body[data-funnel]`, `body[data-product]`,
  `a[data-primary-cta]`, `a[data-analytics-id]`, `a[data-product]`. No change was made to
  the analytics module, which also keeps this work conflict-free with the branches
  currently touching attribution.
- `sitemap.xml` — seven entries appended. Nothing removed or reordered.
- `index.html` — one nav entry added: `Systems Library`. Nothing else touched.
- `/prompt-store/` — the paid entry links to the existing canonical page and its existing
  Stripe checkout. No page, price, checkout or delivery route was created or changed.

## Verification split

Live verification runs in `.github/workflows/verify-systems-library.yml`, because Actions
has outbound network access and the session that built this did not. The workflow keeps
three states separate on purpose:

- routes are live and carry their own content
- every package file linked from a product page is actually served (delivery)
- the paid entry still points at the checkout the manifest records (checkout route only —
  no purchase is ever attempted)

`TEST_PURCHASE_VERIFIED` and `LIVE_PURCHASE_VERIFIED` are deliberately not produced by any
automation here. A purchase requires either explicit authorization or a real buyer.

## Adding a product

1. Ship the package under `systems/packages/<slug>/` with README, LICENSE, CHANGELOG,
   `package.json`, `src/`, `test/` and `examples/`.
2. Confirm `node --test test/*.test.mjs` passes and record the real count.
3. Add the entry to `manifest.json`, including every file in `files[]`.
4. `node systems/build.mjs`
5. Add the new route to `sitemap.xml`.
6. Record the audit reasoning in `inventory.json`.

Do not add an entry whose checkout, delivery or licence position is unresolved. An entry
with a price and no working checkout is worse than no entry.
