import "./styles.css";
import { convertLongform, convertMarkdown, DEFAULT_OPTIONS } from "./converter.js";
import JSZip from "jszip";

const sample = `---
title: Twitter Markdown test
summary: 本地写稿，转换成 X 长文和 Thread 发布包
tags: [X, Markdown, Longform]
status: draft
---

# 我的一篇 Markdown 长文草稿

这是一段 **重点** 内容。平时我会写成 Markdown，但普通 X Post 不会渲染这些标记。长文模式会保留文章结构，复制富文本后再贴进 X Articles/长文编辑器。

![示例配图](https://placehold.co/1200x675/png?text=X+Article)

## 关键点

- [x] 保留 Markdown 源稿
- 输出长文纯文本，避免 Markdown 符号乱入
- 支持富文本复制：标题、粗体、列表、链接尽量保留

链接示例：[项目主页](https://example.com/very/long/path)

> 这类引用在纯文本里会降级，但富文本预览会保留为引用样式。

## 一段代码

\`\`\`js
const format = "rich copy for X Articles";
console.log(format);
\`\`\`

<!-- tweet -->

只有切 Thread 的时候，这个注释才会被当成手动断点。长文模式会直接忽略它。
`;

const state = {
  input: localStorage.getItem("xmd.input") || sample,
  maxChars: Number(localStorage.getItem("xmd.maxChars") || DEFAULT_OPTIONS.maxChars),
  mode: localStorage.getItem("xmd.mode") || "article",
  numbering: localStorage.getItem("xmd.numbering") || DEFAULT_OPTIONS.numbering,
  lang: localStorage.getItem("xmd.lang") || "zh",
};

const app = document.querySelector("#app");
const localImageAttachments = new Map();
let toastTimer = 0;

