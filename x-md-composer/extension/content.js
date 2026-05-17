(function bootXmdHelper() {
  "use strict";

  if (globalThis.XmdHelperLoaded) return;
  globalThis.XmdHelperLoaded = true;

  const renderer = globalThis.XmdHelperRenderer;
  if (!renderer) return;

  const state = {
    html: "",
    plain: "",
  };

  const button = document.createElement("button");
  button.type = "button";
  button.className = "xmd-helper-button";
  button.textContent = "XMD";
  button.setAttribute("aria-label", "Open X Markdown Composer Helper");

  const modal = document.createElement("section");
  modal.className = "xmd-helper-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "xmd-helper-title");
  modal.hidden = true;

  const header = document.createElement("div");
  header.className = "xmd-helper-header";

  const title = document.createElement("h2");
  title.id = "xmd-helper-title";
  title.className = "xmd-helper-title";
  title.textContent = "X Markdown Import";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "xmd-helper-close";
  closeButton.textContent = "Close";

  header.append(title, closeButton);

  const notice = document.createElement("p");
  notice.className = "xmd-helper-notice";
  notice.textContent = "No X API token is used. This helper only formats text in your browser and uses the page editor or clipboard.";

  const textarea = document.createElement("textarea");
  textarea.className = "xmd-helper-textarea";
  textarea.placeholder = "Paste Markdown for your X Article...";
  textarea.rows = 12;

  const actions = document.createElement("div");
  actions.className = "xmd-helper-actions";

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.className = "xmd-helper-primary";
  importButton.textContent = "Import";

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "xmd-helper-secondary";
  copyButton.textContent = "Copy HTML fallback";

  actions.append(importButton, copyButton);

  const message = document.createElement("p");
  message.className = "xmd-helper-message";
  message.setAttribute("role", "status");

  modal.append(header, notice, textarea, actions, message);
  document.documentElement.append(button, modal);

  button.addEventListener("click", () => {
    modal.hidden = !modal.hidden;
    if (!modal.hidden) textarea.focus();
  });

  closeButton.addEventListener("click", () => {
    modal.hidden = true;
    button.focus();
  });

  importButton.addEventListener("click", async () => {
    const markdown = textarea.value.trim();
    if (!markdown) {
      setMessage("Paste Markdown first.");
      return;
    }

    renderCurrent(markdown);
    const inserted = insertIntoEditor(state.html, state.plain);
    if (inserted) {
      setMessage("Imported into the focused X editor.");
      return;
    }

    const copied = await writeClipboard(state.html, state.plain);
    if (copied === "rich") {
      setMessage("Could not insert directly. Rich HTML is copied; paste it into the X editor.");
    } else if (copied === "plain") {
      setMessage("Could not insert directly. Plain text is copied; paste it into the X editor.");
    } else {
      setMessage("Could not insert or copy. Use the browser clipboard permission and try again.");
    }
  });

  copyButton.addEventListener("click", async () => {
    const markdown = textarea.value.trim();
    if (!markdown && !state.html) {
      setMessage("Paste Markdown first.");
      return;
    }

    if (markdown) renderCurrent(markdown);
    const copied = await writeClipboard(state.html, state.plain);
    if (copied === "rich") {
      setMessage("Rich HTML copied. Paste it into the X editor.");
    } else if (copied === "plain") {
      setMessage("Plain text copied because rich clipboard HTML was unavailable.");
    } else {
      setMessage("Clipboard copy failed. Check site permission and try again.");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      modal.hidden = true;
      button.focus();
    }
  });

  function renderCurrent(markdown) {
    state.html = renderer.renderMarkdown(markdown);
    state.plain = renderer.renderPlainText(markdown);
  }

  function setMessage(value) {
    message.textContent = value;
  }

  function findEditor() {
    const active = document.activeElement;
    const activeEditor = active?.closest?.('[contenteditable="true"]');
    if (activeEditor) return activeEditor;

    const editors = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    return editors.find(isVisibleElement) || editors[0] || null;
  }

  function isVisibleElement(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function insertIntoEditor(html, plain) {
    const editor = findEditor();
    if (!editor) return false;

    try {
      editor.focus();
      const inserted = document.execCommand("insertHTML", false, html);
      if (!inserted) return false;
      dispatchEditorEvents(editor, plain);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function dispatchEditorEvents(editor, plain) {
    try {
      editor.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        data: plain,
        inputType: "insertHTML",
      }));
    } catch (_error) {
      editor.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    editor.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  async function writeClipboard(html, plain) {
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
        return "rich";
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plain || html);
        return "plain";
      }
    } catch (_error) {
      return false;
    }

    return false;
  }
})();
