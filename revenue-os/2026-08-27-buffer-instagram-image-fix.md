# Buffer Instagram Image Fix — 2026-08-27

## Diagnosis
`distribution/ai-saas-cost-instagram-20260827.png` was a corrupted/truncated PNG (missing the trailing `IEND` chunk; unreadable by any PNG decoder, confirmed with Pillow). Every current Instagram queue item pointed at this same file via its raw GitHub URL.

Verified in GitHub Actions history (`One-shot Product Launch Distribution` workflow):
- Run `32993966711` ("Prepare approved AI SaaS Instagram launch payload", 2026-08-26) — Buffer's `createPost` mutation returned `"Invalid post: Image could not be read from its URL."` for queue item `ai-saas-cost-ig-20260827`. This is the confirmed image-format failure.
- A second failed run (`32926917763`) was an unrelated GraphQL schema bug (`type` field not defined on `CreatePostInput`), already fixed by a later commit the same day. Not an image issue.
- A currently **scheduled** post exists from run `33053397461` (2026-08-27): Buffer post id `6a8ff2a9323198a35b118f6b`, item `vector-note-ai-team-ig-20260827`, `dueAt: 2026-08-29T13:47:00Z`. Buffer accepted the post at creation time (it does not validate the image until publish time), but it references the same broken PNG and would very likely fail again at its scheduled publish time if left unfixed.

`distribution/sib-instagram-20260826.png` (used by the already-published Smartphone Income Blueprint post) was checked and is a valid RGB PNG — left untouched.

## Fix
Re-rendered `distribution/ai-saas-cost-instagram-20260827.png` from its existing source `distribution/ai-saas-cost-instagram-20260827.svg` using headless Chromium at exact 1080×1350 (4:5, Instagram's standard portrait ratio). Result: valid RGB PNG, no alpha channel, no ICC/CMYK profile, ~113 KB, well under Buffer/Instagram size limits, ends with a proper `IEND` chunk.

No text, headline, CTA, price example, or UTM was changed — same filename, same URL, same design as the original SVG source. `distribution/content-queue.json`, `distribution/launch-now.json`, and `distribution/ai-stack-five-posts-20260827.json` needed no reference changes since the filename is unchanged.

## What still needs a human
This branch must reach `main` (merge/fast-forward) before `raw.githubusercontent.com/.../main/distribution/ai-saas-cost-instagram-20260827.png` serves the fixed file — Buffer and Instagram fetch from that URL. Once merged:
- The scheduled post `6a8ff2a9323198a35b118f6b` (due 2026-08-29) should publish normally without further action.
- If Buffer already cached the broken image for that post, open it in Buffer and re-save/re-attach the image, then confirm it moves to Published.
- No Buffer API credentials or browser session were available in this session to call Buffer directly or confirm publication; a human (or a session with `BUFFER_API_KEY`) should verify Published status after the merge.