const I18N = {
  zh: {
    appEyebrow: "本地发布工作台",
    heroLede: "把 Markdown 长文变成可复制的 X Articles 正文、Thread 和发布素材包。",
    privacyLabel: "隐私",
    privacyTitle: "本地处理",
    privacyDesc: "不上传草稿，不需要 X token。",
    workflowLabel: "流程",
    workflowTitle: "手动发布",
    workflowDesc: "复制正文，素材单独上传。",
    output: "输出",
    article: "长文",
    thread: "Thread",
    maxChars: "单条上限",
    numbering: "编号",
    numberingSuffix: "后缀 1/n",
    numberingPrefix: "前缀 1/n",
    numberingNone: "无编号",
    sample: "示例",
    clear: "清空",
    copyCurrentArticle: "复制正文",
    copyCurrentThread: "复制 Thread",
    markdownSource: "Markdown 源稿",
    publishFlow: "发布流程",
    articlePreview: "长文预览",
    threadPreview: "Thread 预览",
    bodyPreview: "正文预览",
    emptyMarkdown: "等待 Markdown",
    plainPreview: "纯文本预览",
    chars: "{count} 字符",
    paragraphs: "{count} 段",
    imageCount: "{count} 图",
    codeCount: "{count} 代码",
    readTime: "约 {count} 分钟",
    posts: "{count} 条",
    longest: "最长 {longest}/{max}",
    allGood: "全部可发",
    overLimit: "{count} 条超限",
    localDraft: "local draft",
    targetChannel: "目标渠道",
    manual: "Manual",
    articleBrief: "本地生成正文、素材包和发布顺序；不保存账号，不消耗 API token。",
    threadBrief: "本地拆分帖子，保留顺序和长度检查；发布时手动复制到 X。",
    publishActions: "发布动作",
    articleActionDesc: "先复制正文，再处理素材；ZIP 是可回退的完整发布包。",
    threadActionGood: "全部在当前长度限制内；可以整体复制或逐条复制。",
    threadActionInvalid: "{count} 条超过当前上限，请调整长度。",
    copyBody: "复制正文",
    copyPlain: "复制纯文本",
    downloadTxt: "下载 TXT",
    downloadZipPack: "下载 ZIP 发布包",
    downloadZip: "下载 ZIP",
    openXArticles: "打开 X Articles",
    openX: "打开 X",
    assetLibrary: "素材库",
    assetLibraryDesc: "图片无法直接随正文进入 X；本地附件会优先进入 ZIP，代码块会生成 PNG。",
    draft: "稿件",
    draftReady: "{paragraphs} 段，约 {minutes} 分钟",
    waitBody: "等待正文",
    title: "标题",
    titleMissing: "建议用 # 标题或 frontmatter title",
    assets: "素材",
    assetsReady: "{images} 图，{codes} 代码，{local} 本地",
    noAssets: "无额外素材",
    pack: "发布包",
    articlePackReady: "TXT / HTML / ZIP 已可生成",
    threadPackReady: "Thread TXT / ZIP 已可生成",
    split: "拆分",
    splitReady: "{count} 条帖子",
    length: "长度",
    noContent: "无内容",
    suffixNumbering: "后缀编号",
    prefixNumbering: "前缀编号",
    noNumbering: "不编号",
    readyStatus: "{done}/{total} 就绪",
    checkStatus: "{done}/{total} 待检查",
    assetDetails: "素材明细",
    assetDetailsDesc: "不会随正文复制；从卡片处理，或上传 ZIP 里的 assets/。",
    assetItems: "{count} 项",
    images: "图片",
    codeScreenshots: "代码截图",
    localImage: "本地图片",
    dropImage: "拖入本地图片",
    chooseOrDropImage: "选择或拖放本地图片",
    localFilePrefix: "本地",
    image: "图片 {index}",
    zipLocal: "ZIP 优先使用本地附件: {path}",
    zipRemote: "ZIP: {path} 或 {fallback}",
    chooseLocalImage: "选择本地图片",
    removeLocal: "移除本地",
    copyUrl: "复制 URL",
    copyImage: "复制图片",
    downloadImage: "下载图片",
    open: "打开",
    previewFailed: "预览失败",
    codeBlock: "代码块 {index}{lang}",
    copyCode: "复制代码",
    copyCodeImage: "复制截图",
    downloadCodeImage: "下载截图",
    copiedPlain: "已复制纯文本",
    copiedBody: "已复制正文",
    copiedThread: "已复制 Thread",
    copiedImageUrl: "已复制图片 URL",
    copiedCode: "已复制代码",
    copiedImage: "已复制图片",
    copiedLocalImage: "已复制本地图片",
    copiedCodeImage: "已复制代码截图",
    copyFailed: "复制失败，请手动选择文本",
    bodyCopyFailed: "正文复制失败，请手动选择文本",
    richUnavailable: "富文本不可用，已复制纯文本",
    packBuilding: "正在生成发布包",
    packing: "正在打包",
    articlePackDownloaded: "Article 发布包已下载",
    threadPackDownloaded: "Thread 发布包已下载",
    packFailed: "发布包生成失败，请重试",
    chooseImageFile: "请选择图片文件",
    localImageAttached: "本地图片已附加",
    localImageRemoved: "已移除本地图片",
    imageCopyUnavailable: "图片复制不可用，已下载本地文件",
    localImageDownloaded: "本地图片已下载",
    imageCannotDownload: "图片不能直接下载，已复制 URL",
    imageDownloaded: "图片已下载",
    imageDownloadFailed: "图片下载失败，已复制 URL",
    imageDownloadAndCopyFailed: "图片下载失败，URL 也未复制",
    imageCannotCopy: "图片不能直接复制，已复制 URL",
    imageCopyFailed: "图片复制失败，已复制 URL",
    imageCopyAndUrlFailed: "图片复制失败，URL 也未复制",
    codeImageFailedCopiedCode: "截图生成失败，已复制代码",
    codeImageFailed: "截图生成失败",
    codeImageUnavailableDownloaded: "截图复制不可用，已下载 PNG",
    codeImageDownloaded: "代码截图已下载",
    codeImageDownloadFailedCopied: "截图下载失败，已复制代码",
    codeImageDownloadFailed: "截图下载失败",
    xArticleOpened: "已打开 X：正文和素材需分别粘贴/上传",
    xPostOpened: "已打开 X 发帖",
    popupBlocked: "打开 X 被浏览器阻止，请允许弹窗",
    externalOpenFallback: "无法打开，已复制链接",
  },
  en: {
    appEyebrow: "Local publishing desk",
    heroLede: "Turn Markdown drafts into paste-ready X Articles, threads, and publish packs.",
    privacyLabel: "Privacy",
    privacyTitle: "Local-first",
    privacyDesc: "No draft upload. No X token.",
    workflowLabel: "Workflow",
    workflowTitle: "Manual publish",
    workflowDesc: "Copy body, upload assets separately.",
    output: "Output",
    article: "Article",
    thread: "Thread",
    maxChars: "Post limit",
    numbering: "Numbering",
    numberingSuffix: "Suffix 1/n",
    numberingPrefix: "Prefix 1/n",
    numberingNone: "No numbering",
    sample: "Sample",
    clear: "Clear",
    copyCurrentArticle: "Copy body",
    copyCurrentThread: "Copy thread",
    markdownSource: "Markdown source",
    publishFlow: "Publish flow",
    articlePreview: "Article preview",
    threadPreview: "Thread preview",
    bodyPreview: "Body preview",
    emptyMarkdown: "Waiting for Markdown",
    plainPreview: "Plain text preview",
    chars: "{count} chars",
    paragraphs: "{count} paragraphs",
    imageCount: "{count} images",
    codeCount: "{count} code",
    readTime: "About {count} min",
    posts: "{count} posts",
    longest: "Longest {longest}/{max}",
    allGood: "All postable",
    overLimit: "{count} over limit",
    localDraft: "local draft",
    targetChannel: "Target channel",
    manual: "Manual",
    articleBrief: "Generates body copy, assets, and publish order locally; no account storage or API token.",
    threadBrief: "Splits posts locally and checks order and length; publish manually in X.",
    publishActions: "Publish actions",
    articleActionDesc: "Copy the body first, then handle assets; ZIP is the complete fallback pack.",
    threadActionGood: "All posts fit the current limit; copy as a whole or one by one.",
    threadActionInvalid: "{count} posts exceed the current limit.",
    copyBody: "Copy body",
    copyPlain: "Copy plain",
    downloadTxt: "Download TXT",
    downloadZipPack: "Download ZIP pack",
    downloadZip: "Download ZIP",
    openXArticles: "Open X Articles",
    openX: "Open X",
    assetLibrary: "Asset library",
    assetLibraryDesc: "Images cannot ride with body copy into X; local files enter ZIP first, code blocks render to PNG.",
    draft: "Draft",
    draftReady: "{paragraphs} paragraphs, about {minutes} min",
    waitBody: "Waiting for body",
    title: "Title",
    titleMissing: "Use a # heading or frontmatter title",
    assets: "Assets",
    assetsReady: "{images} images, {codes} code, {local} local",
    noAssets: "No extra assets",
    pack: "Pack",
    articlePackReady: "TXT / HTML / ZIP ready",
    threadPackReady: "Thread TXT / ZIP ready",
    split: "Split",
    splitReady: "{count} posts",
    length: "Length",
    noContent: "No content",
    suffixNumbering: "Suffix numbering",
    prefixNumbering: "Prefix numbering",
    noNumbering: "No numbering",
    readyStatus: "{done}/{total} ready",
    checkStatus: "{done}/{total} check",
    assetDetails: "Asset details",
    assetDetailsDesc: "Assets are not copied with the body; use cards or upload ZIP assets.",
    assetItems: "{count} items",
    images: "Images",
    codeScreenshots: "Code screenshots",
    localImage: "Local image",
    dropImage: "Drop local image",
    chooseOrDropImage: "Choose or drop a local image",
    localFilePrefix: "Local",
    image: "Image {index}",
    zipLocal: "ZIP uses local file first: {path}",
    zipRemote: "ZIP: {path} or {fallback}",
    chooseLocalImage: "Choose local image",
    removeLocal: "Remove local",
    copyUrl: "Copy URL",
    copyImage: "Copy image",
    downloadImage: "Download image",
    open: "Open",
    previewFailed: "Preview failed",
    codeBlock: "Code block {index}{lang}",
    copyCode: "Copy code",
    copyCodeImage: "Copy image",
    downloadCodeImage: "Download image",
    copiedPlain: "Copied plain text",
    copiedBody: "Copied body",
    copiedThread: "Copied thread",
    copiedImageUrl: "Copied image URL",
    copiedCode: "Copied code",
    copiedImage: "Copied image",
    copiedLocalImage: "Copied local image",
    copiedCodeImage: "Copied code image",
    copyFailed: "Copy failed. Select text manually.",
    bodyCopyFailed: "Body copy failed. Select text manually.",
    richUnavailable: "Rich copy unavailable. Copied plain text.",
    packBuilding: "Building publish pack",
    packing: "Packing",
    articlePackDownloaded: "Article publish pack downloaded",
    threadPackDownloaded: "Thread publish pack downloaded",
    packFailed: "Publish pack failed. Try again.",
    chooseImageFile: "Choose an image file",
    localImageAttached: "Local image attached",
    localImageRemoved: "Local image removed",
    imageCopyUnavailable: "Image copy unavailable. Downloaded local file.",
    localImageDownloaded: "Local image downloaded",
    imageCannotDownload: "Cannot download image directly. Copied URL.",
    imageDownloaded: "Image downloaded",
    imageDownloadFailed: "Image download failed. Copied URL.",
    imageDownloadAndCopyFailed: "Image download failed and URL copy failed.",
    imageCannotCopy: "Cannot copy image directly. Copied URL.",
    imageCopyFailed: "Image copy failed. Copied URL.",
    imageCopyAndUrlFailed: "Image copy failed and URL copy failed.",
    codeImageFailedCopiedCode: "Screenshot failed. Copied code.",
    codeImageFailed: "Screenshot failed",
    codeImageUnavailableDownloaded: "Screenshot copy unavailable. Downloaded PNG.",
    codeImageDownloaded: "Code image downloaded",
    codeImageDownloadFailedCopied: "Screenshot download failed. Copied code.",
    codeImageDownloadFailed: "Screenshot download failed",
    xArticleOpened: "Opened X. Paste body and upload assets separately.",
    xPostOpened: "Opened X composer",
    popupBlocked: "X popup was blocked. Allow popups.",
    externalOpenFallback: "Could not open link. Copied URL.",
  },
};

