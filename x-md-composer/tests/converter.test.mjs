import assert from "node:assert/strict";
import { cleanMarkdown, convertLongform, convertMarkdown, markdownToArticleHtml, readFrontmatter } from "../src/converter.js";

const cleaned = cleanMarkdown(`# Title

This is **bold** and [a link](https://example.com/path).

- [x] Done
- Next
`);

assert.equal(cleaned.includes("**"), false);
assert.equal(cleaned.includes("[a link]"), false);
assert.equal(cleaned.includes("Title"), true);
assert.equal(cleaned.includes("a link: https://example.com/path"), true);
assert.equal(cleaned.includes("- Done"), true);

const meta = readFrontmatter(`---
title: "发布稿"
summary: 本地工作流测试
tags: [X, Markdown, "长文"]
draft: true
priority: 2
---

# Body`);

assert.equal(meta.attributes.title, "发布稿");
assert.equal(meta.attributes.summary, "本地工作流测试");
assert.deepEqual(meta.attributes.tags, ["X", "Markdown", "长文"]);
assert.equal(meta.attributes.draft, true);
assert.equal(meta.attributes.priority, 2);
assert.equal(meta.body.trim(), "# Body");

const manual = convertMarkdown(`First post.

<!-- tweet -->

Second post.`, { maxChars: 280, numbering: "none" });

assert.equal(manual.posts.length, 2);
assert.equal(manual.posts[0], "First post.");
assert.equal(manual.posts[1], "Second post.");

const article = convertLongform(`# Article Title

This is **bold** and [a link](https://example.com/path).

![Diagram](https://example.com/diagram.png)

<!-- tweet -->

- Item

\`\`\`js
console.log("hello");
\`\`\`
`);

assert.equal(article.plain.includes("**"), false);
assert.equal(article.plain.includes("<!-- tweet -->"), false);
assert.equal(article.html.includes("<h1>Article Title</h1>"), true);
assert.equal(article.html.includes("<strong>bold</strong>"), true);
assert.equal(article.html.includes('href="https://example.com/path"'), true);
assert.equal(article.html.includes("<img"), false);
assert.equal(article.html.includes("<pre"), false);
assert.equal(article.html.includes("<code"), false);
assert.equal(article.plain.includes("[图片 1: Diagram]"), true);
assert.equal(article.plain.includes("[代码块 1: js]"), true);
assert.equal(article.assets.images.length, 1);
assert.equal(article.assets.images[0].url, "https://example.com/diagram.png");
assert.equal(article.assets.images[0].safeLabel, "diagram");
assert.equal(article.assets.images[0].sourceKind, "remote");
assert.equal(article.assets.images[0].suggestedFilename, "diagram.png");
assert.equal(article.assets.codeBlocks.length, 1);
assert.equal(article.assets.codeBlocks[0].code, 'console.log("hello");');
assert.equal(article.assets.codeBlocks[0].safeLabel, "code-block-1-js");
assert.equal(article.assets.codeBlocks[0].suggestedFilename, "code-block-1-js.js");

const formattedArticleHtml = markdownToArticleHtml(`最近有个很明显的感觉：
微信群消息看不过来，朋友圈看不过来。

1. 卡兹克的 AIHOT

网址： aihot.virxact.com
`);

assert.equal(formattedArticleHtml.includes("<strong>最近有个很明显的感觉：</strong><br>"), true);
assert.equal(formattedArticleHtml.includes("<h2>1. 卡兹克的 AIHOT</h2>"), true);
assert.equal(formattedArticleHtml.includes("<strong>网址：</strong>"), true);
assert.equal(formattedArticleHtml.includes('href="https://aihot.virxact.com"'), true);
assert.equal(formattedArticleHtml.includes(">aihot.virxact.com</a>"), true);

const smartFormattedArticleHtml = markdownToArticleHtml(`最近有个很明显的感觉：
微信群消息看不过来，朋友圈看不过来，公众号看不过来。
固定收藏几个高质量信息源，然后时不时扫一遍。

1. 卡兹克的 AIHOT

网址： aihot.virxact.com
推荐理由： 它主要聚合 AI 相关动态，也可以接 Agent。

我的结论：信息源不需要很多，关键是筛选和整理。
引用：少一点噪音，多一点判断。
`);

assert.equal(smartFormattedArticleHtml.includes("<strong>最近有个很明显的感觉：</strong>"), true);
assert.equal(smartFormattedArticleHtml.includes("<strong>高质量信息源</strong>"), true);
assert.equal(smartFormattedArticleHtml.includes("<strong>推荐理由：</strong>"), true);
assert.equal(smartFormattedArticleHtml.includes("聚合 <strong>AI</strong> 相关动态"), true);
assert.equal(smartFormattedArticleHtml.includes("<strong>Agent</strong>"), true);
assert.equal(smartFormattedArticleHtml.includes("<blockquote>"), true);
assert.equal(smartFormattedArticleHtml.includes("<strong>我的结论：</strong> 信息源不需要很多"), true);
assert.equal(smartFormattedArticleHtml.includes("少一点噪音，多一点判断。"), true);

