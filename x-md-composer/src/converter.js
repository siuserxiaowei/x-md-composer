import twitterText from "twitter-text";
import { marked } from "marked";

const parser = twitterText?.parseTweet ?? twitterText?.default?.parseTweet;
const MANUAL_BREAK = "\u0000XMDPOSTBREAK\u0000";
const MANUAL_BREAK_COMMENT = /<!--\s*(tweet|thread|x-post|post)\s*-->/gi;
const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpg", "jpeg", "png", "svg", "webp"]);
const IMAGE_EXTENSION_BY_MIME = new Map([
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/svg+xml", "svg"],
  ["image/webp", "webp"],
]);
const CODE_EXTENSION_BY_LANG = new Map([
  ["bash", "sh"],
  ["c", "c"],
  ["c++", "cpp"],
  ["cpp", "cpp"],
  ["cs", "cs"],
  ["csharp", "cs"],
  ["css", "css"],
  ["go", "go"],
  ["html", "html"],
  ["java", "java"],
  ["javascript", "js"],
  ["js", "js"],
  ["json", "json"],
  ["jsx", "jsx"],
  ["markdown", "md"],
  ["md", "md"],
  ["mermaid", "mmd"],
  ["php", "php"],
  ["py", "py"],
  ["python", "py"],
  ["rb", "rb"],
  ["rs", "rs"],
  ["ruby", "rb"],
  ["rust", "rs"],
  ["sh", "sh"],
  ["sql", "sql"],
  ["text", "txt"],
  ["ts", "ts"],
  ["tsx", "tsx"],
  ["txt", "txt"],
  ["typescript", "ts"],
  ["xml", "xml"],
  ["yaml", "yml"],
  ["yml", "yml"],
  ["zsh", "sh"],
]);

export const DEFAULT_OPTIONS = {
  maxChars: 280,
  numbering: "suffix",
};

export function readFrontmatter(markdown) {
  const source = String(markdown ?? "").replace(/\r\n?/g, "\n").normalize("NFC");
  const match = /^(---|\+\+\+)\n([\s\S]*?)\n\1\s*\n?/.exec(source);
  if (!match) {
    return {
      attributes: {},
      body: source,
      raw: "",
      marker: "",
    };
  }

  return {
    attributes: parseFrontmatterAttributes(match[2]),
    body: source.slice(match[0].length),
    raw: match[2],
    marker: match[1],
  };
}

export function weightedLength(value) {
  const text = String(value ?? "").normalize("NFC");
  if (parser) {
    return parser(text).weightedLength;
  }

  let total = 0;
  let cursor = 0;
  for (const match of text.matchAll(/https?:\/\/\S+/gu)) {
    total += fallbackTextLength(text.slice(cursor, match.index));
    total += 23;
    cursor = match.index + match[0].length;
  }
  total += fallbackTextLength(text.slice(cursor));
  return total;
}

export function parsePost(value, maxChars = 280) {
  const text = String(value ?? "").normalize("NFC");
  const length = weightedLength(text);
  const parsed = parser ? parser(text) : null;

  return {
    length,
    valid: length <= maxChars && (parsed ? parsed.valid : true),
  };
}