app.innerHTML = `
  <main class="shell">
    <header class="topbar hero-panel">
      <div class="title-block hero-copy">
        <p class="eyebrow" id="appEyebrow"></p>
        <h1>X Markdown Composer</h1>
        <p class="hero-lede" id="heroLede"></p>
        <div id="draftMeta" class="draft-meta"></div>
      </div>
      <div class="hero-cards" aria-label="发布方式说明">
        <article>
          <span id="privacyLabel"></span>
          <strong id="privacyTitle"></strong>
          <p id="privacyDesc"></p>
        </article>
        <article>
          <span id="workflowLabel"></span>
          <strong id="workflowTitle"></strong>
          <p id="workflowDesc"></p>
        </article>
      </div>
      <div class="hero-actions">
        <div class="language-switch" aria-label="Language">
          <button type="button" data-lang="zh">中</button>
          <button type="button" data-lang="en">EN</button>
        </div>
        <div class="actions">
          <button class="ghost" id="loadSample" type="button"></button>
          <button class="ghost" id="clearInput" type="button"></button>
          <button class="primary" id="copyCurrent" type="button"></button>
        </div>
      </div>
    </header>

    <section class="toolbar" aria-label="转换设置">
      <div class="mode-cluster">
        <span id="outputModeLabel"></span>
        <div class="segmented" role="group" aria-label="输出模式">
          <button type="button" data-mode="article"></button>
          <button type="button" data-mode="thread">Thread</button>
        </div>
      </div>
      <div id="threadSettings" class="thread-settings">
        <label>
          <span id="maxCharsLabel"></span>
          <input id="maxChars" type="number" min="80" max="25000" step="1" />
        </label>
        <label>
          <span id="numberingLabel"></span>
          <select id="numbering">
            <option value="suffix"></option>
            <option value="prefix"></option>
            <option value="none"></option>
          </select>
        </label>
      </div>
      <div class="metrics" id="metrics"></div>
      <div class="workflow-status" id="workflowStatus"></div>
    </section>

    <section class="workspace" aria-label="写作发布工作台">
      <section class="pane editor-zone" aria-label="Markdown 编辑器">
        <div class="pane-title">
          <h2 id="markdownSourceTitle"></h2>
          <span id="sourceCount"></span>
        </div>
        <textarea id="source" spellcheck="false"></textarea>
      </section>

      <section class="pane preview-zone" aria-label="预览">
        <div class="pane-title">
          <h2 id="outputTitle">Article preview</h2>
          <span id="previewStatus"></span>
        </div>
        <div id="output" class="output"></div>
      </section>

      <aside class="pane publish-zone" aria-label="发布与素材">
        <div class="pane-title">
          <h2 id="publishTitle"></h2>
          <span id="publishStatus"></span>
        </div>
        <div id="publishPanel" class="publish-panel"></div>
      </aside>
    </section>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
`;

const source = document.querySelector("#source");
const maxChars = document.querySelector("#maxChars");
const numbering = document.querySelector("#numbering");
const output = document.querySelector("#output");
const outputTitle = document.querySelector("#outputTitle");
const metrics = document.querySelector("#metrics");
const draftMeta = document.querySelector("#draftMeta");
const sourceCount = document.querySelector("#sourceCount");
const threadSettings = document.querySelector("#threadSettings");
const workflowStatus = document.querySelector("#workflowStatus");
const previewStatus = document.querySelector("#previewStatus");
const publishStatus = document.querySelector("#publishStatus");
const publishPanel = document.querySelector("#publishPanel");
const toast = document.querySelector("#toast");
const languageButtons = document.querySelectorAll("[data-lang]");

source.value = state.input;
maxChars.value = state.maxChars;
numbering.value = state.numbering;

source.addEventListener("input", () => {
  state.input = source.value;
  localStorage.setItem("xmd.input", state.input);
  render();
});

maxChars.addEventListener("input", () => {
  state.maxChars = Number(maxChars.value || DEFAULT_OPTIONS.maxChars);
  localStorage.setItem("xmd.maxChars", String(state.maxChars));
  render();
});

numbering.addEventListener("change", () => {
  state.numbering = numbering.value;
  localStorage.setItem("xmd.numbering", state.numbering);
  render();
});

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    localStorage.setItem("xmd.mode", state.mode);
    render();
  });
});

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.lang = button.dataset.lang;
    localStorage.setItem("xmd.lang", state.lang);
    render();
  });
});

document.querySelector("#loadSample").addEventListener("click", () => {
  source.value = sample;
  state.input = sample;
  localStorage.setItem("xmd.input", sample);
  render();
});

document.querySelector("#clearInput").addEventListener("click", () => {
  source.value = "";
  state.input = "";
  localStorage.setItem("xmd.input", "");
  render();
  source.focus();
});

document.querySelector("#copyCurrent").addEventListener("click", async () => {
  if (state.mode === "article") {
    const result = convertLongform(state.input);
    await copyRichText(result.html, result.plain);
    return;
  }

  const result = convertMarkdown(state.input, state);
  await copyText(result.posts.join("\n\n"));
});

