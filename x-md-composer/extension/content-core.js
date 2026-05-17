(function attachXmdHelperCore(globalScope) {
  "use strict";

  const HELPER_SELECTOR = ".xmd-helper-modal, .xmd-helper-button";
  const EDITOR_SELECTOR = '[contenteditable="true"]';

  function createEditorTracker(documentRef) {
    let lastFocusedEditor = null;

    function handleFocusIn(event) {
      const target = event?.target;
      if (!target || isHelperElement(target)) return;

      const editor = closestEditor(target);
      if (editor) lastFocusedEditor = editor;
    }

    function findEditor() {
      const active = documentRef.activeElement;
      if (active && !isHelperElement(active)) {
        const activeEditor = closestEditor(active);
        if (activeEditor) {
          lastFocusedEditor = activeEditor;
          return activeEditor;
        }
      }

      if (isUsableEditor(lastFocusedEditor)) return lastFocusedEditor;

      const editors = Array.from(documentRef.querySelectorAll(EDITOR_SELECTOR));
      return editors.find(isVisibleElement) || editors[0] || null;
    }

    return {
      findEditor,
      handleFocusIn,
    };
  }

  function closestEditor(element) {
    return element?.closest?.(EDITOR_SELECTOR) || null;
  }

  function isHelperElement(element) {
    return Boolean(element?.closest?.(HELPER_SELECTOR));
  }

  function isUsableEditor(element) {
    if (!element) return false;
    if (element.isConnected === false) return false;
    return isVisibleElement(element);
  }

  function isVisibleElement(element) {
    const rect = element?.getBoundingClientRect?.();
    return Boolean(rect && rect.width > 0 && rect.height > 0);
  }

  async function writeClipboard(html, plain, environment = globalScope) {
    const clipboard = environment.navigator?.clipboard;
    if (!clipboard) return false;

    if (clipboard.write && typeof environment.ClipboardItem !== "undefined" && typeof environment.Blob !== "undefined") {
      try {
        await clipboard.write([
          new environment.ClipboardItem({
            "text/html": new environment.Blob([html], { type: "text/html" }),
            "text/plain": new environment.Blob([plain], { type: "text/plain" }),
          }),
        ]);
        return "rich";
      } catch (_error) {
        // Try a plain text fallback below.
      }
    }

    if (clipboard.writeText) {
      try {
        await clipboard.writeText(plain || html);
        return "plain";
      } catch (_error) {
        return false;
      }
    }

    return false;
  }

  globalScope.XmdHelperCore = {
    createEditorTracker,
    writeClipboard,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
