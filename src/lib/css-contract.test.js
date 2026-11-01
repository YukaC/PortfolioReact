import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * §21.3 "Contract CSS" — the subset that is a property of the sources alone, so
 * it runs in `node:test` with no build, no browser and no network:
 *
 *   1. one colour grammar: outside `@theme`, a hex/rgb/hsl literal is either a
 *      token definition or lives in a rule that says why it stays literal;
 *   2. no phantom tokens: every `--color-*` declared in `@theme` has a consumer;
 *   3. `--line` and `--glass` are the single source of their value;
 *   4. the no-script default is a page that reads: `[data-r]` is never hidden
 *      by the base stylesheet, `.w > span` keeps its box, and the
 *      `(scripting: none)` reset covers the word split (P0-1: 0 displaced
 *      words without JS).
 *
 * The suite reads the stylesheet as text on purpose: P0-1 was a two-character
 * bug in a declaration, and it has to fail here before it fails in a browser.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CSS_FILE = path.join(ROOT, "src/styles/globals.css");
const css = readFileSync(CSS_FILE, "utf8");
const cssLines = css.split("\n");

/**
 * Comments dropped for structural reads, with their line breaks kept so a
 * comment can never quote a rule into existence. The literal check below works
 * off the raw text, because a `/* literal: … *\/` marker is exactly what it
 * has to find.
 */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
  comment.replace(/[^\n]/g, " "),
);

/** Every rule in the file, top level and inside `@media`, as { selectors, body }. */
const rules = (() => {
  const found = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match = ruleRe.exec(bare);
  while (match !== null) {
    const selectors = match[1]
      .split(",")
      .map((selector) => selector.trim())
      .filter(Boolean);
    found.push({ selectors, body: match[2] });
    match = ruleRe.exec(bare);
  }
  return found;
})();

/** Rules whose selector list contains `selector` exactly (no combinator added). */
const rulesFor = (selector) =>
  rules.filter((rule) => rule.selectors.includes(selector));

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

/** The body of a whole `@media <query> { … }` block, or "" when absent. */
const mediaBlock = (query) => {
  const at = bare.indexOf(`@media ${query} {`);
  return at === -1 ? "" : blockAt(bare.indexOf("{", at));
};

/** 1-based line ranges of the `@theme` block: tokens are allowed literals there. */
const themeLines = (() => {
  const start = cssLines.findIndex((line) => /^@theme\b/.test(line));
  assert.notEqual(start, -1, "@theme block not found in globals.css");
  const end = cssLines.findIndex((line, i) => i > start && /^\}/.test(line));
  assert.notEqual(end, -1, "@theme block is not closed at column 0");
  return { start: start + 1, end: end + 1 };
})();

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

const bareLines = bare.split("\n");

/** For every line, the line that opens the block it lives in (-1 at top level). */
const openLineFor = (() => {
  const stack = [];
  const opens = [];
  bareLines.forEach((line) => {
    opens.push(stack.length > 0 ? stack[stack.length - 1] : -1);
    for (const char of line) {
      if (char === "{") stack.push(opens.length - 1);
      else if (char === "}" && stack.length > 0) stack.pop();
    }
  });
  return opens;
})();

/** The raw text of the innermost block around line `index`, comments included. */
const enclosingRule = (index) => {
  const open = openLineFor[index];
  if (open === -1) return "";
  let depth = 0;
  for (let i = open; i < bareLines.length; i += 1) {
    for (const char of bareLines[i]) {
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
    }
    if (depth === 0) return cssLines.slice(open, i + 1).join("\n");
  }
  return "";
};

test("colour literals live in @theme or in a rule that justifies them", () => {
  const offenders = [];
  bareLines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (lineNumber >= themeLines.start && lineNumber <= themeLines.end) return;
    if (!COLOR_LITERAL.test(line)) return;
    // A custom-property definition is the token: this is where a literal lives.
    if (/^\s*--[a-z0-9-]+\s*:/.test(cssLines[i])) return;
    if (enclosingRule(i).includes("/* literal:")) return;
    offenders.push(`${lineNumber}: ${line.trim()}`);
  });
  assert.deepEqual(
    offenders,
    [],
    `colour literals outside @theme with no /* literal: … */ justification:\n${offenders.join("\n")}`,
  );
});