function downloadCurrentTxt() {
  const isArticle = state.mode === "article";
  const result = isArticle ? convertLongform(state.input) : convertMarkdown(state.input, state);
  const content = isArticle
    ? result.plain
    : result.posts.map((post, index) => `Tweet ${index + 1}/${result.posts.length}\n${post}`).join("\n\n---\n\n");
  const blob = new Blob([`${content}\n`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = isArticle ? "x-article.txt" : "x-thread.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

function render() {
  updateStaticText();
  sourceCount.textContent = t("chars", { count: Array.from(state.input).length });
  threadSettings.hidden = state.mode !== "thread";
  document.querySelector("#copyCurrent").textContent =
    state.mode === "article" ? t("copyCurrentArticle") : t("copyCurrentThread");

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.dataset.active = String(button.dataset.mode === state.mode);
  });
  languageButtons.forEach((button) => {
    const active = button.dataset.lang === state.lang;
    button.dataset.active = String(active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (state.mode === "article") {
    const result = convertLongform(state.input);
    renderDraftMeta(result);
    renderArticle(result);
    renderPublishPanel(result);
  } else {
    const result = convertMarkdown(state.input, state);
    renderDraftMeta(result);
    renderThread(result);
    renderPublishPanel(result);
  }
}

function updateStaticText() {
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
  document.querySelector("#appEyebrow").textContent = t("appEyebrow");
  document.querySelector("#heroLede").textContent = t("heroLede");
  document.querySelector("#privacyLabel").textContent = t("privacyLabel");
  document.querySelector("#privacyTitle").textContent = t("privacyTitle");
  document.querySelector("#privacyDesc").textContent = t("privacyDesc");
  document.querySelector("#workflowLabel").textContent = t("workflowLabel");
  document.querySelector("#workflowTitle").textContent = t("workflowTitle");
  document.querySelector("#workflowDesc").textContent = t("workflowDesc");
  document.querySelector("#outputModeLabel").textContent = t("output");
  document.querySelector('[data-mode="article"]').textContent = t("article");
  document.querySelector('[data-mode="thread"]').textContent = t("thread");
  document.querySelector("#maxCharsLabel").textContent = t("maxChars");
  document.querySelector("#numberingLabel").textContent = t("numbering");
  numbering.querySelector('[value="suffix"]').textContent = t("numberingSuffix");
  numbering.querySelector('[value="prefix"]').textContent = t("numberingPrefix");
  numbering.querySelector('[value="none"]').textContent = t("numberingNone");
  document.querySelector("#loadSample").textContent = t("sample");
  document.querySelector("#clearInput").textContent = t("clear");
  document.querySelector("#markdownSourceTitle").textContent = t("markdownSource");
  document.querySelector("#publishTitle").textContent = t("publishFlow");
}

function renderDraftMeta(result) {
  const title = getDraftTitle(result);
  const summary = stringMeta(result.meta, "summary") || stringMeta(result.meta, "description");
  const tags = normalizeTags(result.meta?.tags);
  const status = stringMeta(result.meta, "status") || t("localDraft");

  draftMeta.innerHTML = `
    <span class="draft-title">${escapeHtml(title)}</span>
    <span>${escapeHtml(status)}</span>
    ${summary ? `<span>${escapeHtml(summary)}</span>` : ""}
    ${tags.slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
  `;
}

function renderArticle(result) {
  outputTitle.textContent = t("articlePreview");
  previewStatus.textContent = t("bodyPreview");
  const readiness = articleReadiness(result);
  workflowStatus.innerHTML = renderWorkflowPills(readiness);
  metrics.innerHTML = `
    <span>${t("chars", { count: result.stats.chars })}</span>
    <span>${t("paragraphs", { count: result.stats.paragraphs })}</span>
    <span>${t("imageCount", { count: result.assets.images.length })}</span>
    <span>${t("codeCount", { count: result.assets.codeBlocks.length })}</span>
    <span>${t("readTime", { count: result.stats.readMinutes })}</span>
  `;

  output.innerHTML = "";
  if (!result.plain) {
    output.innerHTML = `<div class="empty">${escapeHtml(t("emptyMarkdown"))}</div>`;
    return;
  }

  const preview = document.createElement("article");
  preview.className = "article-preview";
  preview.innerHTML = result.html;

  const fallback = document.createElement("details");
  fallback.className = "plain-fallback";
  fallback.innerHTML = `
    <summary>${escapeHtml(t("plainPreview"))}</summary>
    <textarea readonly spellcheck="false"></textarea>
  `;
  const textarea = fallback.querySelector("textarea");
  textarea.value = result.plain;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(180, textarea.scrollHeight)}px`;

  output.append(preview, fallback);
}

function renderThread(result) {
  const invalidCount = result.stats.filter((item) => !item.valid).length;
  const longest = result.stats.reduce((max, item) => Math.max(max, item.length), 0);
  const readiness = threadReadiness(result);

  outputTitle.textContent = t("threadPreview");
  previewStatus.textContent = t("posts", { count: result.posts.length });
  workflowStatus.innerHTML = renderWorkflowPills(readiness);
  metrics.innerHTML = `
    <span>${t("posts", { count: result.posts.length })}</span>
    <span>${t("longest", { longest, max: result.maxChars })}</span>
    <span class="${invalidCount ? "bad" : "good"}">${invalidCount ? t("overLimit", { count: invalidCount }) : t("allGood")}</span>
  `;

  output.innerHTML = "";
  if (!result.posts.length) {
    output.innerHTML = `<div class="empty">${escapeHtml(t("emptyMarkdown"))}</div>`;
    return;
  }

  result.posts.forEach((post, index) => {
    const stat = result.stats[index];
    const item = document.createElement("article");
    item.className = `post ${stat.valid ? "" : "invalid"}`;
    item.innerHTML = `
      <div class="post-head">
        <strong>Tweet ${index + 1}</strong>
        <span>${stat.length}/${result.maxChars}</span>
        <button class="ghost small" type="button">${escapeHtml(t("copyBody"))}</button>
      </div>
      <textarea readonly spellcheck="false"></textarea>
    `;

    const textarea = item.querySelector("textarea");
    textarea.value = post;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;

    item.querySelector("button").addEventListener("click", () => copyText(post));
    output.appendChild(item);
  });
}

function renderPublishPanel(result) {
  publishPanel.innerHTML = "";
  if (state.mode === "article") {
    renderArticlePublishPanel(result);
    return;
  }

  renderThreadPublishPanel(result);
}

function renderArticlePublishPanel(result) {
  const totalAssets = result.assets.images.length + result.assets.codeBlocks.length;
  const localImages = result.assets.images.filter((image) => getLocalImageAttachment(image)).length;
  const readiness = articleReadiness(result);
  publishStatus.textContent = readinessLabel(readiness);

  const flow = document.createElement("section");
  flow.className = "publish-flow";
  flow.innerHTML = `
    <div class="publish-brief">
      <div>
        <span class="brief-label">${escapeHtml(t("targetChannel"))}</span>
        <strong>X Articles</strong>
        <p>${escapeHtml(t("articleBrief"))}</p>
      </div>
      <span class="manual-badge">${escapeHtml(t("manual"))}</span>
    </div>

    ${renderReadinessList(readiness)}

    <div class="publish-block command-panel">
      <div>
        <h3>${escapeHtml(t("publishActions"))}</h3>
        <p>${escapeHtml(t("articleActionDesc"))}</p>
      </div>
      <div class="publish-actions">
        <button class="primary" type="button" data-action="copy-body">${escapeHtml(t("copyBody"))}</button>
        <button class="ghost" type="button" data-action="copy-plain">${escapeHtml(t("copyPlain"))}</button>
        <button class="ghost" type="button" data-action="download-txt">${escapeHtml(t("downloadTxt"))}</button>
        <button class="primary subtle" type="button" data-action="download-pack">${escapeHtml(t("downloadZipPack"))}</button>
        <button class="ghost" type="button" data-action="open-x">${escapeHtml(t("openXArticles"))}</button>
      </div>
    </div>

    <div class="publish-block">
      <div class="publish-block-head">
        <div>
          <h3>${escapeHtml(t("assetLibrary"))}</h3>
          <p>${escapeHtml(t("assetLibraryDesc"))}</p>
        </div>
        <div class="asset-summary">
          <span>${escapeHtml(t("imageCount", { count: result.assets.images.length }))}</span>
          <span>${escapeHtml(t("codeCount", { count: result.assets.codeBlocks.length }))}</span>
          <span>${localImages} ${state.lang === "en" ? "local" : "本地"}</span>
        </div>
      </div>
    </div>
  `;

  flow.querySelector('[data-action="copy-body"]').addEventListener("click", () => copyRichText(result.html, result.plain));
  flow
    .querySelector('[data-action="copy-plain"]')
    .addEventListener("click", () => copyText(result.plain, t("copiedPlain")));
  flow.querySelector('[data-action="download-txt"]').addEventListener("click", () => downloadCurrentTxt());
  flow.querySelector('[data-action="download-pack"]').addEventListener("click", () => downloadPublishPack());
  flow.querySelector('[data-action="open-x"]').addEventListener("click", () => openXComposer());

  publishPanel.appendChild(flow);
  if (totalAssets) {
    publishPanel.appendChild(renderAssets(result.assets));
  }
}

function renderThreadPublishPanel(result) {
  const readiness = threadReadiness(result);
  publishStatus.textContent = readinessLabel(readiness);
  const invalidCount = result.stats.filter((item) => !item.valid).length;
  const flow = document.createElement("section");
  flow.className = "publish-flow";
  flow.innerHTML = `
    <div class="publish-brief">
      <div>
        <span class="brief-label">${escapeHtml(t("targetChannel"))}</span>
        <strong>X Thread</strong>
        <p>${escapeHtml(t("threadBrief"))}</p>
      </div>
      <span class="manual-badge">${escapeHtml(t("manual"))}</span>
    </div>

    ${renderReadinessList(readiness)}

    <div class="publish-block command-panel">
      <div class="publish-block-head">
        <div>
          <h3>${escapeHtml(t("publishActions"))}</h3>
          <p>${escapeHtml(invalidCount ? t("threadActionInvalid", { count: invalidCount }) : t("threadActionGood"))}</p>
        </div>
        <div class="asset-summary">
          <span>${escapeHtml(t("posts", { count: result.posts.length }))}</span>
          <span>${escapeHtml(t("longest", { longest: result.maxChars, max: result.maxChars }))}</span>
        </div>
      </div>
      <div class="publish-actions">
        <button class="primary" type="button" data-action="copy-thread">${escapeHtml(t("copyCurrentThread"))}</button>
        <button class="ghost" type="button" data-action="download-txt">${escapeHtml(t("downloadTxt"))}</button>
        <button class="ghost" type="button" data-action="download-pack">${escapeHtml(t("downloadZip"))}</button>
        <button class="ghost" type="button" data-action="open-x">${escapeHtml(t("openX"))}</button>
      </div>
    </div>
  `;

  flow
    .querySelector('[data-action="copy-thread"]')
    .addEventListener("click", () => copyText(result.posts.join("\n\n"), t("copiedThread")));
  flow.querySelector('[data-action="download-txt"]').addEventListener("click", () => downloadCurrentTxt());
  flow.querySelector('[data-action="download-pack"]').addEventListener("click", () => downloadPublishPack());
  flow.querySelector('[data-action="open-x"]').addEventListener("click", () => openXComposer());
  publishPanel.appendChild(flow);
}

function articleReadiness(result) {
  const imageCount = result.assets.images.length;
  const codeCount = result.assets.codeBlocks.length;
  const localImages = result.assets.images.filter((image) => getLocalImageAttachment(image)).length;
  const remoteImages = result.assets.images.filter((image) => !getLocalImageAttachment(image)).length;
  const hasBody = Boolean(result.plain.trim());
  const hasTitle = Boolean(getDraftTitle(result));

  return [
    {
      label: t("draft"),
      detail: hasBody
        ? t("draftReady", { paragraphs: result.stats.paragraphs, minutes: result.stats.readMinutes })
        : t("waitBody"),
      state: hasBody ? "done" : "todo",
    },
    {
      label: t("title"),
      detail: hasTitle ? getDraftTitle(result) : t("titleMissing"),
      state: hasTitle ? "done" : "warn",
    },
    {
      label: t("assets"),
      detail: imageCount || codeCount ? t("assetsReady", { images: imageCount, codes: codeCount, local: localImages }) : t("noAssets"),
      state: remoteImages ? "warn" : "done",
    },
    {
      label: t("pack"),
      detail: t("articlePackReady"),
      state: hasBody ? "done" : "todo",
    },
  ];
}

function threadReadiness(result) {
  const invalidCount = result.stats.filter((item) => !item.valid).length;
  const longest = result.stats.reduce((max, item) => Math.max(max, item.length), 0);
  const hasPosts = result.posts.length > 0;

  return [
    {
      label: t("split"),
      detail: hasPosts ? t("splitReady", { count: result.posts.length }) : t("waitBody"),
      state: hasPosts ? "done" : "todo",
    },
    {
      label: t("length"),
      detail: hasPosts ? t("longest", { longest, max: result.maxChars }) : t("noContent"),
      state: invalidCount ? "warn" : hasPosts ? "done" : "todo",
    },
    {
      label: t("numbering"),
      detail: state.numbering === "none" ? t("noNumbering") : state.numbering === "prefix" ? t("prefixNumbering") : t("suffixNumbering"),
      state: "done",
    },
    {
      label: t("pack"),
      detail: t("threadPackReady"),
      state: hasPosts ? "done" : "todo",
    },
  ];
}

function renderReadinessList(items) {
  return `
    <div class="readiness-list" aria-label="发布检查清单">
      ${items
        .map(
          (item, index) => `
            <div class="readiness-item" data-state="${item.state}">
              <span>${index + 1}</span>
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.detail)}</small>
              </div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderWorkflowPills(items) {
  return items
    .map((item) => `<span data-state="${item.state}">${escapeHtml(item.label)}</span>`)
    .join("");
}

function readinessLabel(items) {
  const done = items.filter((item) => item.state === "done").length;
  const warn = items.some((item) => item.state === "warn");
  return warn ? t("checkStatus", { done, total: items.length }) : t("readyStatus", { done, total: items.length });
}

function getDraftTitle(result) {
  return stringMeta(result.meta, "title") || firstMarkdownHeading(state.input) || "";
}

function firstMarkdownHeading(markdown) {
  const match = /^#\s+(.+)$/m.exec(String(markdown ?? ""));
  return match ? match[1].replace(/[#*_`[\]()]/g, "").trim() : "";
}

function stringMeta(meta, key) {
  const value = meta?.[key];
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function t(key, values = {}) {
  const dictionary = I18N[state.lang] || I18N.zh;
  const template = dictionary[key] ?? I18N.zh[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_match, name) => String(values[name] ?? ""));
}

async function copyText(text, successMessage = t("copiedPlain"), failureMessage = t("copyFailed")) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else if (!fallbackCopyText(text)) {
      throw new Error("Clipboard text write is unavailable");
    }
    showCopied(successMessage);
    return true;
  } catch (error) {
    console.warn(error);
    showToast(failureMessage, "error");
    return false;
  }
}

async function copyRichText(html, plain) {
  if (!window.ClipboardItem || !navigator.clipboard?.write) {
    await copyText(plain, t("copiedPlain"), t("bodyCopyFailed"));
    return false;
  }

  try {
    const richHtml = `<!doctype html><html><body>${html}</body></html>`;
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([richHtml], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    showCopied(t("copiedBody"));
    return true;
  } catch (error) {
    console.warn(error);
    return copyText(plain, t("richUnavailable"), t("bodyCopyFailed"));
  }
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto 0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

async function downloadPublishPack() {
  const isArticle = state.mode === "article";
  const result = isArticle ? convertLongform(state.input) : convertMarkdown(state.input, state);
  setPackBusy(true);
  try {
    showToast(t("packBuilding"));
    const blob = isArticle ? await createArticlePack(result) : await createThreadPack(result);
    downloadBlob(blob, isArticle ? "x-article-pack.zip" : "x-thread-pack.zip");
    showToast(isArticle ? t("articlePackDownloaded") : t("threadPackDownloaded"));
  } catch (error) {
    console.warn(error);
    showToast(t("packFailed"), "error");
  } finally {
    setPackBusy(false);
  }
}

function setPackBusy(isBusy) {
  document.querySelectorAll('[data-action="download-pack"]').forEach((button) => {
    if (!button.dataset.idleLabel) {
      button.dataset.idleLabel = button.textContent;
    }
    button.disabled = isBusy;
    button.textContent = isBusy ? t("packing") : button.dataset.idleLabel;
  });
}

function openXComposer() {
  const isArticle = state.mode === "article";
  const url = isArticle ? "https://x.com/compose/article" : "https://x.com/compose/post";
  const opened = openSafeWindow(url);
  if (opened) {
    showToast(isArticle ? t("xArticleOpened") : t("xPostOpened"));
  } else {
    showToast(t("popupBlocked"), "error");
  }
}

async function createArticlePack(result) {
  const zip = new JSZip();
  const packNotes = {
    codeErrors: [],
    imageUrlFallbacks: [],
    localImages: [],
  };
  zip.file("article.txt", `${result.plain}\n`);
  zip.file("article.html", `<!doctype html><html><meta charset="utf-8"><body>${result.html}</body></html>\n`);

  for (const block of result.assets.codeBlocks) {
    const textPath = codeTextPath(block);
    const imagePath = codeImagePath(block);
    zip.file(textPath, `${block.code}\n`);
    try {
      const image = await renderCodeImage(block);
      zip.file(imagePath, image);
    } catch (error) {
      packNotes.codeErrors.push({ block, error });
      zip.file(codeErrorPath(block), `${formatError(error)}\n`);
    }
  }

  for (const image of result.assets.images) {
    const attachment = getLocalImageAttachment(image);
    if (attachment) {
      const path = localImagePackPath(image, attachment.file);
      zip.file(path, attachment.file);
      packNotes.localImages.push({
        fileName: attachment.file.name,
        path,
        image,
      });
      continue;
    }

    const safeUrl = safeImageUrl(image.url);
    if (!safeUrl) {
      packNotes.imageUrlFallbacks.push({ image, reason: "unsupported-url" });
      zip.file(`assets/images/image-${image.index}.url.txt`, `${image.url}\n`);
      continue;
    }
    try {
      const response = await fetch(safeUrl, { mode: "cors" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const png = await imageBlobToPng(await response.blob());
      zip.file(remoteImagePackPath(image), png);
    } catch (error) {
      packNotes.imageUrlFallbacks.push({ image, reason: formatError(error) });
      zip.file(imageUrlFallbackPath(image), `${image.url}\n`);
    }
  }

  zip.file("manifest.md", buildArticleManifest(result, packNotes));
  return zip.generateAsync({ type: "blob" });
}

async function createThreadPack(result) {
  showCopied(t("packing"));
  const zip = new JSZip();
  const body = result.posts.map((post, index) => `Tweet ${index + 1}/${result.posts.length}\n${post}`).join("\n\n---\n\n");
  zip.file("thread.txt", `${body}\n`);
  zip.file(
    "manifest.md",
    `# X Thread Pack

- Posts: ${result.posts.length}
- Max chars: ${result.maxChars}

Use \`thread.txt\` to copy each post into X.
`,
  );
  return zip.generateAsync({ type: "blob" });
}

function buildArticleManifest(result, packNotes = { codeErrors: [], imageUrlFallbacks: [], localImages: [] }) {
  const localImages = new Map((packNotes.localImages || []).map((item) => [item.image.index, item]));
  const lines = [
    "# X Article Pack",
    "",
    "## Publish Flow",
    "",
    "1. Paste `article.txt` or rich-copy `article.html` content into X Articles.",
    "2. Upload media separately from `assets/images/` and `assets/code/`; local image attachments are used first.",
    "3. If an image only has `.url.txt`, the source site blocked browser download; open or download it manually.",
    "",
    "## Files",
    "",
    "- `article.txt`: paste-friendly body copy.",
    "- `article.html`: rich text body backup.",
    "- `assets/code/*.png`: code screenshots for media upload.",
    "- `assets/code/*.txt`: original code blocks.",
    "- `assets/images/image-*.*`: local attachments or fetched image copies when CORS allows it.",
    "- `assets/images/*.url.txt`: image URLs when browser fetch is blocked or unsafe.",
    "",
    "## Images",
    "",
  ];

  if (result.assets.images.length) {
    result.assets.images.forEach((image) => {
      const local = localImages.get(image.index);
      const source = local ? `local attachment \`${local.path}\` from ${local.fileName}` : image.url;
      lines.push(`${image.index}. ${image.alt || image.title || "Image"} — ${source}`);
    });
  } else {
    lines.push("No images.");
  }

  lines.push("", "## Code Blocks", "");
  if (result.assets.codeBlocks.length) {
    result.assets.codeBlocks.forEach((block) => {
      const failed = packNotes.codeErrors.some((item) => item.block.index === block.index);
      lines.push(
        `${block.index}. ${block.lang || "code"} — \`${failed ? codeErrorPath(block) : codeImagePath(block)}\``,
      );
    });
  } else {
    lines.push("No code blocks.");
  }

  if (packNotes.imageUrlFallbacks.length || packNotes.codeErrors.length) {
    lines.push("", "## Pack Notes", "");
    packNotes.imageUrlFallbacks.forEach(({ image, reason }) => {
      lines.push(`- Image ${image.index} saved as URL only: ${reason}.`);
    });
    packNotes.codeErrors.forEach(({ block, error }) => {
      lines.push(`- Code block ${block.index} screenshot failed: ${formatError(error)}.`);
    });
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderAssets(assets) {
  const section = document.createElement("section");
  section.className = "asset-section";
  const totalAssets = assets.images.length + assets.codeBlocks.length;
  section.innerHTML = `
    <div class="asset-section-head">
      <div>
        <h3>${escapeHtml(t("assetDetails"))}</h3>
        <p>${escapeHtml(t("assetDetailsDesc"))}</p>
      </div>
      <span>${escapeHtml(t("assetItems", { count: totalAssets }))}</span>
    </div>
  `;

  if (assets.images.length) {
    const group = document.createElement("div");
    group.className = "asset-group";
    group.innerHTML = `<h4>${escapeHtml(t("images"))}</h4>`;

    assets.images.forEach((image) => {
      const safeUrl = safeImageUrl(image.url);
      const attachment = getLocalImageAttachment(image);
      const previewUrl = attachment?.previewUrl || safeUrl;
      const previewText = attachment ? t("localImage") : t("dropImage");
      const item = document.createElement("article");
      item.className = "asset-card image-asset";
      item.innerHTML = `
        <div class="asset-preview local-drop${attachment ? " has-local" : ""}" data-drop-zone tabindex="0" role="button" aria-label="${escapeAttribute(t("chooseLocalImage"))}">
          ${previewUrl ? `<img alt="" loading="lazy" src="${escapeAttribute(previewUrl)}" />` : `<span>${previewText}</span>`}
          <span class="drop-hint">${attachment ? `${escapeHtml(t("localFilePrefix"))}: ${escapeHtml(attachment.file.name)}` : escapeHtml(t("chooseOrDropImage"))}</span>
        </div>
        <div class="asset-body">
          <strong>${escapeHtml(t("image", { index: image.index }))}</strong>
          <p>${escapeHtml(image.alt || image.title || image.url)}</p>
          <small>${
            attachment
              ? escapeHtml(t("zipLocal", { path: localImagePackPath(image, attachment.file) }))
              : escapeHtml(t("zipRemote", { path: remoteImagePackPath(image), fallback: imageUrlFallbackPath(image) }))
          }</small>
          <input class="asset-file-input" type="file" accept="image/*" hidden />
          <div class="asset-actions local-actions">
            <button class="ghost small" type="button" data-action="choose-local">${escapeHtml(t("chooseLocalImage"))}</button>
            ${attachment ? `<button class="ghost small" type="button" data-action="remove-local">${escapeHtml(t("removeLocal"))}</button>` : ""}
          </div>
          <div class="asset-actions">
            <button class="ghost small" type="button" data-action="copy-url">${escapeHtml(t("copyUrl"))}</button>
            <button class="ghost small" type="button" data-action="copy-image">${escapeHtml(t("copyImage"))}</button>
            <button class="ghost small" type="button" data-action="download-image">${escapeHtml(t("downloadImage"))}</button>
            <button class="ghost small" type="button" data-action="open-image">${escapeHtml(t("open"))}</button>
          </div>
        </div>
      `;

      const previewImage = item.querySelector("img");
      if (previewImage) {
        previewImage.addEventListener("error", () => {
          item.classList.add("preview-failed");
          item.querySelector(".asset-preview").innerHTML = `<span>${escapeHtml(t("previewFailed"))}</span>`;
        });
      }

      const fileInput = item.querySelector(".asset-file-input");
      const dropZone = item.querySelector("[data-drop-zone]");
      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        fileInput.value = "";
        attachLocalImage(image, file);
      });
      item.querySelector('[data-action="choose-local"]').addEventListener("click", () => fileInput.click());
      item.querySelector('[data-action="remove-local"]')?.addEventListener("click", () => removeLocalImage(image));
      dropZone.addEventListener("click", () => fileInput.click());
      dropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          fileInput.click();
        }
      });
      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropZone.classList.add("is-dragging");
        });
      });
      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove("is-dragging"));
      });
      dropZone.addEventListener("drop", (event) => {
        event.preventDefault();
        attachLocalImage(image, event.dataTransfer?.files?.[0]);
      });
      item
        .querySelector('[data-action="copy-url"]')
        .addEventListener("click", () => copyText(image.url, t("copiedImageUrl"), t("copyFailed")));
      item.querySelector('[data-action="copy-image"]').addEventListener("click", () => copyImageAsset(image));
      item.querySelector('[data-action="download-image"]').addEventListener("click", () => downloadImageAsset(image));
      item.querySelector('[data-action="open-image"]').addEventListener("click", () => {
        openExternalUrl(safeUrl || image.url, t("externalOpenFallback"));
      });
      group.appendChild(item);
    });

    section.appendChild(group);
  }

  if (assets.codeBlocks.length) {
    const group = document.createElement("div");
    group.className = "asset-group";
    group.innerHTML = `<h4>${escapeHtml(t("codeScreenshots"))}</h4>`;

    assets.codeBlocks.forEach((block) => {
      const item = document.createElement("article");
      item.className = "asset-card code-asset";
      item.innerHTML = `
        <div class="code-shot" data-code-shot></div>
        <div class="asset-body">
          <strong>${escapeHtml(t("codeBlock", { index: block.index, lang: block.lang ? `: ${block.lang}` : "" }))}</strong>
          <small>ZIP: ${escapeHtml(codeImagePath(block))}</small>
          <div class="asset-actions">
            <button class="ghost small" type="button" data-action="copy-code">${escapeHtml(t("copyCode"))}</button>
            <button class="ghost small" type="button" data-action="copy-code-image">${escapeHtml(t("copyCodeImage"))}</button>
            <button class="ghost small" type="button" data-action="download-code-image">${escapeHtml(t("downloadCodeImage"))}</button>
          </div>
        </div>
      `;

      const shot = item.querySelector("[data-code-shot]");
      shot.textContent = block.code;
      item.querySelector('[data-action="copy-code"]').addEventListener("click", () => copyText(block.code, t("copiedCode")));
      item.querySelector('[data-action="copy-code-image"]').addEventListener("click", () => copyCodeImage(block));
      item.querySelector('[data-action="download-code-image"]').addEventListener("click", () => downloadCodeImage(block));
      group.appendChild(item);
    });

    section.appendChild(group);
  }

  return section;
}

