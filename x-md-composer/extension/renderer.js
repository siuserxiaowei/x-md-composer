(function attachRenderer(globalScope) {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function decodeUrlEntities(value) {
    return String(value ?? "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  function isSafeHttpUrl(value) {
    const raw = decodeUrlEntities(value).trim();
    if (!/^https?:\/\//i.test(raw)) return false;

    try {
      const url = new URL(raw);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function cleanLinkDestination(value) {
    return String(value ?? "").trim().replace(/^<|>$/g, "");
  }

  function renderInline(value) {
    let html = escapeHtml(value);

    html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;|\s+&#39;[^&]*&#39;)?\)/g, (_match, alt) => {
      const label = String(alt || "image").trim() || "image";
      return `[Image: ${label}]`;
    });

    html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    html = html.replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;|\s+&#39;[^&]*&#39;)?\)/g, (_match, label, destination) => {
      const url = cleanLinkDestination(destination);
      if (!isSafeHttpUrl(url)) return label;
      return `<a href="${escapeAttribute(decodeUrlEntities(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });

    return html;
  }

  function codePlaceholder(meta) {
    const lang = String(meta ?? "").trim().split(/\s+/)[0];
    return lang ? `[Code block: ${escapeHtml(lang)}]` : "[Code block]";
  }

  function isFenceStart(line) {
    const match = /^ {0,3}(```|~~~)\s*([^\n]*)$/.exec(line);
    if (!match) return null;
    return {
      marker: match[1],
      meta: match[2] || "",
    };
  }

  function isFenceEnd(line, marker) {
    const fence = marker === "```" ? "```" : "~~~";
    return new RegExp(`^ {0,3}${fence}\\s*$`).test(line);
  }

  let inlineProtectionId = 0;

  function formatSmartMarkdown(markdown, options = {}) {
    const settings = {
      linkifyBareDomains: true,
      ...options,
    };
    let text = String(markdown ?? "").replace(/\r\n?/g, "\n");

    text = promoteSmartNumberedSections(text);
    text = quoteSmartInsightLines(text);
    text = emphasizeSmartLeadLines(text);
    text = emphasizeSmartFieldLabels(text);
    text = emphasizeSmartInlineHighlights(text);
    if (settings.linkifyBareDomains) {
      text = linkifySmartBareDomains(text);
    }

    return text;
  }

  function mapLinesOutsideFences(text, transform) {
    const lines = String(text ?? "").split("\n");
    const output = [];
    let activeFence = null;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      if (activeFence) {
        output.push(line);
        if (isFenceEnd(line, activeFence.marker)) activeFence = null;
        continue;
      }

      const fence = isFenceStart(line);
      if (fence) {
        activeFence = fence;
        output.push(line);
        continue;
      }

      output.push(transform(line, index, lines));
    }

    return output.join("\n");
  }

  function promoteSmartNumberedSections(text) {
    return mapLinesOutsideFences(text, (line, index, lines) => {
      const trimmed = line.trim();
      const match = /^(\d{1,2}[.、]\s+)(.{2,80})$/.exec(trimmed);
      if (!match) return line;

      const previousIsBoundary = index === 0 || lines[index - 1].trim() === "";
      const nextContent = lines[index + 1]?.trim() ?? "";
      const nextIsSibling = /^\d{1,2}[.、]\s+/.test(nextContent);
      const nextIsListItem = /^[-*+]\s+/.test(nextContent);
      const titleLooksLikeSentence = /[。！？!?]$/.test(match[2].trim());

      if (!previousIsBoundary || !nextContent || nextIsSibling || nextIsListItem || titleLooksLikeSentence) {
        return line;
      }

      const indent = line.match(/^\s*/)?.[0] ?? "";
      return `${indent}## ${trimmed}`;
    });
  }

  function quoteSmartInsightLines(text) {
    const insightPattern = /^(我的结论|我的判断|核心观点|核心判断|核心结论|重点结论|最终判断|一句话|一句话总结|总结|判断|结论)([：:])\s*(.+)$/u;
    const explicitQuotePattern = /^(引用|摘录|原文|Quote)([：:])\s*(.+)$/iu;
    const quotedSentencePattern = /^[“「『].+[”」』]$/u;

    return mapLinesOutsideFences(text, (line) => {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const body = line.slice(indent.length).trim();
      if (!body || body.startsWith(">")) return line;

      const insight = insightPattern.exec(body);
      if (insight) {
        return `${indent}> **${insight[1]}${insight[2]}** ${insight[3]}`;
      }

      const quote = explicitQuotePattern.exec(body);
      if (quote) {
        return `${indent}> ${quote[3]}`;
      }

      if (quotedSentencePattern.test(body)) {
        return `${indent}> ${body}`;
      }

      return line;
    });
  }

  function emphasizeSmartLeadLines(text) {
    return mapLinesOutsideFences(text, (line) => {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const body = line.slice(indent.length).trim();
      if (!body || body.startsWith(">") || body.startsWith("#") || body.startsWith("**")) return line;
      if (hasProtectedInlineMarkdown(body)) return line;
      if (/^([-*+]|\d{1,2}[.、])\s+/.test(body)) return line;
      if (!/[：:]$/.test(body) || Array.from(body).length > 38) return line;

      return `${indent}**${body}**`;
    });
  }

  function emphasizeSmartFieldLabels(text) {
    const labelPattern = /^(网址|链接|官网|作者|来源|推荐理由|理由|推荐|亮点|优点|缺点|适合|场景|用法|功能|特点|备注|价格|名称|平台|关键词|标签|总结|结论|一句话)([：:])\s+(.+)$/u;

    return mapLinesOutsideFences(text, (line) => {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const body = line.slice(indent.length);
      if (/^\*\*[^*\n]+[：:]\*\*/u.test(body)) return line;

      const match = labelPattern.exec(body);
      if (!match) return line;

      return `${indent}**${match[1]}${match[2]}** ${match[3]}`;
    });
  }

  function emphasizeSmartInlineHighlights(text) {
    return mapLinesOutsideFences(text, (line) => {
      const trimmed = line.trim();
      if (!trimmed || /^#{1,6}\s/.test(trimmed)) return line;

      return withProtectedInlineMarkdown(line, (source) => {
        let output = source;
        const phrases = [
          "高质量信息源",
          "全网热点",
          "产品和工具",
          "自动整理",
          "筛选和整理",
          "实时更新",
          "AI 日报",
          "新模型",
          "新工具",
          "新玩法",
        ];

        for (const phrase of phrases) {
          output = output.replace(new RegExp(escapeRegExp(phrase), "g"), `**${phrase}**`);
        }

        output = withProtectedInlineMarkdown(output, (source) => {
          let highlighted = source;
          for (const term of ["AI", "Agent", "ChatGPT", "Claude", "Gemini", "Cursor", "DeepSeek", "OpenAI"]) {
            highlighted = emphasizeAsciiTerm(highlighted, term);
          }

          highlighted = highlighted.replace(/(关键|重点|核心|问题|结论)(?=[是：:在])/gu, "**$1**");
          return highlighted;
        });
        return output;
      });
    });
  }

  function linkifySmartBareDomains(text) {
    const bareLinkPattern = /(^|[\s([（【「『])((?:https?:\/\/|www\.)?[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?:\:\d+)?(?:\/[^\s<>()\[\]{}"'，。！？；、]*)?)/gi;

    return mapLinesOutsideFences(text, (line) => {
      return withProtectedInlineMarkdown(line, (source) => {
        return source.replace(bareLinkPattern, (match, prefix, rawLink) => {
          const normalized = normalizeSmartBareLink(rawLink);
          if (!normalized) return match;
          return `${prefix}[${normalized.label}](${normalized.href})${normalized.trailing}`;
        });
      });
    });
  }

  function normalizeSmartBareLink(rawLink) {
    const source = String(rawLink ?? "");
    const trailing = /[.,!?;:，。！？；：、]+$/u.exec(source)?.[0] ?? "";
    const label = trailing ? source.slice(0, -trailing.length) : source;
    const href = /^https?:\/\//i.test(label) ? label : `https://${label}`;

    try {
      const parsed = new URL(href);
      if (!/\.[A-Za-z]{2,}$/i.test(parsed.hostname)) return null;
    } catch (_error) {
      return null;
    }

    return {
      href,
      label,
      trailing,
    };
  }

  function withProtectedInlineMarkdown(line, transform) {
    const protectedSegments = [];
    const tokenPrefix = `@@XMDINLINE${inlineProtectionId++}_`;
    const tokenPattern = /`[^`\n]+`|!\[[^\]\n]*\]\([^)]+\)|\[[^\]\n]+\]\([^)]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__/g;
    const source = String(line ?? "").replace(tokenPattern, (segment) => {
      const index = protectedSegments.push(segment) - 1;
      return `${tokenPrefix}${index}@@`;
    });

    const restorePattern = new RegExp(`${escapeRegExp(tokenPrefix)}(\\d+)@@`, "g");
    return transform(source).replace(restorePattern, (_match, index) => protectedSegments[Number(index)] ?? "");
  }

  function hasProtectedInlineMarkdown(line) {
    return /`[^`\n]+`|!\[[^\]\n]*\]\([^)]+\)|\[[^\]\n]+\]\([^)]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__/.test(line);
  }

  function emphasizeAsciiTerm(text, term) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(term)})(?=$|[^A-Za-z0-9])`, "g");
    return String(text ?? "").replace(pattern, (_match, prefix, value) => `${prefix}**${value}**`);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderParagraph(lines) {
    const text = lines.join(" ").replace(/\s+/g, " ").trim();
    return text ? `<p>${renderInline(text)}</p>` : "";
  }

  function renderList(lines, ordered) {
    const tag = ordered ? "ol" : "ul";
    const items = lines.map((line) => {
      const pattern = ordered ? /^ {0,3}\d+[.)]\s+(.+)$/ : /^ {0,3}[-*+]\s+(.+)$/;
      const content = pattern.exec(line)?.[1] || "";
      return `<li>${renderInline(content.trim())}</li>`;
    });
    return `<${tag}>${items.join("")}</${tag}>`;
  }

  function renderBlockquote(lines) {
    const content = lines
      .map((line) => line.replace(/^ {0,3}>\s?/, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    return content ? `<blockquote><p>${renderInline(content)}</p></blockquote>` : "";
  }

  function renderMarkdown(markdown) {
    const lines = formatSmartMarkdown(markdown).split("\n");
    const output = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      const fence = isFenceStart(line);
      if (fence) {
        index += 1;
        while (index < lines.length && !isFenceEnd(lines[index], fence.marker)) {
          index += 1;
        }
        if (index < lines.length) index += 1;
        output.push(`<p>${codePlaceholder(fence.meta)}</p>`);
        continue;
      }

      const heading = /^ {0,3}(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        output.push(`<h${heading[1].length}>${renderInline(heading[2].trim())}</h${heading[1].length}>`);
        index += 1;
        continue;
      }

      if (/^ {0,3}>\s?/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^ {0,3}>\s?/.test(lines[index])) {
          quoteLines.push(lines[index]);
          index += 1;
        }
        output.push(renderBlockquote(quoteLines));
        continue;
      }

      if (/^ {0,3}[-*+]\s+/.test(line)) {
        const listLines = [];
        while (index < lines.length && /^ {0,3}[-*+]\s+/.test(lines[index])) {
          listLines.push(lines[index]);
          index += 1;
        }
        output.push(renderList(listLines, false));
        continue;
      }

      if (/^ {0,3}\d+[.)]\s+/.test(line)) {
        const listLines = [];
        while (index < lines.length && /^ {0,3}\d+[.)]\s+/.test(lines[index])) {
          listLines.push(lines[index]);
          index += 1;
        }
        output.push(renderList(listLines, true));
        continue;
      }

      const paragraphLines = [];
      while (index < lines.length) {
        const current = lines[index];
        if (!current.trim()) break;
        if (
          isFenceStart(current) ||
          /^ {0,3}(#{1,3})\s+/.test(current) ||
          /^ {0,3}>\s?/.test(current) ||
          /^ {0,3}[-*+]\s+/.test(current) ||
          /^ {0,3}\d+[.)]\s+/.test(current)
        ) {
          break;
        }
        paragraphLines.push(current);
        index += 1;
      }
      output.push(renderParagraph(paragraphLines));
    }

    return output.filter(Boolean).join("\n");
  }

  function renderPlainInline(value) {
    return String(value ?? "")
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (_match, alt) => {
        const label = String(alt || "image").trim() || "image";
        return `[Image: ${label}]`;
      })
      .replace(/\[([^\]\n]+)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (_match, label, destination) => {
        const url = cleanLinkDestination(destination);
        if (!isSafeHttpUrl(url)) return label;
        return `${label} (${decodeUrlEntities(url)})`;
      })
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/\*([^*\n]+)\*/g, "$1");
  }

  function renderPlainText(markdown) {
    const lines = formatSmartMarkdown(markdown, { linkifyBareDomains: false }).split("\n");
    const output = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      const fence = isFenceStart(line);
      if (fence) {
        index += 1;
        while (index < lines.length && !isFenceEnd(lines[index], fence.marker)) {
          index += 1;
        }
        if (index < lines.length) index += 1;
        output.push(codePlaceholder(fence.meta).replace(/&quot;/g, '"'));
        continue;
      }

      output.push(
        renderPlainInline(line)
          .replace(/^ {0,3}#{1,3}\s+/, "")
          .replace(/^ {0,3}>\s?/, "")
          .replace(/^ {0,3}[-*+]\s+/, "- ")
          .replace(/^ {0,3}\d+[.)]\s+/, ""),
      );
      index += 1;
    }

    return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  const api = {
    escapeHtml,
    renderMarkdown,
    renderPlainText,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.XmdHelperRenderer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