export function cleanMarkdown(markdown) {
  let text = String(markdown ?? "").replace(/\r\n?/g, "\n").normalize("NFC");
  const codeBlocks = [];

  text = stripFrontmatter(text);
  text = replaceFencedCodeBlocks(text, ({ code }) => {
    const index = codeBlocks.push(code.trim().replace(/\t/g, "  ")) - 1;
    return `\n@@CODEBLOCK${index}@@\n`;
  });
  text = text.replace(MANUAL_BREAK_COMMENT, `\n\n${MANUAL_BREAK}\n\n`);

  text = text.replace(/`([^`\n]+)`/g, "$1");
  text = replaceMarkdownImages(text, ({ alt, destination }) => {
    const label = alt.trim();
    const url = destination.trim();
    return label ? `图片: ${label} ${url}` : `图片: ${url}`;
  });
  text = replaceMarkdownLinks(text, ({ label, destination }) => {
    const cleanLabel = label.trim();
    const url = destination.trim();
    if (!cleanLabel || cleanLabel === url || cleanLabel.includes(url)) return url;
    return `${cleanLabel}: ${url}`;
  });

  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s*[-*+]\s+\[(?: |x|X)\]\s+/gm, "- ");
  text = text.replace(/^\s*[-*+]\s+/gm, "- ");
  text = text.replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, "");
  text = text.replace(/^\s*\|(.+)\|\s*$/gm, (_match, row) => {
    return row
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean)
      .join(" | ");
  });
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  text = text.replace(/(^|[^\p{L}\p{N}])__([^_\n]+)__([^\p{L}\p{N}]|$)/gu, "$1$2$3");
  text = text.replace(/\*([^*\n]+)\*/g, "$1");
  text = text.replace(/(^|[^\p{L}\p{N}])_([^_\n]+)_([^\p{L}\p{N}]|$)/gu, "$1$2$3");
  text = text.replace(/@@CODEBLOCK(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] ?? "");
  text = text.replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, "\n");
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export function convertLongform(markdown) {
  const sourceMeta = readFrontmatter(markdown);
  const article = prepareOfficialArticle(markdown, sourceMeta.attributes);
  const html = markdownToArticleHtml(article.markdown);
  const plain = cleanMarkdown(article.markdown).replaceAll(MANUAL_BREAK, "\n\n").trim();
  const paragraphs = plain ? plain.split(/\n{2,}/).filter(Boolean).length : 0;

  return {
    markdown: article.markdown,
    article: resolveArticleMetadata(markdown, sourceMeta.attributes, article.assets),
    html,
    plain,
    meta: sourceMeta.attributes,
    assets: article.assets,
    stats: {
      chars: Array.from(plain).length,
      weightedLength: weightedLength(plain),
      paragraphs,
      readMinutes: Math.max(1, Math.ceil(plain.length / 700)),
    },
  };
}

export function prepareOfficialArticle(markdown, meta = readFrontmatter(markdown).attributes) {
  let text = prepareArticleMarkdown(markdown);
  const codeBlocks = [];
  const images = [];
  const tables = [];
  const tweetEmbeds = [];
  const imageLabels = new Map();
  const tableLabels = new Map();
  const coverUrl = stringMeta(meta, "cover") || stringMeta(meta, "封面");

  if (coverUrl) {
    images.push(createImageAsset({
      alt: "Cover",
      imageLabels,
      index: 1,
      role: "cover",
      title: "",
      url: coverUrl,
    }));
  }

  text = replaceFencedCodeBlocks(text, ({ code, meta }) => {
    const lang = String(meta ?? "").trim().split(/\s+/)[0] || "";
    const index = codeBlocks.length + 1;
    const safeLabel = makeSafeAssetLabel(
      lang ? `code block ${index} ${lang}` : `code block ${index}`,
      `code-block-${index}`,
    );
    codeBlocks.push({
      code,
      index,
      lang,
      safeLabel,
      suggestedFilename: `${safeLabel}.${codeExtensionForLanguage(lang)}`,
    });
    return `\n[代码块 ${index}${lang ? `: ${lang}` : ""}]\n`;
  });

  text = replaceMarkdownTables(text, ({ headers, rows, alignments, raw }) => {
    const index = tables.length + 1;
    const label = headers.filter(Boolean).slice(0, 2).join(" ") || `table ${index}`;
    const safeLabel = uniqueAssetLabel(makeSafeAssetLabel(label, `table-${index}`), tableLabels);
    tables.push({
      alignments,
      headers,
      index,
      raw,
      rows,
      safeLabel,
      suggestedFilename: `${safeLabel}.csv`,
    });
    return `\n[表格 ${index}: ${placeholderLabel(label, `表格 ${index}`)}]\n`;
  });

  text = replaceMarkdownImages(text, ({ alt, destination, title }) => {
    const altText = alt.trim();
    const titleText = title.trim();
    const url = destination.trim();
    const existingCover = coverUrl && sameImageSource(url, coverUrl) ? images.find((image) => image.role === "cover") : null;
    const index = existingCover?.index || images.length + 1;
    const displayLabel = placeholderLabel(altText || titleText || `图片 ${index}`, `图片 ${index}`);
    if (existingCover) {
      existingCover.alt = altText || existingCover.alt;
      existingCover.title = titleText || existingCover.title;
    } else {
      images.push(createImageAsset({
        alt: altText,
        imageLabels,
        index,
        role: "body",
        title: titleText,
        url,
      }));
    }
    return `\n[图片 ${index}: ${displayLabel}]\n`;
  });

  text = text.replace(/`([^`\n]+)`/g, "$1");
  text = text.replace(/^\s*[-*+]\s+\[(?: |x|X)\]\s+/gm, "- ");
  extractTweetEmbeds(text).forEach((tweet) => {
    tweetEmbeds.push({
      index: tweetEmbeds.length + 1,
      safeLabel: `tweet-${tweetEmbeds.length + 1}`,
      url: tweet.url,
    });
  });
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return {
    markdown: text,
    assets: {
      codeBlocks,
      images,
      tables,
      tweetEmbeds,
    },
  };
}