function imageAttachmentKey(image) {
  return `${image.index}:${image.url}`;
}

function getLocalImageAttachment(image) {
  return localImageAttachments.get(imageAttachmentKey(image));
}

function attachLocalImage(image, file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast(t("chooseImageFile"), "error");
    return;
  }

  const key = imageAttachmentKey(image);
  const current = localImageAttachments.get(key);
  if (current?.previewUrl) {
    URL.revokeObjectURL(current.previewUrl);
  }

  localImageAttachments.set(key, {
    file,
    previewUrl: URL.createObjectURL(file),
  });
  showToast(t("localImageAttached"));
  render();
}

function removeLocalImage(image) {
  const key = imageAttachmentKey(image);
  const current = localImageAttachments.get(key);
  if (current?.previewUrl) {
    URL.revokeObjectURL(current.previewUrl);
  }
  localImageAttachments.delete(key);
  showToast(t("localImageRemoved"));
  render();
}

async function copyImageAsset(image) {
  const attachment = getLocalImageAttachment(image);
  if (!attachment) {
    await copyImageFromUrl(image.url);
    return;
  }

  try {
    const png = await imageBlobToPng(attachment.file);
    await copyPngBlob(png, t("copiedLocalImage"));
  } catch (error) {
    console.warn(error);
    downloadBlob(attachment.file, attachment.file.name || localImageFilename(image, attachment.file));
    showToast(t("imageCopyUnavailable"), "warning");
  }
}