const articleWithMeta = convertLongform(`---
title: Article From Frontmatter
tags: [x, article]
---

# Article Title
`);

assert.equal(articleWithMeta.meta.title, "Article From Frontmatter");
assert.deepEqual(articleWithMeta.meta.tags, ["x", "article"]);

const articleWithTable = convertLongform(`# Table Article

| Channel | Format | Safe on X |
| :--- | :---: | ---: |
| Article | Longform | Yes |
| Thread | Posts | Yes |
`);

assert.equal(articleWithTable.assets.tables.length, 1);
assert.equal(articleWithTable.assets.tables[0].headers[0], "Channel");
assert.deepEqual(articleWithTable.assets.tables[0].alignments, ["left", "center", "right"]);
assert.equal(articleWithTable.assets.tables[0].rows[1][1], "Posts");
assert.equal(articleWithTable.assets.tables[0].safeLabel, "channel-format");
assert.equal(articleWithTable.assets.tables[0].suggestedFilename, "channel-format.csv");
assert.equal(articleWithTable.plain.includes("[表格 1: Channel Format]"), true);
assert.equal(articleWithTable.html.includes("<table"), false);

const articleWithBreakExample = convertLongform(`Code sample:

\`\`\`markdown
<!-- tweet -->
\`\`\`
`);

assert.equal(articleWithBreakExample.plain.includes("[代码块 1: markdown]"), true);
assert.equal(articleWithBreakExample.assets.codeBlocks[0].code.includes("<!-- tweet -->"), true);

const tildeArticle = convertLongform(`Before.

~~~ts title="demo"
const marker = "<!-- tweet -->";
~~~

After with \`inlineCode()\`.
`);

assert.equal(tildeArticle.plain.includes("[代码块 1: ts]"), true);
assert.equal(tildeArticle.plain.includes("inlineCode()"), true);
assert.equal(tildeArticle.assets.codeBlocks.length, 1);
assert.equal(tildeArticle.assets.codeBlocks[0].lang, "ts");
assert.equal(tildeArticle.assets.codeBlocks[0].code.includes("<!-- tweet -->"), true);
assert.equal(tildeArticle.html.includes("<pre"), false);
assert.equal(tildeArticle.html.includes("<code"), false);

const threadWithCodeBreakComment = convertMarkdown(`Intro.

~~~markdown
<!-- tweet -->
~~~

Outro.`, { maxChars: 280, numbering: "none" });

assert.equal(threadWithCodeBreakComment.posts.length, 1);
assert.equal(threadWithCodeBreakComment.cleaned.includes("<!-- tweet -->"), true);

const imageArticle = convertLongform(`![Local diagram](./assets/flow(1).png "Local title")

![Remote chart](https://example.com/charts/run(foo).png 'Remote title')

![](</relative/path/final draft (v2).png> "Spaced title")
`);

assert.equal(imageArticle.assets.images.length, 3);
assert.equal(imageArticle.assets.images[0].url, "./assets/flow(1).png");
assert.equal(imageArticle.assets.images[0].title, "Local title");
assert.equal(imageArticle.assets.images[0].safeLabel, "local-diagram");
assert.equal(imageArticle.assets.images[0].sourceKind, "relative");
assert.equal(imageArticle.assets.images[0].suggestedFilename, "local-diagram.png");
assert.equal(imageArticle.assets.images[1].url, "https://example.com/charts/run(foo).png");
assert.equal(imageArticle.assets.images[1].title, "Remote title");
assert.equal(imageArticle.assets.images[1].sourceKind, "remote");
assert.equal(imageArticle.assets.images[2].url, "/relative/path/final draft (v2).png");
assert.equal(imageArticle.assets.images[2].title, "Spaced title");
assert.equal(imageArticle.assets.images[2].safeLabel, "spaced-title");
assert.equal(imageArticle.assets.images[2].sourceKind, "local");
assert.equal(imageArticle.assets.images[2].suggestedFilename, "spaced-title.png");
assert.equal(imageArticle.plain.includes("[图片 1: Local diagram]"), true);
assert.equal(imageArticle.plain.includes("[图片 3: Spaced title]"), true);
assert.equal(imageArticle.html.includes("<img"), false);

const cleanedImage = cleanMarkdown(`Look ![Graph](https://example.com/a(b).png "Graph title") and [docs](https://example.com/read(me)).`);

assert.equal(cleanedImage.includes("图片: Graph https://example.com/a(b).png"), true);
assert.equal(cleanedImage.includes("docs: https://example.com/read(me)"), true);

const assetMetadataArticle = convertLongform(`![Chart](https://cdn.example.com/charts/revenue.Q1.PNG?width=800#hero)

![Chart](<./assets/chart copy.jpg?raw=1> "Second chart")

![Inline data](data:image/svg+xml;base64,PHN2Zy8+)

![Logo](assets/logo.webp?v=2)

![Local file](</Users/me/Final Draft (v2).jpeg?cache=1> "Local title")
`);

