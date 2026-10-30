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
 * The contract now is: hidden is a class JavaScript opts into (`.is-pending`),
 * never the stylesheet's default. That is a property of the CSS file, so the
 * test reads it instead of hoping a browser run catches it.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(path.join(ROOT, "src/styles/globals.css"), "utf8");

/** The declaration block of one selector, as written at the top of the file. */
const blockFor = (selector) => {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const end = css.indexOf("}", start);
  return css.slice(start + selector.length + 2, end);
};

const hidesContent = (block) =>
  /opacity:\s*0\s*(;|$)/m.test(block) || /filter:\s*blur/m.test(block);

test("the reveal base state does not hide content", () => {
  const base = blockFor("[data-r]");
  assert.notEqual(base, "", "[data-r] rule not found");
  assert.equal(
    hidesContent(base),
    false,
    "the default state of [data-r] hides content: content must be visible before any script runs",
  );
});

test("hiding is opt-in through .is-pending", () => {
  const pending = blockFor("[data-r].is-pending");
  assert.notEqual(pending, "", "[data-r].is-pending rule not found");
  assert.equal(
    hidesContent(pending),
    true,
    ".is-pending must be the state that hides, otherwise the observer has nothing to reveal",
  );
});

test("a revealed node is fully visible", () => {
  const isIn = blockFor("[data-r].is-in");
  assert.notEqual(isIn, "", "[data-r].is-in rule not found");
  assert.match(isIn, /opacity:\s*1/);
  assert.match(isIn, /filter:\s*none/);
});
