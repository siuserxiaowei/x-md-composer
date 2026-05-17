import assert from "node:assert/strict";

await import("../content-core.js");

const { createEditorTracker, writeClipboard } = globalThis.XmdHelperCore;

function fakeElement(name, { editor = false, helper = false, visible = true } = {}) {
  return {
    name,
    closest(selector) {
      if (selector === '[contenteditable="true"]') return editor ? this : null;
      if (selector === ".xmd-helper-modal, .xmd-helper-button") return helper ? this : null;
      return null;
    },
    getBoundingClientRect() {
      return visible ? { width: 320, height: 120 } : { width: 0, height: 0 };
    },
  };
}

const firstEditor = fakeElement("first", { editor: true });
const lastEditor = fakeElement("last", { editor: true });
const helperButton = fakeElement("helper", { helper: true });
const documentLike = {
  activeElement: helperButton,
  querySelectorAll(selector) {
    assert.equal(selector, '[contenteditable="true"]');
    return [firstEditor, lastEditor];
  },
};

const tracker = createEditorTracker(documentLike);
tracker.handleFocusIn({ target: lastEditor });
tracker.handleFocusIn({ target: helperButton });

assert.equal(tracker.findEditor(), lastEditor);

let richAttempted = false;
let plainText = "";
const clipboardResult = await writeClipboard("<p>Hello</p>", "Hello", {
  Blob,
  ClipboardItem: class ClipboardItem {
    constructor(items) {
      this.items = items;
    }
  },
  navigator: {
    clipboard: {
      async write() {
        richAttempted = true;
        throw new Error("rich clipboard denied");
      },
      async writeText(value) {
        plainText = value;
      },
    },
  },
});

assert.equal(richAttempted, true);
assert.equal(clipboardResult, "plain");
assert.equal(plainText, "Hello");