async function downloadImageAsset(image) {
  const attachment = getLocalImageAttachment(image);
  if (attachment) {
    downloadBlob(attachment.file, attachment.file.name || localImageFilename(image, attachment.file));
    showToast(t("localImageDownloaded"));
    return;
  }

  const safeUrl = safeImageUrl(image.url);
  if (!safeUrl) {
    await copyText(image.url, t("imageCannotDownload"), t("copyFailed"));
    return;
  }

  try {
    const response = await fetch(safeUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const png = await imageBlobToPng(await response.blob());
    downloadBlob(png, remoteImageFilename(image));
    showToast(t("imageDownloaded"));
  } catch (error) {
    console.warn(error);
    await copyText(image.url, t("imageDownloadFailed"), t("imageDownloadAndCopyFailed"));
  }
}

async function copyImageFromUrl(url) {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) {
    await copyText(url, t("imageCannotCopy"), t("copyFailed"));
    return;
  }

  try {
    const response = await fetch(safeUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const png = await imageBlobToPng(blob);
    await copyPngBlob(png, t("copiedImage"));
  } catch (error) {
    console.warn(error);
    await copyText(url, t("imageCopyFailed"), t("imageCopyAndUrlFailed"));
  }
}

async function copyCodeImage(block) {
  let blob;
  try {
    blob = await renderCodeImage(block);
  } catch (error) {
    console.warn(error);
    await copyText(block.code, t("codeImageFailedCopiedCode"), t("codeImageFailed"));
    return;
  }

  try {
    await copyPngBlob(blob, t("copiedCodeImage"));
  } catch (error) {
    console.warn(error);
    downloadBlob(blob, `code-${block.index}.png`);
    showToast(t("codeImageUnavailableDownloaded"), "warning");
  }
}

async function downloadCodeImage(block) {
  try {
    const blob = await renderCodeImage(block);
    downloadBlob(blob, `code-${block.index}.png`);
    showToast(t("codeImageDownloaded"));
  } catch (error) {
    console.warn(error);
    await copyText(block.code, t("codeImageDownloadFailedCopied"), t("codeImageDownloadFailed"));
  }
}

async function copyPngBlob(blob, successMessage = t("copiedImage")) {
  if (!window.ClipboardItem || !navigator.clipboard?.write) {
    throw new Error("Clipboard image write is unavailable");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
  showCopied(successMessage);
}

async function imageBlobToPng(blob) {
  if (blob.type === "image/png") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((png) => (png ? resolve(png) : reject(new Error("Could not render PNG"))), "image/png");
  });
}

