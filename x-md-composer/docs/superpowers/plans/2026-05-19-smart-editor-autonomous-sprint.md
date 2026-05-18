# Smart Editor Autonomous Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn X Markdown Composer from a converter into a more opinionated writing assistant that explains and applies smart formatting across the web app, extension helper, CLI manifests, and release workflow.

**Architecture:** Keep conversion deterministic and local-first. The main app should get formatting insight data from `src/converter.js`, while the extension keeps a small standalone renderer because it cannot import the Vite module directly. Web UI changes should present decisions without requiring the user to configure anything first.

**Tech Stack:** Vanilla JavaScript, Vite, `marked`, `twitter-text`, browser clipboard APIs, Chrome extension content script tests, GitHub Actions Pages deployment.

---

## File Structure

- Modify `src/converter.js`: add an exported formatting analysis/report API and attach `formatReport` to `convertLongform()`.
- Modify `tests/converter.test.mjs`: add regression coverage for report counts, quote decisions, lead emphasis, field labels, and protected code/link handling.
- Modify `src/main.js`: render a smart-formatting explanation panel in Article mode and include report data in the publish pack metadata/checklist.
- Modify `src/styles.css`: add compact, non-card-nested styling for formatting report chips/list.
- Modify `extension/renderer.js`: give the extension helper the same smart formatting heuristics for lead lines, field labels, important terms, bare links, and quote lines.
- Modify `extension/tests/markdown-renderer.test.mjs`: cover extension smart formatting parity.
- Modify `scripts/convert.mjs`: include formatting report details in article manifests.
- Modify `README.md`: document the smart editor rules and how to override them with explicit Markdown.
- Modify `.github/workflows/pages.yml`: opt GitHub JavaScript actions into Node 24 to silence the upcoming Node 20 runner warning.

## Task 1: Shared Article Formatting Report

**Files:**
- Modify: `src/converter.js`
- Test: `tests/converter.test.mjs`

- [ ] **Step 1: Write failing tests for report data**

Add a test after the existing smart formatting assertions:

```js
const report = convertLongform(`最近有个很明显的感觉：
固定收藏几个高质量信息源。

1. 卡兹克的 AIHOT

网址： aihot.virxact.com
推荐理由： 它主要聚合 AI 相关动态，也可以接 Agent。

