# X Markdown Composer Autonomous Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn X Markdown Composer from a paste-prep web app into a stronger no-token publishing workflow with local asset mapping, a Chrome extension MVP, better publish packs, and repeatable verification.

**Architecture:** Keep the static Vite app as the trusted local-first core. Add opt-in browser conveniences around it: local folder matching in the web app and a separate Manifest V3 extension that can assist inside X Articles without using X API credentials. Keep converter behavior tested in Node and keep browser-only features isolated in UI modules or standalone extension files.

**Tech Stack:** Vite, vanilla JavaScript modules, `marked`, `twitter-text`, `jszip`, Node test runner via `node tests/*.mjs`, Chrome Manifest V3.

---

## File Structure

- Modify `x-md-composer/src/converter.js`: converter metadata and publish-pack support only.
- Modify `x-md-composer/tests/converter.test.mjs`: regression tests for converter-only behavior.
- Modify `x-md-composer/src/main.js`: browser UI, local file/folder inputs, publish panel rendering, ZIP pack generation.
- Modify `x-md-composer/src/styles.css`: UI polish for import, local asset matching, and extension handoff affordances.
- Create `x-md-composer/extension/manifest.json`: Chrome extension manifest.
- Create `x-md-composer/extension/content.js`: X Article page helper, import modal, markdown-to-HTML insertion attempt.
- Create `x-md-composer/extension/content.css`: extension UI styles scoped under a unique prefix.
- Create `x-md-composer/extension/README.md`: installation, permissions, and no-token explanation.
- Create `x-md-composer/extension/tests/markdown-renderer.test.mjs`: extension renderer safety/format tests.
- Modify `x-md-composer/package.json`: add extension test script only if needed.
- Modify `x-md-composer/README.md`: user-facing workflow updates.
- Modify `x-md-composer/DEPLOYMENT.md`: Pages/static and extension distribution notes.

## Task 1: Local Asset Folder Mapping

**Files:**
- Modify: `x-md-composer/src/main.js`
- Modify: `x-md-composer/src/styles.css`
- Test manually: local browser at `http://127.0.0.1:5173/`

- [ ] **Step 1: Add folder import controls**

Add a hidden directory input near the existing `.md` import input:

```html
<button class="ghost" id="importAssetFolder" type="button"></button>
<input id="importAssetFolderFile" type="file" accept="image/*" webkitdirectory multiple hidden />
```

Add i18n labels:

```js
importAssets: "导入素材目录",
assetsImported: "已导入素材：{count} 个文件",
assetsImportFailed: "素材导入失败，请选择包含图片的目录",
matchedLocalAssets: "{count} 个本地素材已匹配",
```

- [ ] **Step 2: Implement file matching**

Add a `localAssetLibrary` map keyed by normalized path, basename, and decoded basename:

```js
const localAssetLibrary = new Map();

function addLocalAssetFile(file) {
  if (!file?.type?.startsWith("image/")) return false;
  const candidates = localAssetKeys(file).filter(Boolean);
  candidates.forEach((key) => localAssetLibrary.set(key, file));
  return true;
}

function localAssetKeys(file) {
  const path = String(file.webkitRelativePath || file.name || "").replaceAll("\\", "/");
  const name = path.split("/").pop() || "";
  return [...new Set([
    normalizeAssetPath(path),
    normalizeAssetPath(name),
    normalizeAssetPath(decodeURIComponentSafe(name)),
  ])];
}

function normalizeAssetPath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .replace(/^\.?\//, "")
    .replace(/^assets\//, "")
    .toLowerCase();
}
```

- [ ] **Step 3: Auto-attach matching image assets**

When rendering assets, if an image has no manual attachment, look for a matching file:

```js
function getAutoMatchedImageFile(image) {
  const keys = [
    normalizeAssetPath(image.url),
    normalizeAssetPath(image.url.split("/").pop() || ""),
  ];
  return keys.map((key) => localAssetLibrary.get(key)).find(Boolean) || null;
}
```

Update `getLocalImageAttachment(image)` to return explicit attachment first, then an auto attachment object with `file`, `previewUrl`, and `auto: true`. Object URLs should be cached and revoked when the library is cleared.

- [ ] **Step 4: Reset and status behavior**

Clear both explicit attachments and auto-match object URLs when loading a sample, clearing input, or importing a new Markdown file. Show the matched count in the publish panel asset summary.

- [ ] **Step 5: Verify**

Run:

```bash
npm test
npm run build
```

Manual check:

1. Start `npm run dev`.
2. Import a Markdown file with `![Hero](./assets/hero.png)`.
3. Import a folder containing `assets/hero.png`.
4. Confirm the image card previews the local file and ZIP uses the local image file.

## Task 2: Chrome Extension MVP

**Files:**
- Create: `x-md-composer/extension/manifest.json`
- Create: `x-md-composer/extension/content.js`
- Create: `x-md-composer/extension/content.css`
- Create: `x-md-composer/extension/README.md`
- Create: `x-md-composer/extension/tests/markdown-renderer.test.mjs`
- Modify: `x-md-composer/package.json`

- [ ] **Step 1: Create Manifest V3 extension**

Use the minimum host permissions for X Article pages:

