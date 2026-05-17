# X Markdown Composer Helper

This is a minimal Chrome Manifest V3 helper for X Articles. It runs only on X/Twitter article composer pages and does not use the X API.

## Load Unpacked

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this `x-md-composer/extension` folder.
5. Open `https://x.com/compose/article` or `https://twitter.com/compose/article`.
6. Use the floating XMD button to paste Markdown, import into the focused editor, or copy HTML for manual paste.

## Permissions

- `clipboardWrite`: used only for the fallback copy flow when direct editor insertion fails.
- Host access is limited to `https://x.com/*` and `https://twitter.com/*`.
- The content script is limited to `/compose/article*` pages.

## No Token Workflow

The helper never asks for an X API key, bearer token, cookie, password, or account credential. It renders Markdown locally in the browser, tries to insert HTML into the visible X editor, and falls back to copying `text/html` plus `text/plain` to the clipboard.

## MVP Limitations

- It depends on the current X Articles page DOM and may need updates if X changes the editor.
- Markdown support is intentionally small: headings, paragraphs, bold, italic, safe HTTP(S) links, blockquotes, lists, fenced code placeholders, and image placeholders.
- Images and code blocks are placeholders only. Upload images and recreate rich code/table visuals manually in X.
- Direct insertion may fail depending on focus, browser clipboard permission, or editor behavior. Use Copy HTML fallback and paste manually when needed.