我的结论：信息源不需要很多，关键是筛选和整理。
`).formatReport;

assert.equal(report.summary.total, 8);
assert.equal(report.counts.lead, 1);
assert.equal(report.counts.section, 1);
assert.equal(report.counts.field, 2);
assert.equal(report.counts.inline, 3);
assert.equal(report.counts.quote, 1);
assert.equal(report.counts.link, 1);
assert.equal(report.items.some((item) => item.kind === "quote" && item.text.includes("我的结论")), true);
assert.equal(report.items.some((item) => item.kind === "inline" && item.text === "高质量信息源"), true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `formatReport` is undefined.

- [ ] **Step 3: Implement minimal report API**

In `src/converter.js`, export:

```js
export function analyzeArticleFormatting(markdown) {
  const source = formatArticleMarkdownForHtml(markdown);
  const items = collectArticleFormatItems(source);
  return {
    counts: countFormatItems(items),
    items,
    summary: {
      total: items.length,
      hasSmartFormatting: items.length > 0,
    },
  };
}
```

Attach it in `convertLongform()`:

```js
formatReport: analyzeArticleFormatting(article.markdown),
```

Implement helper functions by scanning the formatted Markdown, not sanitized HTML:

```js
function collectArticleFormatItems(markdown) {
  const items = [];
  String(markdown ?? "").split("\n").forEach((line, index) => {
    const text = line.trim();
    if (!text) return;
    if (/^##\s+\d{1,2}[.、]\s+/.test(text)) items.push({ kind: "section", line: index + 1, text: text.replace(/^##\s+/, "") });
    if (/^>\s+/.test(text)) items.push({ kind: "quote", line: index + 1, text: text.replace(/^>\s+/, "").replace(/\*\*/g, "") });
    if (/^\*\*[^*\n]+[：:]\*\*$/.test(text)) items.push({ kind: "lead", line: index + 1, text: text.replace(/\*\*/g, "") });
    for (const match of text.matchAll(/\*\*([^*\n]+[：:])\*\*/g)) items.push({ kind: "field", line: index + 1, text: match[1] });
    for (const match of text.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g)) items.push({ kind: "link", line: index + 1, text: match[1], href: match[2] });
    for (const match of text.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      if (/[：:]$/.test(match[1])) continue;
      items.push({ kind: "inline", line: index + 1, text: match[1] });
    }
  });
  return dedupeFormatItems(items);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: converter tests pass.

- [ ] **Step 5: Commit**

```bash
git add x-md-composer/src/converter.js x-md-composer/tests/converter.test.mjs
git commit -m "feat: report smart article formatting"
```

## Task 2: Web Smart Formatting Panel And Pack Metadata

**Files:**
- Modify: `src/main.js`
- Modify: `src/styles.css`
- Test: use local browser DOM check after build

- [ ] **Step 1: Add user-facing strings**

Add zh/en I18N keys:

```js
smartFormat: "智能排版",
smartFormatDesc: "自动识别开头、字段、重点词、引用和链接；复制正文时已应用这些判断。",
smartFormatTotal: "{count} 处自动处理",
smartFormatEmpty: "暂无自动排版判断",
smartFormatLead: "开头",
smartFormatSection: "小节",
smartFormatField: "字段",
smartFormatInline: "重点",
smartFormatQuote: "引用",
smartFormatLink: "链接",
```

- [ ] **Step 2: Render report in Article publish panel**

Add `renderFormatReport(result.formatReport)` below `renderReadinessList(readiness)` in `renderArticlePublishPanel()`.

Use markup shape:

```html
<section class="format-report">
  <div class="format-report-head">
    <h3>智能排版</h3>
    <span>8 处自动处理</span>
  </div>
  <p>自动识别开头、字段、重点词、引用和链接；复制正文时已应用这些判断。</p>
  <div class="format-chips">...</div>
  <ol class="format-decisions">...</ol>
</section>
```

Do not nest this section inside an existing card.

- [ ] **Step 3: Add metadata/checklist entries**

In `buildMetadata(result, packNotes)` include:

```js
formatReport: result.formatReport,
```

In `buildPublishChecklist(result)` include:

```js
if (result.formatReport?.summary?.total) {
  lines.push(`- [ ] Review ${result.formatReport.summary.total} smart formatting decision(s).`);
}
```

- [ ] **Step 4: Style report**

Add styles for `.format-report`, `.format-report-head`, `.format-chips`, `.format-chip`, and `.format-decisions`. Keep the UI compact and scan-friendly; no large hero treatment.

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
curl -I http://127.0.0.1:5173/
```

Then use browser automation or DOM evaluation to confirm `.format-report` exists after entering article text.

- [ ] **Step 6: Commit**

```bash
git add x-md-composer/src/main.js x-md-composer/src/styles.css
git commit -m "feat: show smart formatting report"
```

## Task 3: Extension Smart Formatting Parity

**Files:**
- Modify: `extension/renderer.js`
- Test: `extension/tests/markdown-renderer.test.mjs`

- [ ] **Step 1: Write failing extension test**

Add a test that calls `renderMarkdown()` with:

```markdown
最近有个很明显的感觉：
固定收藏几个高质量信息源。

网址： aihot.virxact.com
推荐理由： 它主要聚合 AI 相关动态，也可以接 Agent。

我的结论：信息源不需要很多，关键是筛选和整理。
```

Assert:

```js
assert.equal(html.includes("<strong>最近有个很明显的感觉：</strong>"), true);
assert.equal(html.includes("<strong>高质量信息源</strong>"), true);
assert.equal(html.includes("<strong>推荐理由：</strong>"), true);
assert.equal(html.includes("<strong>AI</strong>"), true);
assert.equal(html.includes("<strong>Agent</strong>"), true);
assert.equal(html.includes("<blockquote>"), true);
assert.equal(html.includes('href="https://aihot.virxact.com"'), true);
```

- [ ] **Step 2: Run extension tests to verify failure**

Run: `npm run test:extension`

Expected: FAIL because renderer lacks smart formatting.

- [ ] **Step 3: Implement parity helpers**

In `extension/renderer.js`, add a `formatSmartMarkdown(markdown)` preprocessing function before `renderMarkdown()` parses lines. It should:

- Promote `1. Name` heading-like standalone lines only when surrounded by paragraph boundaries.
- Quote `我的结论：` / `核心观点：` / `引用：` lines.
- Bold lead lines ending in `：`.
- Bold field labels like `网址：`, `推荐理由：`, `亮点：`, `场景：`.
- Bold important inline terms and phrases.
- Linkify bare domains to `https://...`.
- Protect fenced code blocks and existing Markdown links before transforms.

Call it at the top of `renderMarkdown()` and `renderPlainText()` only where rich formatting is useful. Plain text should not leak Markdown syntax.

- [ ] **Step 4: Run tests**

Run: `npm run test:extension`

Expected: extension tests pass.

- [ ] **Step 5: Commit**

```bash
git add x-md-composer/extension/renderer.js x-md-composer/extension/tests/markdown-renderer.test.mjs
git commit -m "feat: add smart formatting to extension"
```

## Task 4: CLI Manifest, Docs, And CI Hygiene

**Files:**
- Modify: `scripts/convert.mjs`
- Modify: `README.md`
- Modify: `.github/workflows/pages.yml`
- Test: `npm run test:all`, `npm run build`, CLI manifest smoke test

- [ ] **Step 1: Include format report in CLI article manifest**

In `buildArticleManifest(result)`, add a "Smart Formatting" section before "Files":

```js
"## Smart Formatting",
"",
`- Decisions: ${result.formatReport?.summary?.total ?? 0}`,
`- Lead lines: ${result.formatReport?.counts?.lead ?? 0}`,
`- Sections: ${result.formatReport?.counts?.section ?? 0}`,
`- Field labels: ${result.formatReport?.counts?.field ?? 0}`,
`- Inline highlights: ${result.formatReport?.counts?.inline ?? 0}`,
`- Quotes: ${result.formatReport?.counts?.quote ?? 0}`,
`- Links: ${result.formatReport?.counts?.link ?? 0}`,
"",
```

- [ ] **Step 2: Add README section**

Document smart formatting rules under "Article Mode":

```markdown
### Smart Formatting

Article mode applies a local, deterministic editing pass before rich copy:

- Lead lines ending in `：` become bold.
- Numbered standalone resource names become section headings.
- Field labels such as `网址：`, `推荐理由：`, `亮点：`, and `场景：` become bold.
- Common AI/tool/product terms and key phrases become bold.
- `我的结论：`, `核心观点：`, `引用：`, and quoted sentences become blockquotes.
- Bare domains become safe HTTPS links.

Explicit Markdown wins. Use `**manual bold**`, `> quote`, headings, and links when you want exact control.
```

- [ ] **Step 3: Opt actions into Node 24**

In `.github/workflows/pages.yml`, add top-level:

```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run test:all
npm run build
printf '最近有个很明显的感觉：\n\n网址： aihot.virxact.com\n' > /tmp/xmd-smart.md
npm run convert -- /tmp/xmd-smart.md --mode=article --format=manifest
```

Expected: manifest includes "Smart Formatting" and link/field counts.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/pages.yml x-md-composer/scripts/convert.mjs x-md-composer/README.md
git commit -m "docs: document smart formatting workflow"
```

## Integration And Final Verification

- [ ] Merge task branches into `main` in this order: Task 1, Task 2, Task 3, Task 4.
- [ ] Resolve conflicts by preserving user-facing behavior and tests from all tasks.
- [ ] Run `npm run test:all`.
- [ ] Run `npm run build`.
- [ ] Start or reuse `npm run dev` at `http://127.0.0.1:5173/`.
- [ ] Use browser automation to paste a representative Chinese article and verify:
  - `.article-preview strong` count is greater than 5.
  - `.article-preview blockquote` exists.
  - `.format-report` exists.
  - The first link points to `https://aihot.virxact.com`.
- [ ] Commit final integration if needed.
- [ ] Push `main`.
- [ ] Watch GitHub Actions Pages deployment to success.

## Self-Review

- Spec coverage: The plan covers autonomous planning, worktree isolation, parallelizable implementation, smarter formatting decisions, extension parity, publishing/reporting, docs, CI, verification, and deployment.
- Placeholder scan: No "TBD" or "implement later" placeholders remain.
- Type consistency: `formatReport`, `summary.total`, `counts`, and `items` are consistently named across converter, UI, CLI, and metadata tasks.
