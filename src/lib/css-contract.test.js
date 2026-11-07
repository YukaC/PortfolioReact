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
 *      words without JS);
 *   5. the token scales of §14.7 S2b/S2d: one font stack, every `font-size`,
 *      `border-radius`, `filter: blur()` and `z-index` in the sheet reads a
 *      token (or says in the rule why it does not), and every width a script
 *      asks about exists as a CSS breakpoint.
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

test("the reveal is cheap: no blur, a short beat, a tight stagger", () => {
  // The owner's report was that the reveal still felt poor. The entrance was
  // `opacity + translateY(28px) + blur(6px)` over 1.1 s with a 70 ms per-word
  // stagger; a blur per revealed node is the most expensive thing one entrance
  // asks of a phone GPU, and the beat was long enough to feel like work. These
  // numbers are the contract (docs/css-map.md §reveal).
  const hidden = rulesFor('html.js [data-r]:not(.is-in):not([data-r="paint"])');
  assert.ok(hidden.length > 0, "the scripted hidden state is missing");
  hidden.forEach((rule) => {
    assert.equal(/filter\s*:/.test(rule.body), false, "the hidden reveal still carries a filter");
    assert.equal(/blur\(/.test(rule.body), false, "the hidden reveal still blurs");
    assert.equal(
      /will-change\s*:/.test(rule.body),
      false,
      "the hidden reveal keeps a permanent layer hint",
    );
  });

  const transition = rulesFor('html.js [data-r]:not([data-r="paint"])');
  assert.ok(transition.length > 0, "the reveal transition is missing");
  transition.forEach((rule) => {
    assert.equal(/blur\(/.test(rule.body), false, "the reveal still transitions a blur");
    assert.equal(/will-change\s*:/.test(rule.body), false, "the reveal still carries a layer hint");
  });

  const reveal = /--duration-reveal:\s*([\d.]+)s/.exec(css);
  assert.ok(reveal, "--duration-reveal is not declared");
  assert.ok(parseFloat(reveal[1]) <= 0.6, `the reveal takes ${reveal[1]}s; 0.6 s is the ceiling`);
  const stagger = /--stagger-word:\s*([\d.]+)ms/.exec(css);
  assert.ok(stagger, "--stagger-word is not declared");
  assert.ok(parseFloat(stagger[1]) <= 50, `the word stagger is ${stagger[1]}ms; 50 ms is the ceiling`);
});

test("the scrolled pill fades a composited pseudo, never a painted property", () => {
  // The pill transitioned `background-color`, `border-color` and `box-shadow`.
  // Those repaint: the transition re-rastered the root content layer on every
  // frame of the 0.5 s it ran, and a fling covers 5000 px in that time, so the
  // tiles ahead of it never arrived — the owner's "whole screens with only the
  // field" report. Measured in `.perf/flick-trace.mjs`: `#document` painted 60×
  // during one gesture, 8× once only an opacity moves. The fill therefore lives
  // on a pseudo-element and only its opacity is transitioned, which the
  // compositor can run without touching the layer below.
  const start = bare.indexOf("@utility nav-pill {");
  assert.notEqual(start, -1, "@utility nav-pill is missing from globals.css");
  const block = blockAt(bare.indexOf("{", start));
  const pseudoAt = block.indexOf("&::before");
  assert.notEqual(pseudoAt, -1, "the scrolled fill is not a pseudo-element");
  const surface = block.slice(0, pseudoAt);
  const fill = block.slice(pseudoAt);
  assert.equal(
    /transition:\s*[^;]*(background|border|box-shadow)/.test(surface),
    false,
    "the pill still transitions a painted property",
  );
  assert.match(
    fill,
    /opacity:\s*0;/,
    "the pill's fill is no longer transparent at rest",
  );
  assert.match(
    fill,
    /\.site-header\.is-scrolled &::before\s*\{[^}]*opacity:\s*1/,
    "the scrolled state no longer fades the pseudo-element's fill",
  );
});

/* ===========================================================================
   §13.3 S3–S7 (spec S14) — the invariants the Tailwind migration created.
   Text-only like the rest of the suite: no build, no browser, so a regression
   fails here before it fails in `pnpm check:css` or in a screenshot.
   ======================================================================== */

/** Every JSX file, as { file, text }, so a token can be traced to its author. */
const jsxSources = (() => {
  const found = [];
  const walk = (dir) => {
    readdirSync(dir).forEach((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      if (!/\.jsx$/.test(full)) return;
      found.push({ file: path.relative(ROOT, full), text: readFileSync(full, "utf8") });
    });
  };
  walk(path.join(ROOT, "src"));
  return found;
})();

/** The index of the brace that closes the one opened at `open`, or -1. */
const matchBrace = (text, open) => {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/** Class-ish tokens written in a `className` expression, `${…}` dropped. */
const tokensIn = (expression) => {
  let flat = "";
  for (let i = 0; i < expression.length; i += 1) {
    if (expression[i] === "$" && expression[i + 1] === "{") {
      const close = matchBrace(expression, i + 1);
      if (close === -1) break;
      i = close;
      continue;
    }
    flat += expression[i];
  }
  return flat
    .split(/[\s"'`+]+/)
    .map((token) => token.trim())
    .filter((token) => /^[A-Za-z][A-Za-z0-9_:[\]./%#(),=>~!*-]*$/.test(token));
};

/** Every class token written in the JSX, with the file that writes it. */
const jsxClasses = (() => {
  const tokens = new Map();
  const collect = (expression, file) => {
    tokensIn(expression).forEach((token) => {
      if (!tokens.has(token)) tokens.set(token, file);
    });
  };
  for (const source of jsxSources) {
    for (const match of source.text.matchAll(/className\s*=\s*"([^"]*)"/g)) {
      collect(match[1], source.file);
    }
    for (const match of source.text.matchAll(/className\s*=\s*\{(?!=)/g)) {
      const open = match.index + match[0].length - 1;
      const close = matchBrace(source.text, open);
      if (close !== -1) collect(source.text.slice(open + 1, close), source.file);
    }
  }
  return tokens;
})();

test("no hand-written pointer or width media query: those are variants", () => {
  // §13.3 S5 / S14: `pointer-fine:`, `pointer-coarse:`, `max-xs`, `max-wide`,
  // and `no-hover` are declared once as variants and used from the rules and the
  // JSX. A raw query for one of them would be a second vocabulary of states.
  // The one legal home for such a query is the `@custom-variant` definition that
  // names it (a Tailwind variant cannot read `var()`, and an OR of a width and a
  // pointer condition has no built-in spelling). Everything else must use the
  // variant.
  const variantRanges = [];
  cssLines.forEach((line, i) => {
    if (!/^@custom-variant\b/.test(line.trim())) return;
    let depth = 0;
    let end = i;
    for (let j = i; j < cssLines.length; j += 1) {
      depth += (cssLines[j].match(/\{/g) || []).length;
      depth -= (cssLines[j].match(/\}/g) || []).length;
      if (depth === 0) {
        end = j;
        break;
      }
    }
    variantRanges.push([i, end]);
  });
  const insideVariant = (i) => variantRanges.some(([start, end]) => i >= start && i <= end);
  const offenders = cssLines
    .map((line, i) => ({ line: line.trim(), number: i + 1, index: i }))
    .filter(({ line }) => /^@media\b/.test(line))
    .filter(({ line }) => /pointer|hover|max-width:\s*(35rem|560px|56\.25rem|900px)/.test(line))
    .filter(({ index }) => !insideVariant(index));
  assert.deepEqual(
    offenders.map(({ number, line }) => `${number}: ${line}`),
    [],
    "a pointer or 560/900px condition is written as a media query instead of a variant",
  );
});

test("every @utility has exactly one definition", () => {
  // §13.2 bucket B: a recipe is one definition, so the JSX cannot end up with
  // two surfaces that drift apart.
  const definitions = [...css.matchAll(/^@utility\s+([a-z0-9-]+)\s*\{/gm)].map(
    (match) => match[1],
  );
  assert.ok(definitions.length > 0, "no @utility definitions found");
  const counted = definitions.reduce((counts, name) => {
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {});
  const duplicated = Object.entries(counted)
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
  assert.deepEqual(duplicated, [], `recipes defined more than once: ${duplicated.join(", ")}`);
});

test("every recipe and every house class in the JSX has a rule", () => {
  // The dead-class class of bug (§10 P2-19): `className="work-repo"` and
  // `className="site-logo"` shipped for months with nothing behind them. A class
  // this project names is owned by this stylesheet — Tailwind's own utilities
  // never start with one of these prefixes — so a house-prefixed token with no
  // rule is dead, whether it is in `@layer components` or in `@utility`.
  const HOUSE = /^(bocanada|field|site|nav|hero|orn|mq|marquee|work|about|timeline|skill|statement|bigmail|contact|footer|tagline|menu|mobile-menu|btn|glass|eyebrow|lead|stackline|status|section|skip|lang|is-|w$|lb$|ar$|hl$)/;
  // `focus-ring` is the one documented hook: the ring lives on the global
  // `:focus-visible` rule and the class only records the intent of a call site.
  const HOOKS = new Set(["focus-ring"]);
  const declarations = new Set([
    ...cssLines
      .map((line) => /^\s*@utility\s+([a-z0-9-]+)/.exec(line)?.[1])
      .filter(Boolean),
  ]);
  // The base name, not the variant prefix: `nav:hidden` asks for `hidden`, and
  // a variant (`hover:`, `max-wide:`, `pointer-coarse:`) is never a house class.
  const missing = [...jsxClasses]
    .map(([token, file]) => ({ token, file, name: token.split(":").pop() }))
    .filter(({ name }) => !HOOKS.has(name))
    .filter(({ name }) => HOUSE.test(name))
    .filter(({ name }) => !css.includes(`.${name}`) && !declarations.has(name))
    .map(({ token, file }) => `${file}: "${token}"`);
  assert.deepEqual(missing, [], `class tokens with no rule:\n${missing.join("\n")}`);
});

test("the focus ring has one path and .sr-only is Tailwind's", () => {
  // §10 P2-18 / §13.3 S4: `.focus-ring` used to re-declare the ring (3px against
  // the global 4px), and `.sr-only` was a hand-written copy of a built-in.
  const ringRules = cssLines.filter((line) => /^:focus-visible\s*\{/.test(line.trim()));
  assert.equal(
    ringRules.length,
    1,
    `expected exactly one :focus-visible ring, found ${ringRules.length}`,
  );
  assert.equal(
    /^\s*\.sr-only\s*\{/m.test(css),
    false,
    ".sr-only is Tailwind's utility; do not define it by hand",
  );
  assert.equal(
    /\.focus-ring\s*\{/.test(css),
    false,
    ".focus-ring must not draw a second ring",
  );
});

test("no duration literal survives outside the ramp (S8)", () => {
  // §14.7 S2c: CSS and `src/motion/config.js` read the same `--duration-*`
  // tokens, so a stray `0.4s` is either a token that was forgotten or a new
  // beat nobody declared.
  const rampLines = new Set();
  cssLines.forEach((line, i) => {
    if (/^\s*--(duration|stagger)-[a-z-]+\s*:/.test(line)) rampLines.add(i + 1);
  });
  const offenders = bareLines
    .map((line, i) => ({ line, number: i + 1 }))
    .filter(({ number }) => !rampLines.has(number))
    .filter(({ line }) => /\b0?\.\d+s\b/.test(line));
  assert.deepEqual(
    offenders.map(({ number, line }) => `${number}: ${line.trim()}`),
    [],
    "a time literal outside the ramp",
  );

  const config = readFileSync(path.join(ROOT, "src/motion/config.js"), "utf8");
  const configLiterals = config
    .split("\n")
    .filter((line) => !/^\s*(\/\*|\*|\/\/)/.test(line))
    .filter((line) => /\b0?\.\d+s\b/.test(line));
  assert.deepEqual(
    configLiterals,
    [],
    "a time literal in motion/config.js: durations come from the tokens",
  );
});

/* ===========================================================================
   §14.7 S2b / S2d (specs S7 typography-half and S9) — one scale, one stack, one
   breakpoint vocabulary. Text-only, like the rest of the suite.
   ======================================================================== */

/** Every `@theme` declaration, name → value, `--text-display--line-height` included. */
const themeDeclarations = new Map();
cssLines.slice(themeLines.start - 1, themeLines.end).forEach((line) => {
  const declaration = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/.exec(line);
  if (declaration) themeDeclarations.set(declaration[1], declaration[2].trim());
});

/** True when a 1-based line number lives inside the `@theme` block. */
const inTheme = (lineNumber) =>
  lineNumber >= themeLines.start && lineNumber <= themeLines.end;

test("every font-size reads the type scale (S2b)", () => {
  // §14.4/§14.7 S2b: 47 raw `font-size` declarations become the named steps of
  // `@theme`. A new size is a token, or it is the one documented exception in a
  // rule that says why (§14.5 forbids rounding a clamp to fit the grid).
  const offenders = [];
  bareLines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (inTheme(lineNumber)) return;
    const declaration = /font-size:\s*([^;]+)/.exec(line);
    if (!declaration) return;
    if (/^var\(--text-[a-z0-9-]+\)$/.test(declaration[1].trim())) return;
    if (/^\s*--[a-z0-9-]+\s*:/.test(cssLines[i])) return;
    if (enclosingRule(i).includes("/* literal:")) return;
    offenders.push(`${lineNumber}: ${line.trim()}`);
  });
  assert.deepEqual(offenders, [], `font-size literals outside the scale:\n${offenders.join("\n")}`);

  // The steps §14.4 names, with the off-grid ones kept off-grid: 13/15/17px are
  // named, never snapped to 12/14/16.
  const expected = {
    "--text-display": "clamp(2.6rem, 7.6vw, 7rem)",
    "--text-h2": "clamp(2.125rem, 4.6vw, 3.75rem)",
    "--text-h3": "clamp(1.25rem, 2vw, 1.6rem)",
    "--text-lead": "clamp(1.0625rem, 1.5vw, 1.25rem)",
    "--text-statement": "clamp(1.625rem, 3.9vw, 3rem)",
    "--text-work-title": "clamp(1.625rem, 3.4vw, 2.5rem)",
    "--text-marquee": "clamp(3.375rem, 9.5vw, 8.5rem)",
    "--text-bigmail": "clamp(1.75rem, 6.2vw, 4.75rem)",
    "--text-wordmark": "clamp(5.5rem, 23vw, 20.5rem)",
    "--text-ui": "0.9375rem",
    "--text-ui-sm": "0.875rem",
    "--text-meta": "0.8125rem",
    "--text-micro": "0.75rem",
    "--text-body": "1rem",
    "--text-copy": "1.0625rem",
  };
  Object.entries(expected).forEach(([token, value]) => {
    assert.equal(themeDeclarations.get(token), value, `${token} is not the §14.4 value`);
  });
});

test("radius and blur literals live in the token block (S2b)", () => {
  const radiusOffenders = [];
  const blurOffenders = [];
  bareLines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (inTheme(lineNumber)) return;
    const justified =
      /^\s*--[a-z0-9-]+\s*:/.test(cssLines[i]) || enclosingRule(i).includes("/* literal:");

    const radius = /border-radius:\s*([^;]+)/.exec(line);
    if (radius && !justified) {
      const value = radius[1].trim();
      // `50%` is a circle and `0`/`inherit` are geometry, not steps of a scale.
      const allowed = /^var\(--radius-[a-z0-9-]+\)$/.test(value) || ["50%", "0", "inherit"].includes(value);
      if (!allowed) radiusOffenders.push(`${lineNumber}: ${line.trim()}`);
    }

    // `blur(1px)` inside an `@supports` feature test is the question, not a value.
    if (/^@supports/.test(line)) return;
    const blur = /blur\(\s*[\d.]/.exec(line);
    if (blur && !justified) blurOffenders.push(`${lineNumber}: ${line.trim()}`);
  });
  assert.deepEqual(
    radiusOffenders,
    [],
    `border-radius literals outside the scale:\n${radiusOffenders.join("\n")}`,
  );
  assert.deepEqual(blurOffenders, [], `blur literals outside the scale:\n${blurOffenders.join("\n")}`);

  ["--radius-pill", "--radius-card", "--radius-spot", "--radius-thumb", "--radius-sm"].forEach(
    (token) => assert.ok(themeDeclarations.has(token), `${token} is not declared`),
  );
  ["--blur-field", "--blur-glass", "--blur-panel", "--blur-soft"].forEach(
    (token) => assert.ok(themeDeclarations.has(token), `${token} is not declared`),
  );
});

test("z-index literals are page layers or documented local stacks (S9)", () => {
  const offenders = [];
  bareLines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (inTheme(lineNumber)) return;
    const declaration = /z-index:\s*(-?\d+)/.exec(line);
    if (!declaration) return;
    if (/^\s*--[a-z0-9-]+\s*:/.test(cssLines[i])) return;
    if (enclosingRule(i).includes("/* literal:")) return;
    offenders.push(`${lineNumber}: ${line.trim()}`);
  });
  assert.deepEqual(offenders, [], `z-index literals outside the ladder:\n${offenders.join("\n")}`);

  ["--z-field", "--z-main", "--z-preview", "--z-nav", "--z-progress", "--z-skip"].forEach(
    (token) => assert.ok(themeDeclarations.has(token), `${token} is not declared`),
  );

  // S9 named `z-[3]` as the arbitrary value to delete; no JSX may reintroduce one.
  const arbitrary = [...jsxClasses.keys()].filter((token) => /(?:^|:)z-\[\s*-?\d/.test(token));
  assert.deepEqual(arbitrary, [], `arbitrary z values in the JSX: ${arbitrary.join(", ")}`);
});

test("one font stack, and the body is not a second declaration of it (P2-23)", () => {
  // §14.3-2: three declarations of the same stack, one of them reaching past the
  // next/font variables. The stack lives in `@theme`; `.root-layout` re-declares
  // the composite tokens on the element that carries `--font-manrope` (the only
  // place they resolve), and `body` takes no family at all.
  const bodyRule = rulesFor("body").find((rule) => /font-family/.test(rule.body));
  assert.equal(bodyRule, undefined, "body declares a font-family: it cannot see the next/font vars");

  const families = [];
  bareLines.forEach((line, i) => {
    const lineNumber = i + 1;
    if (inTheme(lineNumber)) return;
    const declaration = /font-family:\s*([^;]+)/.exec(line);
    if (declaration) families.push({ lineNumber, value: declaration[1].trim() });
  });
  const outsideStack = families.filter(({ lineNumber, value }) => {
    if (/^var\(--font-[a-z-]+\)$/.test(value)) return false;
    if (["inherit", "initial"].includes(value)) return false;
    return !enclosingRule(lineNumber - 1).includes("/* literal:");
  });
  assert.deepEqual(
    outsideStack.map(({ lineNumber, value }) => `${lineNumber}: ${value}`),
    [],
    "a font-family outside the token stack",
  );
  assert.equal(
    /var\(--font-manrope\)/.test(css.replace(/^\s*--font-[a-z-]+:.*$/gm, "")),
    false,
    "a rule resolves --font-manrope instead of --font-display",
  );
});

/* -------------------------------------------------- breakpoint parity (S9) */

/** `56.25rem` → 900, `900px` → 900; `rem` is 16px inside a media query. */
const toPixels = (value, unit) => Number.parseFloat(value) * (unit === "rem" ? 16 : 1);

/** Every width the stylesheet switches at, from tokens, queries and variants. */
const cssWidths = (() => {
  const widths = new Set();
  themeDeclarations.forEach((value, token) => {
    if (!token.startsWith("--breakpoint-")) return;
    const match = /^([\d.]+)(rem|px)$/.exec(value);
    if (match) widths.add(toPixels(match[1], match[2]));
  });
  bareLines.forEach((line) => {
    for (const query of line.matchAll(/(?:max|min)-width:\s*([\d.]+)(rem|px)/g)) {
      widths.add(toPixels(query[1], query[2]));
    }
    for (const query of line.matchAll(/width\s*[<>]=?\s*([\d.]+)(rem|px)/g)) {
      widths.add(toPixels(query[1], query[2]));
    }
  });
  return widths;
})();

/** Every width a script asks about, with the file that asks. */
const jsWidths = (() => {
  const widths = new Map();
  const add = (width, file) => {
    if (!widths.has(width)) widths.set(width, file);
  };
  const walk = (dir) => {
    readdirSync(dir).forEach((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      if (!/\.(js|jsx)$/.test(full) || /\.test\.js$/.test(full)) return;
      const file = path.relative(ROOT, full);
      const text = readFileSync(full, "utf8");
      for (const match of text.matchAll(/pixels\("--breakpoint-[a-z]+",\s*([\d.]+)\)/g)) {
        add(Number(match[1]), file);
      }
      for (const match of text.matchAll(/\((?:max|min)-width:\s*([\d.]+)px\)/g)) {
        add(Number(match[1]), file);
      }
      for (const match of text.matchAll(/innerWidth\s*[<>]=?\s*([\d.]+)/g)) {
        add(Number(match[1]), file);
      }
    });
  };
  walk(path.join(ROOT, "src"));
  return widths;
})();

test("every width a script asks about is a CSS breakpoint (S9)", () => {
  assert.ok(cssWidths.size > 0, "no width found in the stylesheet");
  const orphans = [...jsWidths]
    .filter(([width]) => !cssWidths.has(width))
    .map(([width, file]) => `${width}px (${file})`);
  assert.deepEqual(
    orphans,
    [],
    `JS widths with no CSS breakpoint:\n${orphans.join("\n")}`,
  );
});

test("the breakpoints are the module's, and the module is their only reader (S9)", () => {
  const moduleFile = "src/lib/breakpoints.js";
  assert.equal(themeDeclarations.get("--breakpoint-nav"), "48rem");
  assert.equal(themeDeclarations.get("--breakpoint-wide"), "56.25rem");

  const readers = [];
  const walk = (dir) => {
    readdirSync(dir).forEach((entry) => {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) return walk(full);
      if (!/\.(js|jsx)$/.test(full)) return;
      const file = path.relative(ROOT, full);
      if (file === moduleFile || /\.test\.js$/.test(file)) return;
      if (/--breakpoint-/.test(readFileSync(full, "utf8"))) readers.push(file);
    });
  };
  walk(path.join(ROOT, "src"));
  assert.deepEqual(readers, [], "only src/lib/breakpoints.js may read a --breakpoint-* token");

  // The module's fallbacks (what the server renders) are the tokens' values.
  const source = readFileSync(path.join(ROOT, moduleFile), "utf8");
  const declared = [...source.matchAll(/pixels\("(--breakpoint-[a-z]+)",\s*([\d.]+)\)/g)].map(
    ([, token, fallback]) => ({ token, fallback: Number(fallback) }),
  );
  assert.ok(declared.length > 0, "the module reads no breakpoint token");
  declared.forEach(({ token, fallback }) => {
    const value = themeDeclarations.get(token);
    assert.ok(value, `${token} is not declared in @theme`);
    const match = /^([\d.]+)(rem|px)$/.exec(value);
    assert.equal(toPixels(match[1], match[2]), fallback, `${token} and its fallback disagree`);
  });
});
