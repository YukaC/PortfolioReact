import test from "node:test";
import assert from "node:assert/strict";

import {
  BREAKPOINT,
  isAtLeast,
  isAtMost,
  mediaQuery,
} from "./breakpoints.js";

/**
 * S9's module, tested where it can be tested without a browser: the values it
 * ships, the query strings it builds and the two guards it exposes. The parity
 * with the stylesheet is `src/lib/css-contract.test.js`'s job — this suite must
 * not read the CSS, or the two would fail together and neither would say which
 * one moved.
 *
 * There is no `document` under `node:test`, which is the server's situation
 * too: every read has to fall back to the shipped number instead of `NaN`.
 */
test("without a document the module ships the token values", () => {
  assert.equal(BREAKPOINT.nav, 768);
  assert.equal(BREAKPOINT.wide, 900);
  Object.values(BREAKPOINT).forEach((width) => {
    assert.equal(Number.isFinite(width), true, `not a number: ${width}`);
    assert.ok(width > 0, `not a width: ${width}`);
  });
});

test("the media queries are built from those numbers", () => {
  assert.equal(mediaQuery.max(BREAKPOINT.wide), "(max-width: 900px)");
  assert.equal(mediaQuery.min(BREAKPOINT.wide), "(min-width: 900px)");
  assert.equal(mediaQuery.max(BREAKPOINT.nav), "(max-width: 768px)");
  assert.equal(mediaQuery.min(BREAKPOINT.nav), "(min-width: 768px)");
});

test("the width guards answer false with no window", () => {
  assert.equal(isAtMost(BREAKPOINT.wide), false);
  assert.equal(isAtLeast(BREAKPOINT.wide), false);
});

test("the width guards follow the inclusive boundary the CSS uses", () => {
  const original = globalThis.window;
  try {
    globalThis.window = { innerWidth: 900 };
    // `max-wide` is `max-width: 56.25rem`, which matches *at* 900.
    assert.equal(isAtMost(BREAKPOINT.wide), true);
    assert.equal(isAtLeast(BREAKPOINT.wide), true);
    globalThis.window = { innerWidth: 901 };
    assert.equal(isAtMost(BREAKPOINT.wide), false);
    assert.equal(isAtLeast(BREAKPOINT.wide), true);
    globalThis.window = { innerWidth: 899 };
    assert.equal(isAtMost(BREAKPOINT.wide), true);
    assert.equal(isAtLeast(BREAKPOINT.wide), false);
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
