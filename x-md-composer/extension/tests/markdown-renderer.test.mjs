import assert from "node:assert/strict";

await import("../renderer.js");

const { renderMarkdown } = globalThis.XmdHelperRenderer;

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
