#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { convertLongform, convertMarkdown } from "../src/converter.js";

const ARTICLE_FORMATS = new Set(["plain", "html", "manifest"]);
const THREAD_FORMATS = new Set(["text", "manifest"]);
const MODES = new Set(["article", "thread"]);
const NUMBERING_STYLES = new Set(["suffix", "prefix", "none"]);
const VALUE_OPTIONS = new Set(["--mode", "--max", "--numbering", "--out", "--format"]);

const args = process.argv.slice(2);

try {
  await main();
} catch (error) {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
}

async function main() {
  if (!args.length || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(args.length ? 0 : 1);
  }

  const parsed = parseArgs(args);
  if (parsed.errors.length) fail(parsed.errors.join("\n"));

  const inputPath = parsed.positionals[0];
  if (!inputPath) fail("Missing input Markdown file.");
  if (parsed.positionals.length > 1) fail(`Unexpected positional argument: ${parsed.positionals[1]}`);

  const mode = parsed.options.mode ?? "article";
  if (!MODES.has(mode)) fail(`Invalid --mode "${mode}". Use article or thread.`);

  const format = parsed.options.format ?? (mode === "thread" ? "text" : "plain");
  const validFormats = mode === "thread" ? THREAD_FORMATS : ARTICLE_FORMATS;
  if (!validFormats.has(format)) fail(`Invalid --format "${format}" for ${mode} mode.`);

  const maxChars = mode === "thread" ? readMax(parsed.options.max ?? "280") : 280;
  const numbering = parsed.flags.has("no-numbering") ? "none" : (parsed.options.numbering ?? "suffix");
  if (!NUMBERING_STYLES.has(numbering)) fail(`Invalid --numbering "${numbering}". Use suffix, prefix, or none.`);

  const outputPath = parsed.options.out ?? "";
  const markdown = await readFile(inputPath, "utf8");
  const result =
    mode === "thread"
      ? convertMarkdown(markdown, {
          maxChars,
          numbering,
        })
      : convertLongform(markdown);
  const rendered = mode === "thread" ? renderThread(result, format) : renderArticle(result, format);

  if (outputPath) {
    await writeFile(outputPath, `${rendered}\n`, "utf8");
  } else {
    process.stdout.write(`${rendered}\n`);
  }

  if (parsed.flags.has("stats")) {
    process.stderr.write(`${renderStats(mode, result)}\n`);
  }
}

function parseArgs(rawArgs) {
  const options = {};
  const flags = new Set();
  const positionals = [];
  const errors = [];

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--") continue;
    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }

    if (arg === "--no-numbering") {
      flags.add("no-numbering");
      continue;
    }
    if (arg === "--stats") {
      flags.add("stats");
      continue;
    }

    const equalIndex = arg.indexOf("=");
    const name = equalIndex >= 0 ? arg.slice(0, equalIndex) : arg;

    if (!VALUE_OPTIONS.has(name)) {
      errors.push(`Unknown option: ${arg}`);
      continue;
    }

    let value = "";
    if (equalIndex >= 0) {
      value = arg.slice(equalIndex + 1);
    } else {
      value = rawArgs[index + 1];
      if (!value || value.startsWith("-")) {
        errors.push(`Missing value for ${name}`);
        continue;
      }
      index += 1;
    }

    options[name.slice(2)] = value;
  }

  return { errors, flags, options, positionals };
}

function readMax(value) {
  if (!/^\d+$/.test(String(value))) fail(`Invalid --max "${value}". Use a number from 80 to 25000.`);

  const parsed = Number.parseInt(value, 10);
  if (parsed < 80 || parsed > 25000) fail(`Invalid --max "${value}". Use a number from 80 to 25000.`);
  return parsed;
}

function renderArticle(result, format) {
  if (format === "html") return renderArticleHtml(result);
  if (format === "manifest") return buildArticleManifest(result);
  return result.plain;
}