async function renderCodeImage(block) {
  const code = block.code || "";
  const language = block.lang || "code";
  const fontSize = 22;
  const lineHeight = 34;
  const paddingX = 34;
  const paddingY = 30;
  const headerHeight = 44;
  const maxLineChars = 92;
  const lines = code.split("\n").flatMap((line) => wrapCodeLine(line || " ", maxLineChars));

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d");
  measureContext.font = `${fontSize}px SFMono-Regular, Consolas, monospace`;
  const maxWidth = Math.max(...lines.map((line) => measureContext.measureText(line).width), 420);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(Math.min(maxWidth + paddingX * 2, 1800));
  canvas.height = Math.ceil(headerHeight + paddingY * 2 + lines.length * lineHeight);

  const context = canvas.getContext("2d");
  context.fillStyle = "#111715";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1d2925";
  context.fillRect(0, 0, canvas.width, headerHeight);
  context.fillStyle = "#d8e2dc";
  context.font = `600 18px SFMono-Regular, Consolas, monospace`;
  context.fillText(language, paddingX, 29);
  context.font = `${fontSize}px SFMono-Regular, Consolas, monospace`;
  context.fillStyle = "#f4f7f5";

  lines.forEach((line, index) => {
    context.fillText(line, paddingX, headerHeight + paddingY + index * lineHeight + fontSize);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render code image"))), "image/png");
  });
}

