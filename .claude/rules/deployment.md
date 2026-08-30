---
paths:
  - ".github/**"
  - "**/*cloudflare*"
  - "**/*worker*"
  - "**/*vercel*"
  - "**/*deploy*"
---

# Deployment Rules

Production state must be verified externally.

Deployment completion requires:

- successful CI/CD execution where applicable
- deployed revision/version evidence
- live endpoint check
- expected status and behavior

Do not treat a successful build as a successful deployment.

If local and remote branches differ, identify the difference before claiming production readiness.

## Repository note

The public site must stay deployable as static HTML, CSS, and JavaScript
(`AGENTS.md`, Working rules). Deployment evidence recorded under
`.deployment-status/` is production evidence: append or update it with verified
results, and never overwrite a recorded successful deployment with an
assumption.
