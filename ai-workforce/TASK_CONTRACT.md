# Task Contract

Use this contract when a parent project delegates work to AI Workforce.

```yaml
parent_project: stratum|vector|gwr|forwelle
objective: ""
inputs: []
allowed_tools: []
prohibited_actions: []
budget:
  max_external_cost: 0
  paid_ai_allowed: false
acceptance_tests: []
output_format: ""
evidence_required: []
deadline_or_freshness: ""
risk_level: low|medium|high
```

## Default rejection rules

Reject or escalate when any of these are true:

- identity/KYC/interview requirement is material to task completion
- unlimited revisions or unclear acceptance criteria
- credential sharing is required
- irreversible production changes without rollback
- legal/financial/security responsibility is unclear
- external paid API/model use is required before revenue or authorization
- task cannot be objectively QA'd

## Default routing

- Research / extraction / comparison -> research
- Normalization / dedupe / validation -> data
- Small code / tests / CI / docs -> code
- Revenue-site bounded implementation -> web
- Video / creative automation -> video
