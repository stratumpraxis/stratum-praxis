# Dailymotion Distribution Lane

Purpose: publish Stratum Praxis finished MP4 assets to Dailymotion through API v2 without storing API secrets in the repository.

## Current master

- Title: `AI Isn’t the Bottleneck — Your Workflow Is`
- Category: `tech`
- Audience: B2B / AI operations / workflow automation
- Kids content: `false`
- AI-altered disclosure: `true`
- Preferred visibility: `public`
- Canonical destination: https://stratumpraxis.com/

## Required GitHub Actions secrets

Create these repository secrets before running the workflow:

- `DAILYMOTION_CLIENT_ID` — Dailymotion Studio private API key
- `DAILYMOTION_CLIENT_SECRET` — private API secret; never commit this value
- `DAILYMOTION_PROFILE_ID` — destination Dailymotion profile ID

The private API key must have video management permission. API v2 uses OAuth 2.0 client credentials with the `video.manage` scope.

## Publish flow

1. Produce and QA the final MP4.
2. Host the MP4 temporarily at an HTTPS URL accessible by GitHub Actions, or pass a stable distribution asset URL.
3. Run `Dailymotion Publish` from GitHub Actions.
4. The workflow downloads the MP4 and verifies media streams with ffprobe.
5. `scripts/dailymotion_publish.py` obtains a short-lived OAuth token.
6. It creates a Dailymotion upload session, uploads the MP4, then creates the video object with title, category, visibility, compliance flags and tags.
7. The returned JSON is preserved as a short-retention Actions artifact as publish evidence.

## Local dry run

```bash
python -m pip install requests
python scripts/dailymotion_publish.py \
  --file ./video.mp4 \
  --title 'AI Isn’t the Bottleneck — Your Workflow Is' \
  --description 'Stratum Praxis — AI Operations & Revenue Systems. https://stratumpraxis.com/' \
  --category tech \
  --visibility public \
  --tags 'Stratum Praxis,AI,automation,workflow,business operations,revenue systems' \
  --is-ai-altered \
  --dry-run
```

## Security

- Do not place client secrets or access tokens in source files, issues, workflow inputs, logs or commit messages.
- Access tokens are generated at run time and expire.
- The workflow validates required secrets before downloading or publishing.
- Keep publication evidence, but never persist authorization headers or tokens.
