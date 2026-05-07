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
};

const app = document.querySelector("#app");
const localImageAttachments = new Map();
let toastTimer = 0;

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="title-block">
        <p class="eyebrow">本地发布工作台</p>
        <h1>X Markdown Composer</h1>
        <div id="draftMeta" class="draft-meta"></div>
      </div>
      <div class="actions">
        <button class="ghost" id="loadSample" type="button">示例</button>
        <button class="ghost" id="clearInput" type="button">清空</button>
        <button class="primary" id="copyCurrent" type="button">复制当前</button>
      </div>
    </header>

    <section class="toolbar" aria-label="转换设置">
      <div class="mode-cluster">
        <span>输出</span>
        <div class="segmented" role="group" aria-label="输出模式">
          <button type="button" data-mode="article">长文</button>
          <button type="button" data-mode="thread">Thread</button>
        </div>
      </div>
      <div id="threadSettings" class="thread-settings">
        <label>
          <span>单条上限</span>
          <input id="maxChars" type="number" min="80" max="25000" step="1" />
        </label>
        <label>
          <span>编号</span>
          <select id="numbering">
            <option value="suffix">后缀 1/n</option>
            <option value="prefix">前缀 1/n</option>
            <option value="none">无编号</option>
          </select>
        </label>
      </div>
      <div class="metrics" id="metrics"></div>
      <div class="workflow-status" id="workflowStatus"></div>
    </section>

    <section class="workspace" aria-label="写作发布工作台">
      <section class="pane editor-zone" aria-label="Markdown 编辑器">
        <div class="pane-title">
          <h2>Markdown 源稿</h2>
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
          <h2 id="publishTitle">发布流程</h2>
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
  sourceCount.textContent = `${Array.from(state.input).length} chars`;
  threadSettings.hidden = state.mode !== "thread";
  document.querySelector("#copyCurrent").textContent = state.mode === "article" ? "复制正文" : "复制 Thread";

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.dataset.active = String(button.dataset.mode === state.mode);
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

function renderDraftMeta(result) {
  const title = getDraftTitle(result);
  const summary = stringMeta(result.meta, "summary") || stringMeta(result.meta, "description");
  const tags = normalizeTags(result.meta?.tags);
  const status = stringMeta(result.meta, "status") || "local draft";

  draftMeta.innerHTML = `
    <span class="draft-title">${escapeHtml(title)}</span>
    <span>${escapeHtml(status)}</span>
    ${summary ? `<span>${escapeHtml(summary)}</span>` : ""}
    ${tags.slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
  `;
}