export function prepareArticleMarkdown(markdown) {
  let text = stripFrontmatter(String(markdown ?? "").replace(/\r\n?/g, "\n").normalize("NFC"));
  const codeBlocks = [];

  text = replaceFencedCodeBlocks(text, ({ raw }) => {
    const index = codeBlocks.push(raw) - 1;
    return `@@ARTICLECODEBLOCK${index}@@`;
  });

  text = text.replace(MANUAL_BREAK_COMMENT, "\n\n");
  text = text.replace(/@@ARTICLECODEBLOCK(\d+)@@/g, (_match, index) => codeBlocks[Number(index)] ?? "");

  return text.trim();
}

export function markdownToArticleHtml(markdown) {
  const html = marked.parse(prepareArticleMarkdown(markdown), {
    async: false,
    breaks: false,
    gfm: true,
  });

  return sanitizeArticleHtml(String(html)).trim();
}

export function convertMarkdown(markdown, userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };
  const maxChars = clampMax(options.maxChars);
  const sourceMeta = readFrontmatter(markdown);
  const cleaned = cleanMarkdown(markdown);
  const sections = cleaned
    .split(new RegExp(`\\n*${escapeRegExp(MANUAL_BREAK)}\\n*`, "g"))
    .map((section) => section.trim())
    .filter(Boolean);

  let total = 1;
  let posts = [];

  for (let pass = 0; pass < 8; pass += 1) {
    const reserve = numberingReserve(options.numbering, total);
    const limit = Math.max(20, maxChars - reserve);
    posts = sections.flatMap((section) => splitToPosts(section, limit));
    if (posts.length === total) break;
    total = posts.length;
  }

  const finalPosts = posts.map((post, index) => addNumbering(post, index, posts.length, options.numbering));
  return {
    cleaned,
    meta: sourceMeta.attributes,
    posts: finalPosts,
    stats: finalPosts.map((post, index) => ({
      index: index + 1,
      length: weightedLength(post),
      valid: parsePost(post, maxChars).valid,
    })),
    maxChars,
  };
}

function stripFrontmatter(text) {
  return readFrontmatter(text).body;
}

function parseFrontmatterAttributes(raw) {
  const attributes = {};
  String(raw ?? "")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const match = /^([\p{L}\p{N}_-]+)\s*[:=]\s*(.*)$/u.exec(trimmed);
      if (!match) return;

      const key = match[1].trim();
      const value = parseFrontmatterValue(match[2].trim());
      if (key) attributes[key] = value;
    });

  return attributes;
}

function resolveArticleMetadata(markdown, meta, assets) {
  const title = stringMeta(meta, "title") || stringMeta(meta, "标题") || firstMarkdownHeading(markdown);
  const titleSource = stringMeta(meta, "title") || stringMeta(meta, "标题") ? "frontmatter" : title ? "heading" : "";
  const coverUrl = stringMeta(meta, "cover") || stringMeta(meta, "封面");
  const coverImage = coverUrl
    ? assets.images.find((image) => sameImageSource(image.url, coverUrl))
    : assets.images.find((image) => image.role === "cover") || assets.images[0];
  const coverSource = coverUrl ? "frontmatter" : coverImage ? "first-image" : "";
  if (coverImage && !coverImage.role) coverImage.role = "cover";
  if (coverImage && coverImage.role === "body" && coverSource === "first-image") coverImage.role = "cover";

  return {
    cover: coverImage
      ? {
          imageIndex: coverImage.index,
          source: coverSource,
          url: coverImage.url,
        }
      : null,
    title,
    titleSource,
  };
}