function wrapCodeLine(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const chunks = [];
  for (let index = 0; index < line.length; index += maxChars) {
    chunks.push(line.slice(index, index + maxChars));
  }
  return chunks;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openExternalUrl(url, failureMessage) {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) {
    copyText(url, failureMessage, t("copyFailed"));
    return;
  }

  const opened = openSafeWindow(safeUrl);
  if (!opened) {
    copyText(safeUrl, t("externalOpenFallback"), t("copyFailed"));
  }
}

function openSafeWindow(url) {
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
  }
  return opened;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function codeBaseName(block) {
  return String(block.suggestedFilename || `code-block-${block.index}.txt`).replace(/\.[^.]+$/, "");
}

function codeTextPath(block) {
  return `assets/code/${block.suggestedFilename || `code-block-${block.index}.txt`}`;
}

function codeImagePath(block) {
  return `assets/code/${codeBaseName(block)}.png`;
}

function codeErrorPath(block) {
  return `assets/code/${codeBaseName(block)}.error.txt`;
}

function localImageFilename(image, file) {
  return `${image.safeLabel || `image-${image.index}`}${imageFileExtension(file)}`;
}

function localImagePackPath(image, file) {
  return `assets/images/${localImageFilename(image, file)}`;
}

function remoteImageFilename(image) {
  const name = String(image.suggestedFilename || `image-${image.index}.png`);
  return name.replace(/\.[^.]+$/, ".png");
}

function remoteImagePackPath(image) {
  return `assets/images/${remoteImageFilename(image)}`;
}

function imageUrlFallbackPath(image) {
  return `assets/images/${image.safeLabel || `image-${image.index}`}.url.txt`;
}

function imageFileExtension(file) {
  const extensions = {
    "image/avif": ".avif",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
  };
  if (extensions[file?.type]) return extensions[file.type];

  const fromName = String(file?.name || "").match(/\.([a-z0-9]{1,8})$/i)?.[1];
  return fromName ? `.${fromName.toLowerCase()}` : ".img";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function safeImageUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "data:") {
      return url.href;
    }
  } catch {
    return "";
  }
  return "";
}

function showCopied(message) {
  showToast(message);
}

function showToast(message, kind = "success") {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
    toast.textContent = "";
    delete toast.dataset.kind;
  }, kind === "error" ? 2600 : 1400);
}

render();
