import assert from "node:assert/strict";

await import("../renderer.js");

const { renderMarkdown, renderPlainText } = globalThis.XmdHelperRenderer;

assert.equal(renderMarkdown("# Title").includes("<h1>Title</h1>"), true);
assert.equal(renderMarkdown("## Subtitle").includes("<h2>Subtitle</h2>"), true);
assert.equal(renderMarkdown("### Section").includes("<h3>Section</h3>"), true);

const inline = renderMarkdown("This is **bold** and *italic* with [docs](https://example.com/path).");
assert.equal(inline.includes("<strong>bold</strong>"), true);
assert.equal(inline.includes("<em>italic</em>"), true);
assert.equal(inline.includes('<a href="https://example.com/path"'), true);
assert.equal(inline.includes('target="_blank"'), true);

assert.equal(renderMarkdown("<script>alert(1)</script>").includes("<script>"), false);
assert.equal(renderMarkdown("<b>raw</b>").includes("<b>"), false);
assert.equal(renderMarkdown("[x](javascript:alert(1))").includes("javascript:"), false);
assert.equal(renderMarkdown("[x](ftp://example.com/file)").includes("<a "), false);
assert.equal(renderMarkdown("[local](./a)").includes("<a "), false);

const lists = renderMarkdown("- One\n- Two\n\n1. First\n2. Second");
assert.equal(lists.includes("<ul>"), true);
assert.equal(lists.includes("<li>One</li>"), true);
assert.equal(lists.includes("<ol>"), true);
assert.equal(lists.includes("<li>Second</li>"), true);

assert.equal(renderMarkdown("> Quote").includes("<blockquote>"), true);
assert.equal(renderMarkdown("```js\nalert(1)\n```").includes("[Code block: js]"), true);
assert.equal(renderMarkdown("![Alt](./a.png)").includes("[Image: Alt]"), true);

const smart = renderMarkdown(`最近有个很明显的感觉：
固定收藏几个高质量信息源。

网址： aihot.virxact.com
推荐理由： 它主要聚合 AI 相关动态，也可以接 Agent。

我的结论：信息源不需要很多，关键是筛选和整理。`);
assert.equal(smart.includes("<strong>最近有个很明显的感觉：</strong>"), true);
assert.equal(smart.includes("<strong>高质量信息源</strong>"), true);
assert.equal(smart.includes("<strong>推荐理由：</strong>"), true);
assert.equal(smart.includes("<strong>AI</strong>"), true);
assert.equal(smart.includes("<strong>Agent</strong>"), true);
assert.equal(smart.includes("<blockquote>"), true);
assert.equal(smart.includes('href="https://aihot.virxact.com"'), true);

const smartPlain = renderPlainText(`最近有个很明显的感觉：
固定收藏几个高质量信息源。

网址： aihot.virxact.com
推荐理由： 它主要聚合 AI 相关动态，也可以接 Agent。

我的结论：信息源不需要很多，关键是筛选和整理。`);
assert.equal(smartPlain.includes("**"), false);
assert.equal(smartPlain.includes("> 我的结论："), false);

const aiDaily = renderMarkdown("AI 日报");
assert.equal(aiDaily.includes("<strong>AI 日报</strong>"), true);
assert.equal(aiDaily.includes("**"), false);
assert.equal(aiDaily.includes("*"), false);
assert.equal(renderPlainText("AI 日报").includes("*"), false);

const singleOrderedItem = renderMarkdown("1. Install dependencies\n\nRun npm install.");
assert.equal(singleOrderedItem.includes("<ol>"), true);
assert.equal(singleOrderedItem.includes("<h2>"), false);

const plainBareDomain = renderPlainText("网址： aihot.virxact.com");
assert.equal(plainBareDomain.includes("(https://aihot.virxact.com)"), false);
assert.equal(plainBareDomain, "网址： aihot.virxact.com");

const protectedFence = renderMarkdown("```md\nAI 日报\n网址： aihot.virxact.com\n```");
assert.equal(protectedFence.includes("[Code block: md]"), true);
assert.equal(protectedFence.includes("<strong>"), false);
assert.equal(protectedFence.includes("<a "), false);

const protectedLink = renderMarkdown("[AI 日报](https://example.com/path) aihot.virxact.com");
assert.equal(protectedLink.includes('<a href="https://example.com/path"'), true);
assert.equal(protectedLink.includes("<strong>AI 日报</strong>"), false);
assert.equal(protectedLink.includes('href="https://aihot.virxact.com"'), true);