function createImageAsset({ alt, imageLabels, index, role, title, url }) {
  const fallbackLabel = role === "cover" ? "cover" : imageBaseName(url) || `image ${index}`;
  const safeLabel = uniqueAssetLabel(
    makeSafeAssetLabel(alt || title || fallbackLabel, `image-${index}`),
    imageLabels,
  );

  return {
    alt,
    index,
    role,
    safeLabel,
    sourceKind: sourceKindForImage(url),
    suggestedFilename: `${safeLabel}.${imageExtensionForSource(url)}`,
    title,
    url,
  };
}

function extractTweetEmbeds(markdown) {
  const source = String(markdown ?? "");
  const tweets = [];
  const seen = new Set();
  const pattern = /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,20}\/status(?:es)?\/\d+(?:[/?#][^\s<)\]]*)?/gi;

  for (const match of source.matchAll(pattern)) {
    const url = normalizeTweetUrl(match[0]);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    tweets.push({ url });
  }

  return tweets;
}

function normalizeTweetUrl(url) {
  const value = String(url ?? "").replace(/[.,;:!?]+$/g, "");
  try {
    const parsed = new URL(value);
    const match = /^\/([^/]+)\/status(?:es)?\/(\d+)/i.exec(parsed.pathname);
    if (!match) return "";
    return `https://${parsed.hostname.replace(/^www\./i, "")}/${match[1]}/status/${match[2]}`;
  } catch {
    return "";
  }
}

function sameImageSource(left, right) {
  return String(left ?? "").trim() === String(right ?? "").trim();
}

function firstMarkdownHeading(markdown) {
  const body = stripFrontmatter(String(markdown ?? "").replace(/\r\n?/g, "\n").normalize("NFC"));
  const match = /^#\s+(.+)$/m.exec(body);
  return match ? match[1].replace(/[#*_`[\]()]/g, "").trim() : "";
}

function stringMeta(meta, key) {
  const value = meta?.[key];
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function parseFrontmatterValue(value) {
  const source = String(value ?? "").trim();
  if (!source) return "";

  if (source.startsWith("[") && source.endsWith("]")) {
    return splitFrontmatterList(source.slice(1, -1)).map((item) => stripFrontmatterQuotes(item.trim()));
  }

  if (/^(true|false)$/i.test(source)) return source.toLowerCase() === "true";
  if (/^-?\d+(?:\.\d+)?$/.test(source)) return Number(source);
  return stripFrontmatterQuotes(source);
}

function splitFrontmatterList(value) {
  const items = [];
  let current = "";
  let quote = "";

  for (const char of String(value ?? "")) {
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      items.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) items.push(current);
  return items;
}

function stripFrontmatterQuotes(value) {
  const source = String(value ?? "").trim();
  const opener = source[0];
  if ((opener === "\"" || opener === "'") && source.endsWith(opener)) {
    return source.slice(1, -1);
  }
  return source;
}

function replaceFencedCodeBlocks(text, replacer) {
  const source = String(text ?? "");
  const openingFence = /(^|\n)([ \t]{0,3})(`{3,}|~{3,})([^\n]*)/g;
  let result = "";
  let cursor = 0;
  let blockIndex = 0;
  let match;

  while ((match = openingFence.exec(source))) {
    const lineStart = match.index + match[1].length;
    const openingEnd = openingFence.lastIndex;
    if (source[openingEnd] !== "\n") continue;

    const fence = match[3];
    const marker = fence[0];
    const closeFence = new RegExp(`(^|\\n)[ \\t]{0,3}${escapeRegExp(marker)}{${fence.length},}[ \\t]*(?=\\n|$)`, "g");
    const codeStart = openingEnd + 1;
    closeFence.lastIndex = codeStart;

    const close = closeFence.exec(source);
    if (!close) {
      openingFence.lastIndex = codeStart;
      continue;
    }

    const closeLineStart = close.index + close[1].length;
    const closeLineEnd = closeFence.lastIndex;
    const raw = source.slice(lineStart, closeLineEnd);
    const code = source.slice(codeStart, closeLineStart).replace(/\n$/, "");

    result += source.slice(cursor, lineStart);
    result += replacer({
      code,
      fence,
      index: blockIndex,
      meta: match[4] ?? "",
      raw,
    });

    cursor = closeLineEnd;
    openingFence.lastIndex = closeLineEnd;
    blockIndex += 1;
  }

  return result + source.slice(cursor);
}

function replaceMarkdownTables(text, replacer) {
  const lines = String(text ?? "").split("\n");
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const headers = parseMarkdownTableRow(lines[index]);
    const separator = parseMarkdownTableSeparator(lines[index + 1]);
    if (!headers || !separator || headers.length !== separator.length) {
      output.push(lines[index]);
      continue;
    }

    const rows = [];
    const raw = [lines[index], lines[index + 1]];
    let cursor = index + 2;

    while (cursor < lines.length) {
      const row = parseMarkdownTableRow(lines[cursor]);
      if (!row || row.length === 0) break;
      rows.push(padTableRow(row, headers.length));
      raw.push(lines[cursor]);
      cursor += 1;
    }

    output.push(
      replacer({
        alignments: separator,
        headers: padTableRow(headers, separator.length),
        raw: raw.join("\n"),
        rows,
      }),
    );
    index = cursor - 1;
  }

  return output.join("\n");
}

function parseMarkdownTableRow(line) {
  const source = String(line ?? "").trim();
  if (!source || !source.includes("|")) return null;
  let value = source;
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  const cells = splitMarkdownTableCells(value).map((cell) => unescapeMarkdown(cell.trim()));
  return cells.some(Boolean) ? cells : null;
}

function parseMarkdownTableSeparator(line) {
  const cells = parseMarkdownTableRow(line);
  if (!cells) return null;
  const alignments = [];
  for (const cell of cells) {
    const value = cell.trim();
    if (!/^:?-{3,}:?$/.test(value)) return null;
    if (value.startsWith(":") && value.endsWith(":")) {
      alignments.push("center");
    } else if (value.endsWith(":")) {
      alignments.push("right");
    } else {
      alignments.push("left");
    }
  }
  return alignments;
}

function splitMarkdownTableCells(value) {
  const cells = [];
  let current = "";
  let escaped = false;

  for (const char of String(value ?? "")) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (char === "|") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
}

function padTableRow(row, length) {
  const cells = row.slice(0, length);
  while (cells.length < length) cells.push("");
  return cells;
}

function replaceMarkdownImages(text, replacer) {
  return replaceMarkdownResource(text, {
    image: true,
    replacer,
  });
}

function replaceMarkdownLinks(text, replacer) {
  return replaceMarkdownResource(text, {
    image: false,
    replacer,
  });
}

function replaceMarkdownResource(text, { image, replacer }) {
  const source = String(text ?? "");
  let result = "";
  let cursor = 0;
  let resourceIndex = 0;

  for (let position = 0; position < source.length; position += 1) {
    const resourceStart = position;
    const bracketStart = image ? position + 1 : position;

    if (image) {
      if (source[position] !== "!" || source[position + 1] !== "[") continue;
    } else if (source[position] !== "[" || source[position - 1] === "!") {
      continue;
    }

    const bracketEnd = findClosingBracket(source, bracketStart);
    if (bracketEnd === -1) continue;

    const parenStart = bracketEnd + 1;
    if (source[parenStart] !== "(") {
      position = bracketEnd;
      continue;
    }

    const target = parseMarkdownResourceTarget(source, parenStart);
    if (!target) {
      position = bracketEnd;
      continue;
    }

    const details = parseMarkdownDestinationAndTitle(target.raw);
    if (!details.destination) {
      position = target.end;
      continue;
    }

    const label = source.slice(bracketStart + 1, bracketEnd);
    result += source.slice(cursor, resourceStart);
    result += replacer({
      alt: image ? unescapeMarkdown(label) : "",
      destination: details.destination,
      index: resourceIndex,
      label: image ? "" : unescapeMarkdown(label),
      raw: source.slice(resourceStart, target.end + 1),
      title: details.title,
    });

    cursor = target.end + 1;
    position = target.end;
    resourceIndex += 1;
  }

  return result + source.slice(cursor);
}

function findClosingBracket(text, bracketStart) {
  let depth = 1;

  for (let index = bracketStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "[") {
      depth += 1;
      continue;
    }
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function parseMarkdownResourceTarget(text, parenStart) {
  let depth = 0;
  let angle = false;
  let quote = "";

  for (let index = parenStart + 1; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (angle) {
      if (char === ">") angle = false;
      continue;
    }
    if (char === "<") {
      angle = true;
      continue;
    }
    if ((char === "\"" || char === "'") && /\s/.test(text[index - 1] ?? "")) {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      if (depth > 0) {
        depth -= 1;
        continue;
      }
      return {
        end: index,
        raw: text.slice(parenStart + 1, index),
      };
    }
  }

  return null;
}

function parseMarkdownDestinationAndTitle(raw) {
  const text = String(raw ?? "").trim();
  if (!text) {
    return {
      destination: "",
      title: "",
    };
  }

  let destination = "";
  let rest = "";

  if (text[0] === "<") {
    const end = findUnescaped(text, ">", 1);
    if (end === -1) {
      destination = text;
    } else {
      destination = text.slice(1, end);
      rest = text.slice(end + 1).trim();
    }
  } else {
    let depth = 0;
    let end = text.length;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === "(") {
        depth += 1;
        continue;
      }
      if (char === ")" && depth > 0) {
        depth -= 1;
        continue;
      }
      if (/\s/.test(char) && depth === 0) {
        end = index;
        break;
      }
    }

    destination = text.slice(0, end);
    rest = text.slice(end).trim();
  }

  return {
    destination: unescapeMarkdown(destination.trim()),
    title: readMarkdownTitle(rest),
  };
}

function readMarkdownTitle(text) {
  const value = String(text ?? "").trim();
  if (!value) return "";

  const opener = value[0];
  if (opener === "\"" || opener === "'") {
    const end = findUnescaped(value, opener, 1);
    return unescapeMarkdown((end === -1 ? value.slice(1) : value.slice(1, end)).trim());
  }

  if (opener === "(" && value.endsWith(")")) {
    return unescapeMarkdown(value.slice(1, -1).trim());
  }

  return unescapeMarkdown(value);
}

function findUnescaped(text, target, start = 0) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] === target) return index;
  }
  return -1;
}

function unescapeMarkdown(value) {
  return String(value ?? "").replace(/\\([\\`*{}\[\]()#+\-.!_>~|"' ])/g, "$1");
}

function sourceKindForImage(source) {
  const value = String(source ?? "").trim();
  if (/^data:/i.test(value)) return "data";
  if (/^(https?:)?\/\//i.test(value)) return "remote";
  if (/^file:/i.test(value) || value.startsWith("/") || value.startsWith("~/") || /^[A-Za-z]:[\\/]/.test(value)) {
    return "local";
  }
  return "relative";
}

function imageExtensionForSource(source) {
  const dataExtension = dataImageExtension(source);
  if (dataExtension) return dataExtension;

  const extension = extensionFromFilename(fileNameFromSource(source));
  return IMAGE_EXTENSIONS.has(extension) ? extension : "png";
}

function dataImageExtension(source) {
  const match = /^data:([^;,]+)/i.exec(String(source ?? "").trim());
  if (!match) return "";
  return IMAGE_EXTENSION_BY_MIME.get(match[1].toLowerCase()) ?? "";
}

function imageBaseName(source) {
  const filename = fileNameFromSource(source);
  return filename.replace(/\.[^.]+$/, "").trim();
}

function fileNameFromSource(source) {
  const path = pathFromSource(source);
  const filename = path.replace(/[\\/]+$/, "").split(/[\\/]/).filter(Boolean).pop() ?? "";
  return decodeUriComponentSafe(filename).trim();
}

function pathFromSource(source) {
  const value = String(source ?? "").trim();
  if (!value || /^data:/i.test(value)) return "";

  if (/^(https?:)?\/\//i.test(value) || /^file:/i.test(value)) {
    try {
      const parsed = new URL(value.startsWith("//") ? `https:${value}` : value);
      return parsed.pathname;
    } catch {
      return value.replace(/[?#][\s\S]*$/, "");
    }
  }

  return value.replace(/[?#][\s\S]*$/, "");
}

function extensionFromFilename(filename) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(filename ?? "").trim());
  return match ? match[1].toLowerCase() : "";
}

function codeExtensionForLanguage(lang) {
  const key = String(lang ?? "").trim().toLowerCase().replace(/^language-/, "");
  return CODE_EXTENSION_BY_LANG.get(key) ?? "txt";
}

function makeSafeAssetLabel(value, fallback) {
  const slug = String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();

  return slug || fallback;
}

function uniqueAssetLabel(label, usedLabels) {
  const base = label || "asset";
  let candidate = base;
  let suffix = 2;

  while (usedLabels.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedLabels.set(candidate, true);
  return candidate;
}

function placeholderLabel(value, fallback) {
  const text = String(value ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/[\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return fallback;
  return text.length > 80 ? `${text.slice(0, 77).trim()}...` : text;
}

function decodeUriComponentSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sanitizeArticleHtml(html) {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, "")
    .replace(/\s(href|src)\s*=\s*javascript:[^\s>]+/gi, "")
    .replace(/<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_match, code) => {
      const text = String(code ?? "").trim();
      return text ? `<p>${text}</p>` : "";
    })
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_match, content) => {
      const text = String(content ?? "").trim();
      return text ? `<p>${text}</p>` : "";
    })
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, "$1")
    .replace(/<img\b[^>]*\/?>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "");
}

function clampMax(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 280;
  return Math.min(Math.max(parsed, 80), 25000);
}

function splitToPosts(text, limit) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const posts = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = joinBlock(current, paragraph);
    if (fits(candidate, limit)) {
      current = candidate;
      continue;
    }

    if (current) {
      posts.push(current);
      current = "";
    }

    if (fits(paragraph, limit)) {
      current = paragraph;
      continue;
    }

    const pieces = splitLongParagraph(paragraph, limit);
    posts.push(...pieces.slice(0, -1));
    current = pieces.at(-1) ?? "";
  }

  if (current) posts.push(current);
  return posts;
}

function splitLongParagraph(paragraph, limit) {
  const lineMode = paragraph.includes("\n");
  const units = (lineMode ? paragraph.split(/\n+/) : paragraph.split(/(?<=[。！？!?])\s*|(?<=[.!?])\s+/u))
    .map((unit) => unit.trim())
    .filter(Boolean);
  const posts = [];
  let current = "";

  for (const unit of units.length ? units : [paragraph]) {
    const candidate = lineMode ? joinLine(current, unit) : joinInline(current, unit);
    if (fits(candidate, limit)) {
      current = candidate;
      continue;
    }

    if (current) {
      posts.push(current);
      current = "";
    }

    if (fits(unit, limit)) {
      current = unit;
      continue;
    }

    const pieces = splitLongUnit(unit, limit);
    posts.push(...pieces.slice(0, -1));
    current = pieces.at(-1) ?? "";
  }

  if (current) posts.push(current);
  return posts;
}

function splitLongUnit(unit, limit) {
  const tokens = /\s/.test(unit) ? unit.split(/(\s+)/).filter(Boolean) : Array.from(unit);
  const posts = [];
  let current = "";

  for (const token of tokens) {
    const candidate = current ? `${current}${token}` : token.trimStart();
    if (fits(candidate, limit)) {
      current = candidate;
      continue;
    }

    if (current) {
      posts.push(current.trim());
      current = "";
    }

    if (fits(token, limit)) {
      current = token.trimStart();
      continue;
    }

    const chars = Array.from(token);
    for (const char of chars) {
      const charCandidate = `${current}${char}`;
      if (fits(charCandidate, limit)) {
        current = charCandidate;
      } else {
        if (current) posts.push(current.trim());
        current = char;
      }
    }
  }

  if (current.trim()) posts.push(current.trim());
  return posts;
}

function addNumbering(post, index, total, style) {
  if (style === "prefix") return `${index + 1}/${total} ${post}`;
  if (style === "none") return post;
  return `${post} (${index + 1}/${total})`;
}

function numberingReserve(style, total) {
  if (style === "none") return 0;
  if (style === "prefix") return weightedLength(`${total}/${total} `);
  return weightedLength(` (${total}/${total})`);
}

function fits(text, limit) {
  return weightedLength(text) <= limit;
}

function fallbackTextLength(text) {
  return Array.from(text).reduce((total, char) => total + (char.codePointAt(0) > 0x1100 ? 2 : 1), 0);
}

function joinBlock(left, right) {
  return left ? `${left}\n\n${right}` : right;
}

function joinInline(left, right) {
  return left ? `${left} ${right}` : right;
}

function joinLine(left, right) {
  return left ? `${left}\n${right}` : right;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
