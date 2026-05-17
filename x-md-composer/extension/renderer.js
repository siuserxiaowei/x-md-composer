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
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
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
    const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
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
