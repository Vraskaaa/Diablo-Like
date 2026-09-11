// A tiny DOM stub sufficient to exercise the UI layer headlessly (no browser).
// It implements only the subset of the DOM API that src/ui/ui.ts touches:
// createElement, appendChild/removeChild, className/id/textContent/innerHTML,
// style, addEventListener + click(), querySelector/querySelectorAll,
// getBoundingClientRect, value (for <select>/<input>), and remove().
//
// This is intentionally minimal but behaviorally faithful for click dispatch
// and tree traversal, which is what the crafting-button tests need.
export class StubNode {
    tagName;
    children = [];
    parent = null;
    listeners = new Map();
    className = "";
    id = "";
    title = "";
    _textContent = "";
    _innerHTML = "";
    style = { cssText: "", setProperty() { }, removeProperty() { } };
    value = ""; // for <select>/<input>
    disabled = false;
    isContentEditable = false;
    constructor(tagName) {
        this.tagName = tagName.toUpperCase();
    }
    appendChild(child) {
        child.parent = this;
        this.children.push(child);
        // A <select> defaults its value to the first <option> appended.
        if (this.tagName === "SELECT" && child.tagName === "OPTION" && this.value === "") {
            this.value = child.value;
        }
        return child;
    }
    removeChild(child) {
        const i = this.children.indexOf(child);
        if (i >= 0)
            this.children.splice(i, 1);
    }
    remove() {
        if (this.parent)
            this.parent.removeChild(this);
    }
    set textContent(v) {
        this._textContent = v;
        // Setting textContent clears children in the real DOM.
        this.children = [];
    }
    get textContent() {
        if (this._textContent)
            return this._textContent;
        return this.children.map((c) => c.textContent).join("");
    }
    set innerHTML(v) {
        // Setting innerHTML replaces all children (listeners on old children lost).
        this._innerHTML = v;
        this.children = [];
        // Minimal parse: create child nodes for any tags carrying a class or id so
        // querySelector('.foo')/('#foo') still resolves after innerHTML assignment.
        // This mirrors just enough of real DOM behavior for the UI's lookups.
        const tagRe = /<([a-zA-Z0-9]+)([^>]*)>/g;
        let m;
        while ((m = tagRe.exec(v)) !== null) {
            const [, tag, attrs] = m;
            const node = new StubNode(tag);
            const cls = /class\s*=\s*"([^"]*)"/.exec(attrs);
            if (cls)
                node.className = cls[1];
            const idm = /\bid\s*=\s*"([^"]*)"/.exec(attrs);
            if (idm)
                node.id = idm[1];
            node.parent = this;
            this.children.push(node);
        }
    }
    get innerHTML() {
        return this._innerHTML;
    }
    setAttribute(k, v) {
        if (k === "style")
            this.style.cssText = v;
        else
            this[k] = v;
    }
    addEventListener(type, fn) {
        if (!this.listeners.has(type))
            this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
    }
    dispatch(type, event = {}) {
        const fns = this.listeners.get(type);
        if (fns)
            for (const fn of fns.slice())
                fn({ target: this, preventDefault() { }, ...event });
    }
    click() {
        // Mirror a real click: fire mousedown then click.
        this.dispatch("mousedown");
        this.dispatch("click");
    }
    hasListener(type) {
        return (this.listeners.get(type)?.length ?? 0) > 0;
    }
    getBoundingClientRect() {
        return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    }
    // Depth-first walk over the subtree (self included).
    *walk() {
        yield this;
        for (const c of this.children)
            yield* c.walk();
    }
    querySelector(sel) {
        for (const n of this.walk()) {
            if (n === this)
                continue;
            if (matches(n, sel))
                return n;
        }
        return null;
    }
    querySelectorAll(sel) {
        const out = [];
        for (const n of this.walk()) {
            if (n === this)
                continue;
            if (matches(n, sel))
                out.push(n);
        }
        return out;
    }
    /** Find every button-like node in the subtree (test helper). */
    findByText(tag, text) {
        for (const n of this.walk()) {
            if (n.tagName === tag.toUpperCase() && n.textContent.includes(text))
                return n;
        }
        return null;
    }
}
function matches(node, sel) {
    if (sel.startsWith("."))
        return node.className.split(/\s+/).includes(sel.slice(1));
    if (sel.startsWith("#"))
        return node.id === sel.slice(1);
    return node.tagName === sel.toUpperCase();
}
export function installDomStub() {
    const body = new StubNode("body");
    const root = new StubNode("div");
    root.id = "ui-root";
    const doc = {
        createElement: (tag) => new StubNode(tag),
        getElementById: (id) => (id === "ui-root" ? root : null),
        body,
    };
    globalThis.document = doc;
    globalThis.HTMLElement = StubNode;
    globalThis.HTMLButtonElement = StubNode;
    globalThis.HTMLSelectElement = StubNode;
    globalThis.HTMLInputElement = StubNode;
    globalThis.setTimeout = (fn) => {
        // Run timers synchronously for deterministic tests.
        fn();
        return 0;
    };
    return { root, body };
}
//# sourceMappingURL=dom-stub.js.map