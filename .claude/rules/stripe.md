---
paths:
  - "**/*stripe*"
  - "**/*checkout*"
  - "**/*payment*"
  - "**/*webhook*"
---

# Stripe / Commerce Rules

Treat Stripe as payment truth.

Before changing commerce:

- identify the current product
- identify the live price
- identify the active checkout/payment link
- identify success/cancel behavior
- identify purchase verification
- identify delivery dependency

Do not replace working live checkout infrastructure unless necessary.

Never expose:

- API secrets
- webhook secrets
- private keys

For webhook work:

1. verify production endpoint exists
2. verify configuration
3. verify signature handling
4. verify expected event type
5. verify downstream purchase state
6. verify failure behavior

A locally passing handler is not production verification.

## Repository note

This project also sells through platform-native checkouts (Payhip, Gumroad,
note). For those products the platform's own record is payment truth, exactly
as Stripe is for Stripe-hosted checkout. Per the Commerce connection guard in
`AGENTS.md`, a platform-native path that already completes payment and delivery
is not a defect and must not be migrated to Stripe without verified evidence
that the change closes a real gap. Verified destinations and live prices are
listed in `AGENTS.md`; do not change pricing or store URLs without explicit
instruction.
