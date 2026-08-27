# Lingua Flow v2 QA gates

Do not replace the current diagnostic until all gates pass.

1. Mobile viewport: 320 / 375 / 390 / 430px
2. Language cards: selected, hover, keyboard focus, tap target
3. Existing diagnostic URL remains reachable
4. note / X / contact links resolve correctly
5. No horizontal scroll
6. Text remains readable at 200% zoom
7. Reduced-motion users do not receive required animations
8. Lighthouse-style checks: semantic headings, labels, contrast, page title, description
9. Preview deployment only before production merge
10. Production replacement requires a final visual pass against the current diagnostic reference