function renderArticleHtml(result) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>X Article</title>
</head>
<body>
${result.html}
</body>
</html>`;
}

function renderThread(result, format) {
  if (format === "manifest") return buildThreadManifest(result);

  return result.posts
    .map((post, index) => {
      const stat = result.stats[index];
      return `Tweet ${index + 1}/${result.posts.length} (${stat.length}/${result.maxChars})\n${post}`;
    })
    .join("\n\n---\n\n");
}

function buildArticleManifest(result) {
  const lines = [
    "# X Article Publish Pack",
    "",
    "## Stats",
    "",
    `- Characters: ${result.stats.chars}`,
    `- Weighted length: ${result.stats.weightedLength}`,
    `- Paragraphs: ${result.stats.paragraphs}`,
    `- Estimated read time: ${result.stats.readMinutes} min`,
    `- Images: ${result.assets.images.length}`,
    `- Code blocks: ${result.assets.codeBlocks.length}`,
    "",
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
    "## Files",
    "",
    "- `article.txt`: paste-friendly plain text body.",
    "- `article.html`: rich text backup for editors that accept HTML clipboard content.",
    "- `manifest.md`: this checklist.",
    "- `assets/code/*.txt`: original fenced code block text.",
    "- `assets/code/*.png`: code screenshots generated by the browser app.",
    "- `assets/images/*.png`: fetched image copies when the remote site allows browser fetch.",
    "- `assets/images/*.url.txt`: image URLs when a remote site blocks browser fetch.",
    "",
    "## Images",
    "",
  ];

  if (result.assets.images.length) {
    result.assets.images.forEach((image) => {
      lines.push(`${image.index}. ${image.alt || image.title || "Image"} - ${image.url}`);
    });
  } else {
    lines.push("No images.");
  }

  lines.push("", "## Code Blocks", "");
  if (result.assets.codeBlocks.length) {
    result.assets.codeBlocks.forEach((block) => {
      const base = String(block.suggestedFilename || `code-block-${block.index}.txt`).replace(/\.[^.]+$/, "");
      lines.push(`${block.index}. ${block.lang || "code"} - assets/code/${base}.png`);
    });
  } else {
    lines.push("No code blocks.");
  }

  return lines.join("\n");
}

function buildThreadManifest(result) {
  const invalidCount = result.stats.filter((item) => !item.valid).length;
  const longest = result.stats.reduce((max, item) => Math.max(max, item.length), 0);

  return `# X Thread Publish Pack

## Stats

- Posts: ${result.posts.length}
- Max chars: ${result.maxChars}
- Longest post: ${longest}/${result.maxChars}
- Invalid posts: ${invalidCount}

## Files

- \`thread.txt\`: numbered post text separated by dividers.
- \`manifest.md\`: this checklist.

Use \`thread.txt\` to copy each post into X in order.`;
}

function renderStats(mode, result) {
  if (mode === "article") {
    return [
      `Article: ${result.stats.chars} chars`,
      `${result.stats.paragraphs} paragraphs`,
      `${result.assets.images.length} images`,
      `${result.assets.codeBlocks.length} code blocks`,
      `~${result.stats.readMinutes} min`,
    ].join(", ");
  }

  const invalidCount = result.stats.filter((item) => !item.valid).length;
  const longest = result.stats.reduce((max, item) => Math.max(max, item.length), 0);
  return `Thread: ${result.posts.length} posts, longest ${longest}/${result.maxChars}, invalid ${invalidCount}`;
}

function fail(message) {
  process.stderr.write(`Error: ${message}\n\n`);
  printHelp(process.stderr);
  process.exit(1);
}

function printHelp(stream = process.stdout) {
  stream.write(`Usage:
  npm run convert -- path/to/post.md
  npm run convert -- path/to/post.md --mode=article --format=html --out=x-article.html
  npm run convert -- path/to/post.md --mode=article --format=manifest --out=manifest.md
  npm run convert -- path/to/post.md --mode=thread --max=280 --numbering=suffix --stats --out=x-thread.txt

Options:
  --mode=article           Output mode: article or thread
  --format=plain           Article: plain, html, manifest. Thread: text, manifest
  --max=280                Thread weighted character limit per post, 80-25000
  --numbering=suffix       Thread numbering: suffix, prefix, or none
  --no-numbering           Shortcut for --numbering=none
  --stats                  Print conversion stats to stderr
  --out=FILE               Write converted output to a file

Notes:
  The CLI does not use browser APIs, X API tokens, clipboard APIs, fetch, canvas, or ZIP generation.
  Use the web app when you need the browser-generated publish pack with image/code PNG assets.
`);
}
