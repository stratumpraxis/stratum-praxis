# AI Workforce

AI Workforce is a subordinate execution layer for the existing projects.

It is not a new brand, product, or independent business by default.
Its job is to receive bounded tasks from parent projects, route them to the cheapest suitable worker, execute, QA, and return evidence.

## Parent projects

- Stratum Praxis: B2B analysis, implementation, automation, revenue infrastructure
- Vector Praxis: Japanese-market distribution, measurement, revenue execution
- Global Work Radar: research, data collection, normalization, verification
- Forwelle: video, creative production, media automation

## Operating model

Parent project -> task contract -> dispatcher -> worker -> QA -> result/evidence -> parent project

AI Workforce does not redefine parent-project strategy. It executes scoped work.

## Priorities

1. Zero-cost / free-tier execution first
2. Minimal human interaction
3. Reject high-KYC, interview-heavy, ambiguous-responsibility work
4. Use paid AI only when revenue is already secured and margin rules allow it
5. Prefer deterministic or testable tasks
6. Fail closed on unsafe, legally unclear, credential-sensitive, or untestable tasks

## Worker classes

- research: structured research, extraction, comparison, summarization
- data: normalization, deduplication, transformation, validation
- code: small implementation, tests, CI, docs, repair
- web: bounded web/revenue operations
- video: bounded production automation; human QA may still be required

## Task contract

Every job should provide:

- parent_project
- objective
- inputs
- allowed_tools
- prohibited_actions
- budget
- acceptance_tests
- output_format
- evidence_required
- deadline_or_freshness

## Revenue rule

Unpaid speculative work should use free compute/free models only.
Paid model/API spend is allowed only when expected margin remains positive and the parent project authorizes the spend.

## Handoff format

INPUT / ACTION / RESULT / EVIDENCE / BLOCKER / NEXT OWNER / NEXT ACTION

## Repository policy

Keep code, config, task metadata, small JSON/CSV outputs, and evidence manifests in Git.
Do not store large generated video, audio, model weights, private client assets, credentials, or secrets in Git.
