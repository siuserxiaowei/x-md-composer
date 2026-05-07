# X Markdown Composer Roadmap

## Product Direction

Build a no-token publishing assistant for writers who draft in Markdown and publish to X manually through the official site.

The app should not depend on paid X API access. It should prepare the body, media, code screenshots, and publishing package in the browser, then hand the user a clean upload workflow.

## Phase 1: Reliable Conversion

- Preserve Markdown as the source of truth.
- Produce an X-official-site-friendly long-form body.
- Replace Markdown images and fenced code blocks with clear placeholders.
- Extract images and code blocks into a structured asset list.
- Keep thread splitting available for normal Posts.

## Phase 2: Local Publish Pack

- Generate `article.txt` for paste-friendly body copy.
- Generate `article.html` as a rich text backup.
- Generate `manifest.md` with image URLs and code block locations.
- Generate PNG screenshots for fenced code blocks.
- Fetch remote images into the package when browser permissions allow it.
- Fall back to `.url.txt` files when remote images block browser fetch.

## Phase 3: Manual X Workflow

- Provide one-click body copy.
- Provide per-asset copy/open/download controls.
- Provide a ZIP publish pack for offline/manual upload.
- Open the relevant X composer page without trying to publish automatically.
- Keep final publish actions under user control.

## Phase 4: Quality

- Add regression tests for converter edge cases.
- Keep `npm test` and `npm run build` green.
- Use compact UI states for copy/download failures.
- Document API limitations and the no-token workflow clearly.

## Phase 5: Static Web Launch

- Deploy the app as a static site.
- Keep conversion, draft storage, and publish-pack generation browser-only.
- Document Vercel, Cloudflare Pages, and GitHub Pages deployment.
- Make the hosted path clearly no-token and no-login.
- Keep the default publishing flow manual: copy body, open X, upload media, review, publish.

## Phase 6: Optional Image Proxy

- Consider a small backend proxy only for images that browser fetch cannot download.
- Keep URL fallback behavior for privacy and reliability.
- Add abuse protection, size limits, content-type checks, and request logging controls before launch.
- Do not mix the proxy with X account credentials.

## Phase 7: Optional Browser Extension

- Explore an extension that can help move prepared content into the X composer.
- Require explicit user confirmation before any publish action.
- Avoid storing X credentials.
- Treat extension publishing automation as a separate trust surface from the static site.

## Phase 8: Optional Paid X API Mode

- Add X API publishing only if there is a clear paid/API product path.
- Require user OAuth and clear account connection state.
- Support API media upload before post creation.
- Make rate limits, costs, scopes, and failure states visible.
- Keep no-token manual publishing as the default mode.

## Deferred

- X API publishing, because it requires paid credits or approved credentials.
- Fully automated X Articles publishing, because no public Article creation/upload API is documented.
- Browser automation publishing, unless the user explicitly accepts account-login automation and final confirmation prompts.
