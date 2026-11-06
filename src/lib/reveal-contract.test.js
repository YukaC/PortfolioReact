import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * What this protects: the reveal is decoration, and decoration must never be the
 * reason the page looks empty. The base state of `[data-r]` used to be
 * `opacity: 0` (plus a blur), so every reader waited for hydration before
 * seeing any content below the hero — on a 6x-throttled phone the viewport
 * stayed invisible for 13.7s, and the phone recording that prompted this work
 * shows exactly that.
 *
 * The contract now is: hidden is a state a scripted document owns — the `js`
 * class the inline head script puts on `<html>` plus `:not(.is-in)` on the node
 * the observer has not reached yet. There is no `.is-pending` round trip: the
 * observer in `useRevealOnEnter` only ever adds `.is-in`, so a node it found in
 * view never flashes hidden and no second class has to be kept in sync.
 *
 * Two resets have to hold the same guarantee for readers who never run that
 * script, or who asked for less motion: `(scripting: none)` and
 * `(prefers-reduced-motion: reduce)` both leave every word inside its box, with
 * nothing animating. That is a property of the CSS file, so the test reads it
 * instead of hoping a browser run catches it.
 *
 * The same file guards the rest of the no-script fallback (§20.4), because it is
 * the same question — what does a document without JavaScript look like: the
 * controls that only a script can back are hidden, and the drawer is the
 * browser's own `<details>` instead of a React state nobody can reach.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8");

/** Comments dropped (line breaks kept) so a comment can never quote a rule in. */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
  comment.replace(/[^\n]/g, " "),
);

/** The body of the block that opens at `openIndex`, balanced to its close. */
const blockAt = (openIndex) => {
  let depth = 0;
  for (let i = openIndex; i < bare.length; i += 1) {
    if (bare[i] === "{") depth += 1;
    else if (bare[i] === "}") {
      depth -= 1;
      if (depth === 0) return bare.slice(openIndex + 1, i);
    }
  }
  throw new Error(`unbalanced block at ${openIndex}`);
};

/** The body of the first rule written for exactly `selector`. */
const ruleFor = (selector) => {
  const at = bare.indexOf(`${selector} {`);
  return at === -1 ? "" : blockAt(bare.indexOf("{", at));
};

/** The body of a whole `@media <query> { … }` block, or "" when absent. */
const mediaBlock = (query) => {
  const at = bare.indexOf(`@media ${query} {`);
  return at === -1 ? "" : blockAt(bare.indexOf("{", at));
};

const hidesContent = (block) =>
  /opacity:\s*0\s*(;|$)/m.test(block) || /filter:\s*blur/m.test(block);

test("the reveal base state does not hide content", () => {
  const base = ruleFor("[data-r]");
  assert.notEqual(base, "", "[data-r] rule not found");
  assert.equal(
    hidesContent(base),
    false,
    "the default state of [data-r] hides content: content must be visible before any script runs",
  );
});

test("hiding belongs to the scripted document and to :not(.is-in)", () => {
  const hidden = ruleFor('html.js [data-r]:not(.is-in):not([data-r="paint"])');
  assert.notEqual(hidden, "", "html.js [data-r]:not(.is-in) rule not found");
  assert.equal(
    hidesContent(hidden),
    true,
    "the scripted state must hide, otherwise the observer has nothing to reveal",
  );
  assert.equal(
    bare.includes(".is-pending"),
    false,
    ".is-pending is pinned but no script sets it: the live mechanism is :not(.is-in)",
  );
});

test("a revealed node is fully visible", () => {
  const isIn = ruleFor("[data-r].is-in");
  assert.notEqual(isIn, "", "[data-r].is-in rule not found");
  assert.match(isIn, /opacity:\s*1/);
  assert.match(isIn, /filter:\s*none/);
});

test("with no script the word split keeps every word in its box", () => {
  const block = mediaBlock("(scripting: none)");
  assert.notEqual(block, "", "no @media (scripting: none) block");
  assert.match(block, /\[data-r\]/, "the no-script reset does not release [data-r]");
  assert.match(block, /\.w > span/, "the no-script reset does not release .w > span");
  assert.match(block, /transform:\s*none/, "the no-script reset leaves a word displaced");
  assert.match(block, /animation:\s*none/, "the no-script reset leaves animations running");
  assert.equal(
    /translateY/.test(block),
    false,
    "the no-script reset still displaces a word: 0 displaced words is the criterion",
  );
});

test("reduced motion holds the same guarantee as no script", () => {
  const block = mediaBlock("(prefers-reduced-motion: reduce)");
  assert.notEqual(block, "", "no @media (prefers-reduced-motion: reduce) block");
  assert.match(block, /opacity:\s*1/, "reduced motion leaves a reveal hidden");
  assert.match(block, /\.w > span/, "reduced motion leaves the word split displaced");
  assert.match(block, /transform:\s*none/, "reduced motion leaves a word displaced");
  assert.match(block, /animation:\s*none/, "reduced motion leaves animations running");
  assert.equal(
    /translateY/.test(block),
    false,
    "reduced motion still displaces a word: 0 displaced words is the criterion",
  );
});