test("every --color-* in @theme has a consumer", () => {
  const declared = [];
  for (let i = themeLines.start; i < themeLines.end - 1; i += 1) {
    const name = /^\s*(--color-[a-z0-9-]+)\s*:/.exec(cssLines[i]);
    if (name) declared.push(name[1]);
  }
  assert.ok(declared.length > 0, "no colour tokens found in @theme");

  const sources = [];
  const walk = (dir) => {
    readdirSync(dir).forEach((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      if (!/\.(jsx|js|css)$/.test(full) || /\.test\.js$/.test(full)) return;
      sources.push(readFileSync(full, "utf8"));
    });
  };
  walk(path.join(ROOT, "src"));
  const corpus = sources.join("\n");

  const orphaned = declared.filter((token) => {
    const name = token.replace(/^--color-/, "");
    const read = new RegExp(`var\\(\\s*${token}\\b`);
    const utility = new RegExp(
      `\\b(?:bg|text|border|from|via|to|ring|fill|stroke|shadow|outline|decoration|accent|caret|divide|placeholder)-${name}\\b`,
    );
    return !read.test(corpus) && !utility.test(corpus);
  });
  assert.deepEqual(orphaned, [], `tokens with no consumer: ${orphaned.join(", ")}`);
});

test("--line and --glass are declared once and are the only source of their value", () => {
  ["--line", "--glass"].forEach((token) => {
    const declared = cssLines
      .map((line, i) => ({ line: line.trim(), number: i + 1 }))
      .filter(({ line }) => line.startsWith(`${token}:`));
    assert.equal(
      declared.length,
      1,
      `${token} must be declared exactly once, found ${declared.length}`,
    );
  });

  const duplicates = cssLines
    .map((line, i) => ({ line, number: i + 1 }))
    .filter(({ line, number }) => {
      if (number >= themeLines.start && number <= themeLines.end) return false;
      if (/^\s*--[a-z0-9-]+\s*:/.test(line)) return false;
      return /rgb\(\s*255\s+255\s+255\s*\/\s*0?\.(?:09|05)\s*\)/.test(line);
    });
  assert.deepEqual(
    duplicates.map(({ number, line }) => `${number}: ${line.trim()}`),
    [],
    "--line / --glass are duplicated as raw white alphas",
  );
});

test("the base stylesheet never hides a reveal", () => {
  const ungated = rules.filter((rule) =>
    rule.selectors.some(
      (selector) => selector.includes("[data-r]") && !selector.startsWith("html.js "),
    ),
  );
  ungated.forEach((rule) => {
    assert.equal(
      /opacity:\s*0\s*(;|$)/m.test(rule.body),
      false,
      `a rule that is not gated by html.js hides [data-r]: ${rule.selectors.join(", ")}`,
    );
  });
});

test("with no html.js the hidden state is owned by JS: words stay in their box", () => {
  const bases = rulesFor(".w > span");
  assert.ok(bases.length > 0, "no ungated .w > span rule: the default is not visible");
  bases.forEach((rule) => {
    assert.match(
      rule.body,
      /transform:\s*none/,
      "the default .w > span must not displace the word",
    );
    assert.equal(
      /translateY/.test(rule.body),
      false,
      "a .w > span rule not gated by html.js still displaces the word",
    );
  });
});

test("the scripting:none reset covers the word split and the statement", () => {
  const block = mediaBlock("(scripting: none)");
  assert.notEqual(block, "", "no @media (scripting: none) block");
  assert.match(block, /\.w > span/, "the no-script reset does not release .w > span");
  assert.match(block, /\.statement \.sw/, "the no-script reset does not light the statement");
  assert.match(block, /animation:\s*none/, "the no-script reset leaves animations running");
});

test("reduced motion resets the same states the scripted reveal hides", () => {
  const block = mediaBlock("(prefers-reduced-motion: reduce)");
  assert.notEqual(block, "", "no @media (prefers-reduced-motion: reduce) block");
  assert.match(block, /opacity:\s*1/, "reduced motion leaves a reveal hidden");
  assert.match(block, /\.w > span/, "reduced motion leaves the word split displaced");
  assert.match(block, /animation:\s*none/, "reduced motion leaves animations running");
});