```json
{
  "manifest_version": 3,
  "name": "X Markdown Composer Helper",
  "version": "0.1.0",
  "description": "Import Markdown into X Articles without X API tokens.",
  "permissions": ["clipboardRead", "clipboardWrite"],
  "host_permissions": ["https://x.com/*", "https://twitter.com/*"],
  "content_scripts": [
    {
      "matches": ["https://x.com/compose/article*", "https://twitter.com/compose/article*"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 2: Build content UI**

Create a floating `XMD` button and modal under a unique `xmd-helper-*` class namespace. The modal includes a textarea, an Import button, a Copy HTML fallback button, and a short no-token notice.

- [ ] **Step 3: Implement safe markdown renderer**

For the MVP renderer, support:

- `#`, `##`, `###` headings
- paragraphs
- bold and italic inline formatting
- Markdown links with `http:`/`https:` only
- blockquotes
- unordered and ordered lists
- fenced code blocks converted to placeholder paragraphs
- images converted to placeholder paragraphs

Escape all raw HTML before applying inline transforms. Do not execute scripts or preserve raw HTML.

- [ ] **Step 4: Attempt editor insertion with fallback**

Implementation order:

1. Find the active focused editor or `[contenteditable="true"]`.
2. Focus it and call `document.execCommand("insertHTML", false, html)`.
3. Dispatch `input` and `change` events.
4. If insertion fails, write `text/html` and `text/plain` to the clipboard and show a message asking the user to paste manually.

- [ ] **Step 5: Add extension tests**

Add `extension/tests/markdown-renderer.test.mjs` with assertions:

```js
assert.equal(renderMarkdown("# Title").includes("<h1>Title</h1>"), true);
assert.equal(renderMarkdown("<script>alert(1)</script>").includes("<script>"), false);
assert.equal(renderMarkdown("[x](javascript:alert(1))").includes("javascript:"), false);
assert.equal(renderMarkdown("![Alt](./a.png)").includes("[Image: Alt]"), true);
```

Expose renderer functions in a Node-safe way, or duplicate a small pure renderer module if content script isolation makes direct import awkward.

- [ ] **Step 6: Verify**

Run:

```bash
npm test
npm run test:extension
npm run build
```

Manual check:

1. Open `chrome://extensions`.
2. Load unpacked `x-md-composer/extension`.
3. Open X Article composer.
4. Confirm the `XMD` button appears and the fallback copy flow works if direct insertion fails.

## Task 3: Publish Pack and Manifest Quality

**Files:**
- Modify: `x-md-composer/src/main.js`
- Modify: `x-md-composer/README.md`
- Modify: `x-md-composer/DEPLOYMENT.md`

- [ ] **Step 1: Add pack metadata files**

For Article ZIP packs, add:

```js
zip.file("metadata.json", JSON.stringify({
  title: result.article?.title || "",
  cover: result.article?.cover || null,
  images: result.assets.images,
  tables: assetTables(result.assets),
  tweetEmbeds: assetTweets(result.assets),
  generatedAt: new Date().toISOString(),
}, null, 2));
```

- [ ] **Step 2: Add `publish-checklist.md`**

Generate a concise checklist:

```markdown
# Publish Checklist

- [ ] Paste article body into X Articles
- [ ] Confirm title
- [ ] Upload cover image
- [ ] Upload body images
- [ ] Add code/table screenshots
- [ ] Confirm tweet embeds
- [ ] Preview and publish manually
```

- [ ] **Step 3: Document extension versus web app**

In README, add a section:

- Web app: safest, static, no account access.
- Extension: optional helper inside X, no X API, depends on X page UI.
- API mode: not implemented.

- [ ] **Step 4: Verify**

Run:

```bash
npm test
npm run build
```

Manual check: download Article ZIP and confirm `metadata.json`, `publish-checklist.md`, and `manifest.md` are present.

## Task 4: Verification and Release Hygiene

**Files:**
- Modify: `x-md-composer/package.json`
- Create or modify: `x-md-composer/tests/pack-metadata.test.mjs` only if pack helpers are extracted to Node-testable pure functions.
- Modify: `.github/workflows/pages.yml`

- [ ] **Step 1: Add all-tests script**

If extension tests exist, add:

```json
"test:extension": "node extension/tests/markdown-renderer.test.mjs",
"test:all": "npm test && npm run test:extension"
```

- [ ] **Step 2: Update Pages workflow**

Change workflow test step to:

```yaml
- name: Test converter and extension
  working-directory: x-md-composer
  run: npm run test:all
```

- [ ] **Step 3: Verify**

Run locally:

```bash
npm run test:all
npm run build
```

Confirm GitHub Pages workflow still builds `x-md-composer/dist`.

## Execution Strategy

1. Commit this plan on `main`.
2. Create isolated worktrees from `main`:
   - `.worktrees/local-assets` on `codex/local-assets`
   - `.worktrees/chrome-extension` on `codex/chrome-extension`
   - `.worktrees/publish-pack` on `codex/publish-pack`
   - `.worktrees/release-hygiene` on `codex/release-hygiene`
3. Dispatch workers in parallel with disjoint ownership:
   - Worker A owns `src/main.js` and `src/styles.css` for local asset folder mapping.
   - Worker B owns `extension/**` and package extension test script.
   - Worker C owns pack manifest additions and documentation.
   - Worker D owns workflow/test script integration after Worker B creates test script.
4. Review returned diffs independently.
5. Merge branches back to `main` only after:
   - The worker reports changed files.
   - The relevant tests pass inside that worktree.
   - The controller runs full `npm run test:all` when available and `npm run build`.
6. Delete merged worktrees and branches after integration.

## Self-Review

- Spec coverage: covers web import, extension MVP, publish pack quality, docs, CI.
- Placeholder scan: no unresolved placeholders are present.
- Type consistency: `tweetEmbeds`, `article.cover`, and local asset naming match existing project conventions.
- Scope check: Chrome extension is isolated under `extension/**`; local web app changes remain static and no-token.