function renderArticle(result) {
  outputTitle.textContent = "长文预览";
  previewStatus.textContent = "正文预览";
  const readiness = articleReadiness(result);
  workflowStatus.innerHTML = renderWorkflowPills(readiness);
  metrics.innerHTML = `
    <span>${result.stats.chars} 字符</span>
    <span>${result.stats.paragraphs} 段</span>
    <span>${result.assets.images.length} 图</span>
    <span>${result.assets.codeBlocks.length} 代码</span>
    <span>约 ${result.stats.readMinutes} 分钟</span>
  `;

  output.innerHTML = "";
  if (!result.plain) {
    output.innerHTML = `<div class="empty">等待 Markdown</div>`;
    return;
  }

  const preview = document.createElement("article");
  preview.className = "article-preview";
  preview.innerHTML = result.html;

  const fallback = document.createElement("details");
  fallback.className = "plain-fallback";
  fallback.innerHTML = `
    <summary>纯文本预览</summary>
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

  outputTitle.textContent = "Thread 预览";
  previewStatus.textContent = `${result.posts.length} posts`;
  workflowStatus.innerHTML = renderWorkflowPills(readiness);
  metrics.innerHTML = `
    <span>${result.posts.length} 条</span>
    <span>最长 ${longest}/${result.maxChars}</span>
    <span class="${invalidCount ? "bad" : "good"}">${invalidCount ? `${invalidCount} 条超限` : "全部可发"}</span>
  `;

  output.innerHTML = "";
  if (!result.posts.length) {
    output.innerHTML = `<div class="empty">等待 Markdown</div>`;
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
        <button class="ghost small" type="button">复制</button>
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
        <span class="brief-label">目标渠道</span>
        <strong>X Articles</strong>
        <p>本地生成正文、素材包和发布顺序；不保存账号，不消耗 API token。</p>
      </div>
      <span class="manual-badge">Manual</span>
    </div>

    ${renderReadinessList(readiness)}

    <div class="publish-block command-panel">
      <div>
        <h3>发布动作</h3>
        <p>先复制正文，再处理素材；ZIP 是可回退的完整发布包。</p>
      </div>
      <div class="publish-actions">
        <button class="primary" type="button" data-action="copy-body">复制正文</button>
        <button class="ghost" type="button" data-action="copy-plain">复制纯文本</button>
        <button class="ghost" type="button" data-action="download-txt">下载 TXT</button>
        <button class="primary subtle" type="button" data-action="download-pack">下载 ZIP 发布包</button>
        <button class="ghost" type="button" data-action="open-x">打开 X Articles</button>
      </div>
    </div>

    <div class="publish-block">
      <div class="publish-block-head">
        <div>
          <h3>素材库</h3>
          <p>图片无法直接随正文进入 X；本地附件会优先进入 ZIP，代码块会生成 PNG。</p>
        </div>
        <div class="asset-summary">
          <span>${result.assets.images.length} 图</span>
          <span>${result.assets.codeBlocks.length} 代码</span>
          <span>${localImages} 本地</span>
        </div>
      </div>
    </div>
  `;

  flow.querySelector('[data-action="copy-body"]').addEventListener("click", () => copyRichText(result.html, result.plain));
  flow
    .querySelector('[data-action="copy-plain"]')
    .addEventListener("click", () => copyText(result.plain, "已复制纯文本"));
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
        <span class="brief-label">目标渠道</span>
        <strong>X Thread</strong>
        <p>本地拆分帖子，保留顺序和长度检查；发布时手动复制到 X。</p>
      </div>
      <span class="manual-badge">Manual</span>
    </div>

    ${renderReadinessList(readiness)}

    <div class="publish-block command-panel">
      <div class="publish-block-head">
        <div>
          <h3>发布动作</h3>
          <p>${invalidCount ? `${invalidCount} 条超过当前上限，请调整长度。` : "全部在当前长度限制内；可以整体复制或逐条复制。"}</p>
        </div>
        <div class="asset-summary">
          <span>${result.posts.length} 条</span>
          <span>${result.maxChars} 上限</span>
        </div>
      </div>
      <div class="publish-actions">
        <button class="primary" type="button" data-action="copy-thread">复制 Thread</button>
        <button class="ghost" type="button" data-action="download-txt">下载 TXT</button>
        <button class="ghost" type="button" data-action="download-pack">下载 ZIP</button>
        <button class="ghost" type="button" data-action="open-x">打开 X</button>
      </div>
    </div>
  `;

  flow
    .querySelector('[data-action="copy-thread"]')
    .addEventListener("click", () => copyText(result.posts.join("\n\n"), "已复制 Thread"));
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
      label: "稿件",
      detail: hasBody ? `${result.stats.paragraphs} 段，约 ${result.stats.readMinutes} 分钟` : "等待正文",
      state: hasBody ? "done" : "todo",
    },
    {
      label: "标题",
      detail: hasTitle ? getDraftTitle(result) : "建议用 # 标题或 frontmatter title",
      state: hasTitle ? "done" : "warn",
    },
    {
      label: "素材",
      detail: imageCount || codeCount ? `${imageCount} 图，${codeCount} 代码，${localImages} 本地` : "无额外素材",
      state: remoteImages ? "warn" : "done",
    },
    {
      label: "发布包",
      detail: "TXT / HTML / ZIP 已可生成",
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
      label: "拆分",
      detail: hasPosts ? `${result.posts.length} 条帖子` : "等待正文",
      state: hasPosts ? "done" : "todo",
    },
    {
      label: "长度",
      detail: hasPosts ? `最长 ${longest}/${result.maxChars}` : "无内容",
      state: invalidCount ? "warn" : hasPosts ? "done" : "todo",
    },
    {
      label: "编号",
      detail: state.numbering === "none" ? "不编号" : state.numbering === "prefix" ? "前缀编号" : "后缀编号",
      state: "done",
    },
    {
      label: "发布包",
      detail: "Thread TXT / ZIP 已可生成",
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
  return warn ? `${done}/${items.length} 待检查` : `${done}/${items.length} 就绪`;
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

async function copyText(text, successMessage = "已复制纯文本", failureMessage = "复制失败，请手动选择文本") {
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
    await copyText(plain, "已复制正文纯文本", "正文复制失败，请手动选择文本");
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
    showCopied("已复制正文");
    return true;
  } catch (error) {
    console.warn(error);
    return copyText(plain, "富文本不可用，已复制纯文本", "正文复制失败，请手动选择文本");
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
    showToast("正在生成发布包");
    const blob = isArticle ? await createArticlePack(result) : await createThreadPack(result);
    downloadBlob(blob, isArticle ? "x-article-pack.zip" : "x-thread-pack.zip");
    showToast(isArticle ? "Article 发布包已下载" : "Thread 发布包已下载");
  } catch (error) {
    console.warn(error);
    showToast("发布包生成失败，请重试", "error");
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
    button.textContent = isBusy ? "打包中" : button.dataset.idleLabel;
  });
}

function openXComposer() {
  const isArticle = state.mode === "article";
  const url = isArticle ? "https://x.com/compose/article" : "https://x.com/compose/post";
  const opened = openSafeWindow(url);
  if (opened) {
    showToast(isArticle ? "已打开 X：正文和素材需分别粘贴/上传" : "已打开 X 发帖");
  } else {
    showToast("打开 X 被浏览器阻止，请允许弹窗", "error");
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
  showCopied("正在打包");
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
        <h3>素材明细</h3>
        <p>不会随正文复制；从卡片处理，或上传 ZIP 里的 assets/。</p>
      </div>
      <span>${totalAssets} 项</span>
    </div>
  `;

  if (assets.images.length) {
    const group = document.createElement("div");
    group.className = "asset-group";
    group.innerHTML = `<h4>图片</h4>`;

    assets.images.forEach((image) => {
      const safeUrl = safeImageUrl(image.url);
      const attachment = getLocalImageAttachment(image);
      const previewUrl = attachment?.previewUrl || safeUrl;
      const previewText = attachment ? "本地图片" : "拖入本地图片";
      const item = document.createElement("article");
      item.className = "asset-card image-asset";
      item.innerHTML = `
        <div class="asset-preview local-drop${attachment ? " has-local" : ""}" data-drop-zone tabindex="0" role="button" aria-label="选择本地图片">
          ${previewUrl ? `<img alt="" loading="lazy" src="${escapeAttribute(previewUrl)}" />` : `<span>${previewText}</span>`}
          <span class="drop-hint">${attachment ? `本地: ${escapeHtml(attachment.file.name)}` : "选择或拖放本地图片"}</span>
        </div>
        <div class="asset-body">
          <strong>图片 ${image.index}</strong>
          <p>${escapeHtml(image.alt || image.title || image.url)}</p>
          <small>${attachment ? `ZIP 优先使用本地附件: ${escapeHtml(localImagePackPath(image, attachment.file))}` : `ZIP: ${escapeHtml(remoteImagePackPath(image))} 或 ${escapeHtml(imageUrlFallbackPath(image))}`}</small>
          <input class="asset-file-input" type="file" accept="image/*" hidden />
          <div class="asset-actions local-actions">
            <button class="ghost small" type="button" data-action="choose-local">选择本地图片</button>
            ${attachment ? `<button class="ghost small" type="button" data-action="remove-local">移除本地</button>` : ""}
          </div>
          <div class="asset-actions">
            <button class="ghost small" type="button" data-action="copy-url">复制 URL</button>
            <button class="ghost small" type="button" data-action="copy-image">复制图片</button>
            <button class="ghost small" type="button" data-action="download-image">下载图片</button>
            <button class="ghost small" type="button" data-action="open-image">打开</button>
          </div>
        </div>
      `;

      const previewImage = item.querySelector("img");
      if (previewImage) {
        previewImage.addEventListener("error", () => {
          item.classList.add("preview-failed");
          item.querySelector(".asset-preview").innerHTML = "<span>预览失败</span>";
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
        .addEventListener("click", () => copyText(image.url, "已复制图片 URL", "图片 URL 复制失败"));
      item.querySelector('[data-action="copy-image"]').addEventListener("click", () => copyImageAsset(image));
      item.querySelector('[data-action="download-image"]').addEventListener("click", () => downloadImageAsset(image));
      item.querySelector('[data-action="open-image"]').addEventListener("click", () => {
        openExternalUrl(safeUrl || image.url, "图片无法打开，已复制 URL");
      });
      group.appendChild(item);
    });

    section.appendChild(group);
  }

  if (assets.codeBlocks.length) {
    const group = document.createElement("div");
    group.className = "asset-group";
    group.innerHTML = `<h4>代码截图</h4>`;

    assets.codeBlocks.forEach((block) => {
      const item = document.createElement("article");
      item.className = "asset-card code-asset";
      item.innerHTML = `
        <div class="code-shot" data-code-shot></div>
        <div class="asset-body">
          <strong>代码块 ${block.index}${block.lang ? `: ${escapeHtml(block.lang)}` : ""}</strong>
          <small>ZIP: ${escapeHtml(codeImagePath(block))}</small>
          <div class="asset-actions">
            <button class="ghost small" type="button" data-action="copy-code">复制代码</button>
            <button class="ghost small" type="button" data-action="copy-code-image">复制截图</button>
            <button class="ghost small" type="button" data-action="download-code-image">下载截图</button>
          </div>
        </div>
      `;

      const shot = item.querySelector("[data-code-shot]");
      shot.textContent = block.code;
      item.querySelector('[data-action="copy-code"]').addEventListener("click", () => copyText(block.code, "已复制代码"));
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
    showToast("请选择图片文件", "error");
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
  showToast("本地图片已附加");
  render();
}

function removeLocalImage(image) {
  const key = imageAttachmentKey(image);
  const current = localImageAttachments.get(key);
  if (current?.previewUrl) {
    URL.revokeObjectURL(current.previewUrl);
  }
  localImageAttachments.delete(key);
  showToast("已移除本地图片");
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
    await copyPngBlob(png, "已复制本地图片");
  } catch (error) {
    console.warn(error);
    downloadBlob(attachment.file, attachment.file.name || localImageFilename(image, attachment.file));
    showToast("图片复制不可用，已下载本地文件", "warning");
  }
}

async function downloadImageAsset(image) {
  const attachment = getLocalImageAttachment(image);
  if (attachment) {
    downloadBlob(attachment.file, attachment.file.name || localImageFilename(image, attachment.file));
    showToast("本地图片已下载");
    return;
  }

  const safeUrl = safeImageUrl(image.url);
  if (!safeUrl) {
    await copyText(image.url, "图片不能直接下载，已复制 URL", "图片 URL 复制失败");
    return;
  }

  try {
    const response = await fetch(safeUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const png = await imageBlobToPng(await response.blob());
    downloadBlob(png, remoteImageFilename(image));
    showToast("图片已下载");
  } catch (error) {
    console.warn(error);
    await copyText(image.url, "图片下载失败，已复制 URL", "图片下载失败，URL 也未复制");
  }
}

async function copyImageFromUrl(url) {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) {
    await copyText(url, "图片不能直接复制，已复制 URL", "图片 URL 复制失败");
    return;
  }

  try {
    const response = await fetch(safeUrl, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const png = await imageBlobToPng(blob);
    await copyPngBlob(png, "已复制图片");
  } catch (error) {
    console.warn(error);
    await copyText(url, "图片复制失败，已复制 URL", "图片复制失败，URL 也未复制");
  }
}

async function copyCodeImage(block) {
  let blob;
  try {
    blob = await renderCodeImage(block);
  } catch (error) {
    console.warn(error);
    await copyText(block.code, "截图生成失败，已复制代码", "截图生成失败");
    return;
  }

  try {
    await copyPngBlob(blob, "已复制代码截图");
  } catch (error) {
    console.warn(error);
    downloadBlob(blob, `code-${block.index}.png`);
    showToast("截图复制不可用，已下载 PNG", "warning");
  }
}

async function downloadCodeImage(block) {
  try {
    const blob = await renderCodeImage(block);
    downloadBlob(blob, `code-${block.index}.png`);
    showToast("代码截图已下载");
  } catch (error) {
    console.warn(error);
    await copyText(block.code, "截图下载失败，已复制代码", "截图下载失败");
  }
}

async function copyPngBlob(blob, successMessage = "已复制图片") {
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
    copyText(url, failureMessage, "URL 复制失败");
    return;
  }

  const opened = openSafeWindow(safeUrl);
  if (!opened) {
    copyText(safeUrl, "打开被阻止，已复制 URL", "打开被阻止，URL 复制失败");
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