assert.equal(assetMetadataArticle.assets.images.length, 5);
assert.deepEqual(
  assetMetadataArticle.assets.images.map((image) => image.safeLabel),
  ["chart", "chart-2", "inline-data", "logo", "local-file"],
);
assert.deepEqual(
  assetMetadataArticle.assets.images.map((image) => image.sourceKind),
  ["remote", "relative", "data", "relative", "local"],
);
assert.deepEqual(
  assetMetadataArticle.assets.images.map((image) => image.suggestedFilename),
  ["chart.png", "chart-2.jpg", "inline-data.svg", "logo.webp", "local-file.jpeg"],
);
assert.equal(assetMetadataArticle.assets.images[0].url, "https://cdn.example.com/charts/revenue.Q1.PNG?width=800#hero");
assert.equal(assetMetadataArticle.assets.images[1].url, "./assets/chart copy.jpg?raw=1");
assert.equal(assetMetadataArticle.assets.images[4].url, "/Users/me/Final Draft (v2).jpeg?cache=1");
assert.equal(assetMetadataArticle.plain.includes("[图片 1: Chart]"), true);
assert.equal(assetMetadataArticle.plain.includes("[图片 2: Chart]"), true);
assert.equal(assetMetadataArticle.plain.includes("[图片 3: Inline data]"), true);

const articleMetadata = convertLongform(`---
标题: 中文标题
封面: ./cover.png
---

# Fallback title

Intro paragraph.

![Body image](./body.png)

https://x.com/example/status/1234567890123456789

\`\`\`text
https://x.com/not-a-tweet/status/1
\`\`\`
`);

assert.equal(articleMetadata.article.title, "中文标题");
assert.equal(articleMetadata.article.titleSource, "frontmatter");
assert.equal(articleMetadata.article.cover.url, "./cover.png");
assert.equal(articleMetadata.article.cover.source, "frontmatter");
assert.equal(articleMetadata.article.cover.imageIndex, 1);
assert.equal(articleMetadata.assets.images.length, 2);
assert.equal(articleMetadata.assets.images[0].role, "cover");
assert.equal(articleMetadata.assets.images[0].safeLabel, "cover");
assert.equal(articleMetadata.assets.images[1].role, "body");
assert.equal(articleMetadata.assets.tweetEmbeds.length, 1);
assert.equal(articleMetadata.assets.tweetEmbeds[0].url, "https://x.com/example/status/1234567890123456789");
assert.equal(articleMetadata.assets.tweetEmbeds[0].index, 1);
assert.equal(articleMetadata.assets.tweetEmbeds[0].safeLabel, "tweet-1");

const inferredArticleMetadata = convertLongform(`# H1 Title

![Hero image](https://example.com/hero.jpg)
`);

assert.equal(inferredArticleMetadata.article.title, "H1 Title");
assert.equal(inferredArticleMetadata.article.titleSource, "heading");
assert.equal(inferredArticleMetadata.article.cover.url, "https://example.com/hero.jpg");
assert.equal(inferredArticleMetadata.article.cover.source, "first-image");
assert.equal(inferredArticleMetadata.article.cover.imageIndex, 1);

const codeMetadataArticle = convertLongform(`\`\`\`typescript
const value: string = "ok";
\`\`\`

\`\`\`
plain text
\`\`\`
`);

assert.deepEqual(
  codeMetadataArticle.assets.codeBlocks.map((block) => block.safeLabel),
  ["code-block-1-typescript", "code-block-2"],
);
assert.deepEqual(
  codeMetadataArticle.assets.codeBlocks.map((block) => block.suggestedFilename),
  ["code-block-1-typescript.ts", "code-block-2.txt"],
);

const unsafeArticle = convertLongform(`<img src=x onerror="alert(1)">

<a href="javascript:alert(1)" onclick="alert(2)" style="color:red">bad</a>

<script>alert("x")</script>

\`\`\`html
<img src=x>
\`\`\`
`);

assert.equal(/<img\b/i.test(unsafeArticle.html), false);
assert.equal(/<pre\b/i.test(unsafeArticle.html), false);
assert.equal(/<code\b/i.test(unsafeArticle.html), false);
assert.equal(/<script\b|javascript:|onerror|onclick|style=/i.test(unsafeArticle.html), false);
assert.equal(unsafeArticle.html.includes("<a>bad</a>"), true);

const longText = Array.from({ length: 120 }, (_, index) => `句子${index}很好。`).join("");
const thread = convertMarkdown(longText, { maxChars: 120, numbering: "suffix" });

assert.ok(thread.posts.length > 1);
for (const stat of thread.stats) {
  assert.ok(stat.length <= thread.maxChars, `post ${stat.index} is too long`);
  assert.equal(stat.valid, true);
}

console.log("converter tests passed");