test("a control that needs a script is hidden without one", () => {
  const hidden = ruleFor("html:not(.js) .js-only");
  assert.notEqual(hidden, "", "no html:not(.js) .js-only rule");
  assert.match(hidden, /display:\s*none/);
  assert.equal(
    bare.split(".js-only").length - 1,
    1,
    "`.js-only` is mentioned once, in the gated rule: an ungated copy would hide the filters and the copy button in a scripted document too",
  );
});

test("without a script the drawer is the browser's own disclosure", () => {
  const closed = ruleFor("html:not(.js) .mobile-menu-panel");
  assert.notEqual(closed, "", "the panel is not hidden without a script");
  assert.match(closed, /display:\s*none/);

  const open = ruleFor(
    "html:not(.js) .site-header:has(.menu-disclosure[open]) ~ .mobile-menu-panel",
  );
  assert.notEqual(
    open,
    "",
    "no rule carries the `<details>` open state to the panel: the toggle would do nothing without JavaScript",
  );
  assert.match(open, /display:\s*block/);
});

test("the decorations a scroll trigger owns still resolve without a script", () => {
  assert.match(
    ruleFor("html:not(.js) .field-progress"),
    /display:\s*none/,
    "the reading bar stays at zero without a script instead of being removed",
  );
  assert.match(
    ruleFor("html:not(.js) .timeline::after"),
    /transform:\s*scaleY\(1\)/,
    "the timeline rail stays at zero without a script instead of being drawn",
  );
});

test("a phone gets a shorter entrance than a desktop", () => {
  // A finger scrolls through the entrance instead of watching it. Sixteen pixels of
  // rise on several blocks entering at once is what the 6 nov 2026 phone report
  // reads as the page wobbling; the desktop keeps the full rise because there it is
  // watched. The rise lives in a token so the variant shortens it without a second
  // copy of the rule.
  const hidden = ruleFor('html.js [data-r]:not(.is-in):not([data-r="paint"])');
  assert.match(
    hidden,
    /translateY\(var\(--reveal-rise,\s*16px\)\)/,
    "the hidden state must take its rise from --reveal-rise, so one variant can shorten it",
  );
  assert.match(
    css,
    /@variant pointer-coarse \{\s*html\.js \{\s*--reveal-rise:\s*6px;/,
    "a coarse pointer must shorten the reveal rise to 6 px",
  );
});

test("a phone does not drift the words of a heading", () => {
  // `--k` grows with the word's position, and `--scy` is a smoothed scroll value,
  // so on a flick the last word of a line travels furthest while the page has
  // already arrived: the lines overlap and the heading reads as broken. The phone
  // report of 6 nov 2026 shows "Desarrollo" drawn over "tu software,". Desktop
  // keeps the drift; a coarse pointer must not.
  const word = ruleFor(".w");
  assert.notEqual(word, "", ".w rule not found");
  assert.match(
    word,
    /translate:\s*0\s*calc\(var\(--scy\)[^;]*\)/,
    "the word box no longer reads the scroll channel at all — did the drift move?",
  );
  const coarse = css.slice(css.indexOf("@variant pointer-coarse", css.indexOf(".w {")));
  assert.match(
    coarse.slice(0, 400),
    /translate:\s*none/,
    "a coarse pointer must stop the per-word drift: otherwise the heading overlaps itself on a flick",
  );
});

test("a fling reveals without playing the entrance", () => {
  // A flick covers more than a screen inside `--duration-reveal`, so a block is
  // observed and still rising from opacity 0 when the reader is on it: text that
  // reads as gone for a beat. While the scroll layer is flinging, a node reveals
  // at once — same observer, same `.is-in`. The node rule must match on BOTH
  // sides of the moment `.is-in` lands: scoped to `:not(.is-in)` it stops
  // applying exactly when the class arrives, the transition comes back with the
  // change, and the block still fades in (measured: 15 ghost frames vs 1).
  const node = ruleFor('html.js.fling [data-r]:not([data-r="paint"])');
  const word = ruleFor("html.js.fling .w > span");
  assert.match(node, /transition:\s*none/, "the block entrance is not dropped during a fling");
  assert.match(word, /transition:\s*none/, "the word rise is not dropped during a fling");
});

test("a phone reveals a third of a viewport early, a desktop does not", () => {
  // A block that reveals as it arrives is still rising from opacity 0 while the
  // reader is already on it, and a flick lands the reader in a screenful of those:
  // the phone report shows whole screens with no text and a preview floating
  // without its row. Only a coarse pointer pre-reveals; the desktop entrance is
  // watched, so it keeps the late trigger.
  const hook = readFileSync(path.join(ROOT, "src/hooks/useRevealOnEnter.js"), "utf8");
  assert.match(hook, /pointer:\s*coarse/, "the reveal observer does not ask about the pointer");
  assert.match(
    hook,
    /rootMargin:\s*coarsePointer\(\)\s*\?\s*"0px 0px 33% 0px"\s*:\s*"0px 0px -8% 0px"/,
    "the coarse pointer must pre-reveal a third of a viewport; the desktop keeps -8%",
  );
});
