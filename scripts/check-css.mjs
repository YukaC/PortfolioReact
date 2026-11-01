#!/usr/bin/env node
/**
 * `check:css` — the §13.3 S7 guard (audit.md §21.3 "Calidad", spec S11/S14).
 *
 * Four failures, each one a rule the migration is not allowed to break:
 *
 *   1. literal    a hex/rgb/hsl colour outside `@theme`, unless it is a custom
 *                 property definition or lives in a rule carrying
 *                 `/* literal: … *\/`. The grammar is the one
 *                 `src/lib/css-contract.test.js` already enforces, so the two
 *                 gates cannot disagree about what a literal is; the same rule
 *                 applies to `z-index`, whose ladder is semantic since S9;
 *   2. dead class a class written in `src/**\/*.jsx` with no rule anywhere in the
 *                 compiled stylesheet — the class of bug that leaves
 *                 `className="work-repo"` in the markup and nothing on screen;
 *   3. orphan     a `@theme` token with no consumer (`var(--token)` or the
 *                 utility it names) in `src/`. A `--breakpoint-*` is consumed
 *                 from a media query, where `var()` cannot go, so for that
 *                 namespace the consumer is the generated query itself;
 *   4. growth     the compiled stylesheet more than 5 % over the recorded
 *                 baseline in `scripts/css-budget.json`, and — since §14.3 gives
 *                 the layer its own ceiling — `@layer components` over the
 *                 `componentsBytes` recorded there. Both numbers are measured
 *                 from the source, so the guard never needs a build.
 *
 * The stylesheet is compiled in-process with the same `@tailwindcss/postcss`
 * plugin the app uses, so the check needs no build, no browser and no network,
 * and every number here is a function of the source alone.
 *
 * The baseline is the measured size at the moment the guard was introduced —
 * not a target. Two inherited deltas are recorded in `scripts/css-budget.json`
 * for the record: T1 (tokens + the `@supports` pairs Lightning CSS emits for
 * each `color-mix`) and T6 (the CSS lattice that replaced the shader's grid).
 *
 *   pnpm check:css
 *   pnpm check:css --json
 *
 * Exit codes: 0 clean · 1 a violation · 2 bad usage · 3 tooling missing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const CSS_FILE = path.join(ROOT, "src", "styles", "globals.css");
const BUDGET_FILE = path.join(ROOT, "scripts", "css-budget.json");

/**
 * Classes that are deliberately hooks and draw nothing of their own. Each one
 * needs a reason; anything else with no rule is a dead class.
 *
 * `.focus-ring` is the documented case: `globals.css` states that it "stays in
 * the markup as the intent of a call site" while the ring itself lives on the
 * global `:focus-visible` rule, precisely so two rule sets cannot drift apart
 * again. A class may not be justified by a comment in a `.jsx` file, though:
 * the reason has to live here, next to the check that reads it.
 */
const HOOK_CLASSES = new Map([
  ["focus-ring", "the ring lives on the global :focus-visible rule; the class only records intent"],
]);

const violations = [];

const add = (check, message) => violations.push({ check, message });

const fail = (code, message) => {
  console.error(`check:css — ${message}`);
  process.exit(code);
};

const parseArgs = (argv) => {
  const args = { json: false };
  for (const arg of argv) {
    if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") {
      console.log("uso: check:css [--json]");
      process.exit(0);
    } else if (arg.startsWith("-")) fail(2, `unknown argument: ${arg}`);
  }
  return args;
};

/* ------------------------------------------------------------------- the sources */

const css = readFileSync(CSS_FILE, "utf8");
const cssLines = css.split("\n");

/** Every file under src/, with its text, so the checks share one walk. */
const sources = (() => {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(jsx|js|css)$/.test(full)) {
        found.push({ file: path.relative(ROOT, full), text: readFileSync(full, "utf8") });
      }
    }
  };
  walk(path.join(ROOT, "src"));
  return found;
})();

const jsxSources = sources.filter((source) => source.file.endsWith(".jsx"));
const corpus = sources
  .filter((source) => !/\.test\.js$/.test(source.file))
  .map((source) => source.text)
  .join("\n");

/* ------------------------------------------------------------- the compiled sheet */

let compiled = "";
try {
  const postcss = require("postcss");
  const tailwind = require("@tailwindcss/postcss");
  compiled = (await postcss([tailwind()]).process(css, { from: CSS_FILE })).css;
} catch (error) {
  fail(3, `cannot compile src/styles/globals.css: ${error.message}`);
}

const compiledBytes = Buffer.byteLength(compiled);

/** The `@layer components { … }` body, which §14 gives its own 28 KB ceiling. */
const componentsBytes = (() => {
  const at = compiled.indexOf("@layer components");
  if (at === -1) return 0;
  const open = compiled.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < compiled.length; i += 1) {
    if (compiled[i] === "{") depth += 1;
    else if (compiled[i] === "}") {
      depth -= 1;
      if (depth === 0) return Buffer.byteLength(compiled.slice(open + 1, i));
    }
  }
  return 0;
})();

/* -------------------------------------------------------------------- 1. literals */

/**
 * Comments are blanked for the structural read (line breaks kept, so a comment
 * can never quote a rule into existence) but the raw text is what the literal
 * check scans, because `/* literal: … *\/` is exactly the marker it looks for.
 */
const bare = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
const bareLines = bare.split("\n");

const themeLines = (() => {
  const start = cssLines.findIndex((line) => /^@theme\b/.test(line));
  if (start === -1) fail(2, "@theme block not found in globals.css");
  const end = cssLines.findIndex((line, i) => i > start && /^\}/.test(line));
  if (end === -1) fail(2, "@theme block is not closed at column 0");
  return { start: start + 1, end: end + 1 };
})();

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

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

bareLines.forEach((line, i) => {
  const lineNumber = i + 1;
  if (lineNumber >= themeLines.start && lineNumber <= themeLines.end) return;
  if (!COLOR_LITERAL.test(line)) return;
  if (/^\s*--[a-z0-9-]+\s*:/.test(cssLines[i])) return;
  if (enclosingRule(i).includes("/* literal:")) return;
  add("literal", `${path.relative(ROOT, CSS_FILE)}:${lineNumber} ${line.trim()}`);
});

/*
 * The z ladder (§14.4, S9): `--z-field/main/drawer/preview/nav/progress/skip`
 * are the layers of the page, so a raw number on `z-index` is a literal in the
 * same sense a hex colour is — either the rule is a layer and belongs in the
 * token block, or it is a local stack inside an element that already isolates
 * its own painting and says so with `/* literal: … *\/`.
 */
const Z_LITERAL = /z-index:\s*(-?\d+)/;

bareLines.forEach((line, i) => {
  const lineNumber = i + 1;
  if (lineNumber >= themeLines.start && lineNumber <= themeLines.end) return;
  if (!Z_LITERAL.test(line)) return;
  if (enclosingRule(i).includes("/* literal:")) return;
  add("z-literal", `${path.relative(ROOT, CSS_FILE)}:${lineNumber} ${line.trim()}`);
});

/* ------------------------------------------------------------------ 2. dead classes */

/** The index of the brace that closes the block opened at `open`, or -1. */
function matchBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' || char === "'" || char === "`") {
      const end = closingQuote(text, i);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** The index of the quote that closes the literal opened at `open`, or -1. */
function closingQuote(text, open) {
  const quote = text[open];
  for (let i = open + 1; i < text.length; i += 1) {
    if (text[i] === "\\") {
      i += 1;
      continue;
    }
    if (text[i] === quote) return i;
  }
  return -1;
}

/**
 * Every literal inside a `className={…}` expression, as segments that know
 * whether they touch an interpolation. `field-blob-${index}` must contribute
 * `field-blob` and not the partial `field-blob-`.
 */
function readSegments(expression) {
  const segments = [];
  let i = 0;
  while (i < expression.length) {
    const char = expression[i];
    if (char === '"' || char === "'") {
      const end = closingQuote(expression, i);
      if (end === -1) break;
      segments.push({ text: expression.slice(i + 1, end), dropFirst: false, dropLast: false });
      i = end + 1;
      continue;
    }
    if (char === "`") {
      let segment = "";
      let afterInterpolation = false;
      i += 1;
      while (i < expression.length) {
        const inner = expression[i];
        if (inner === "`") {
          segments.push({ text: segment, dropFirst: afterInterpolation, dropLast: false });
          i += 1;
          break;
        }
        if (inner === "$" && expression[i + 1] === "{") {
          segments.push({ text: segment, dropFirst: afterInterpolation, dropLast: true });
          const close = matchBrace(expression, i + 1);
          if (close === -1) return segments;
          segments.push(...readSegments(expression.slice(i + 2, close)));
          i = close + 1;
          segment = "";
          afterInterpolation = true;
          continue;
        }
        if (inner === "\\") {
          segment += expression[i + 1] ?? "";
          i += 2;
          continue;
        }
        segment += inner;
        i += 1;
      }
      continue;
    }
    i += 1;
  }
  return segments;
}

/**
 * The right-hand side of a comparison is a value, not a class list:
 * `status === "copied"` and `direction === "d"` are the two cases in this code
 * base, and neither word is a class. Blanking them before the literals are read
 * keeps the extraction honest instead of teaching it a list of words to ignore.
 */
const blankComparisons = (expression) =>
  expression.replace(/(?:[!=]==?)\s*(["'])(?:(?!\1).)*\1/g, "compared");

/** Every class token written in a JSX file, with the file that writes it. */
const classTokens = (() => {
  const tokens = new Map();
  const push = (segments, file) => {
    for (const segment of segments) {
      const parts = segment.text.split(/\s+/).filter(Boolean);
      if (segment.dropFirst) parts.shift();
      if (segment.dropLast) parts.pop();
      for (const token of parts) {
        if (!/^[A-Za-z0-9_:[\]()./%#,+*&>~=$'"!-]+$/.test(token)) continue;
        if (!tokens.has(token)) tokens.set(token, file);
      }
    }
  };

  for (const source of jsxSources) {
    const text = source.text;
    for (const match of text.matchAll(/className\s*=\s*"([^"]*)"/g)) {
      push([{ text: match[1], dropFirst: false, dropLast: false }], source.file);
    }
    const openers = /className\s*=\s*\{/g;
    let match = openers.exec(text);
    while (match !== null) {
      const open = match.index + match[0].length - 1;
      const close = matchBrace(text, open);
      if (close !== -1) {
        push(readSegments(blankComparisons(text.slice(open + 1, close))), source.file);
      }
      match = openers.exec(text);
    }
  }
  return tokens;
})();

/**
 * The compiled stylesheet with the escapes removed, so a class is looked up as
 * the text a reader writes in JSX (`hover:text-white`), not as the escaped
 * selector CSS has to emit (`.hover\:text-white:hover`). Stripping backslashes
 * can only create matches for the search, never hide one.
 */
const searchable = compiled.replace(/\\/g, "");

const hasRule = (token) => {
  const needle = `.${token}`;
  let index = searchable.indexOf(needle);
  while (index !== -1) {
    const next = searchable[index + needle.length] ?? "";
    if (!/[A-Za-z0-9_-]/.test(next)) return true;
    index = searchable.indexOf(needle, index + 1);
  }
  return false;
};

for (const [token, file] of classTokens) {
  if (HOOK_CLASSES.has(token)) continue;
  // An arbitrary z value is the same literal as a hex colour in a class: the
  // ladder is `z-<name>` from `--z-*`, and `z-[3]` is a number nobody can find.
  if (/(?:^|:)z-\[\s*-?\d/.test(token)) {
    add("z-literal", `${file}: "${token}" — use a --z-* token instead of an arbitrary value`);
    continue;
  }
  if (hasRule(token)) continue;
  add("dead-class", `${file}: "${token}" has no rule in the compiled stylesheet`);
}

/* ----------------------------------------------------------------- 3. orphan tokens */

const themeTokens = [];
const themeValues = new Map();
for (let i = themeLines.start; i < themeLines.end - 1; i += 1) {
  const declaration = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/.exec(cssLines[i]);
  if (!declaration) continue;
  themeTokens.push(declaration[1]);
  themeValues.set(declaration[1], declaration[2]);
}

/** The sheet without its `@theme` block: a token does not consume itself. */
const cssOutsideTheme = [
  ...cssLines.slice(0, themeLines.start - 1),
  ...cssLines.slice(themeLines.end),
].join("\n");

for (const token of themeTokens) {
  const namespace = /^--([a-z0-9]+)-/.exec(token)?.[1] ?? "";
  const suffix = token.replace(/^--[a-z0-9]+-/, "");
  const readByVar = new RegExp(`var\\(\\s*${token}\\b`).test(corpus) || new RegExp(`var\\(\\s*${token}\\b`).test(cssOutsideTheme);
  const usedAsUtility = [...classTokens.keys()].some(
    (name) => name === `${namespace}-${suffix}` || name.endsWith(`-${suffix}`),
  );
  // A breakpoint is consumed from a media query, where `var()` cannot go: the
  // consumer is the query Tailwind generates from the token, so the check reads
  // the compiled sheet and looks for the token's own value inside an `@media`.
  // A breakpoint no variant and no script asks for is still an orphan.
  const declaredValue = themeValues.get(token);
  const usedAsBreakpoint =
    namespace === "breakpoint" &&
    Boolean(declaredValue && new RegExp(`@media[^{]*\\b${declaredValue.trim()}\\b`).test(compiled));
  if (!readByVar && !usedAsUtility && !usedAsBreakpoint) {
    add("orphan-token", `${token} (${namespace}) has no consumer in src/`);
  }
}

/* ------------------------------------------------------------------- 4. css growth */

const budget = (() => {
  try {
    return JSON.parse(readFileSync(BUDGET_FILE, "utf8"));
  } catch (error) {
    fail(3, `cannot read ${path.relative(ROOT, BUDGET_FILE)}: ${error.message}`);
  }
})();

const allowance = budget.growthAllowance ?? 0.05;
const ceiling = Math.round((budget.compiledBytes ?? 0) * (1 + allowance));
const growth = budget.compiledBytes ? compiledBytes / budget.compiledBytes - 1 : 0;

if (compiledBytes > ceiling) {
  add(
    "growth",
    `compiled CSS is ${compiledBytes} B, ${(growth * 100).toFixed(2)} % over the recorded ${budget.compiledBytes} B ` +
      `(ceiling ${ceiling} B, allowance ${(allowance * 100).toFixed(0)} %)`,
  );
}

/*
 * The layer's own ceiling (§14.3, spec S14: `@layer components` ≤ 28 KB). It is
 * a separate number from the 5 % growth allowance above because the two measure
 * different things: the sheet may grow while the layer that is supposed to be
 * shrinking grows with it. The recorded figure is the measured size at the
 * moment the ceiling was enforced, so the check fails on the next byte over —
 * a layer that needs to grow has to say why in `scripts/css-budget.json` first.
 */
const componentsCeiling = budget.componentsCeiling ?? budget.componentsBytes;

if (typeof componentsCeiling === "number" && componentsBytes > componentsCeiling) {
  add(
    "components-growth",
    `@layer components is ${componentsBytes} B, over the recorded ceiling of ${componentsCeiling} B ` +
      `(§14.3: 28 KB) — move prose out of the layer or move a recipe to @utility`,
  );
}

/* ------------------------------------------------------------------------- report */

const args = parseArgs(process.argv.slice(2));

const report = {
  compiledBytes,
  componentsBytes,
  baseline: { bytes: budget.compiledBytes, allowance, history: budget.history },
  componentsCeiling,
  growthPct: Number((growth * 100).toFixed(2)),
  stats: {
    themeTokens: themeTokens.length,
    jsxClasses: classTokens.size,
    hookClasses: [...HOOK_CLASSES.keys()],
  },
  violations,
};

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    `\ncompiled CSS ${compiledBytes} B · @layer components ${componentsBytes} B (ceiling ${componentsCeiling ?? "not recorded"} B) · ` +
      `baseline ${budget.compiledBytes} B (+${(growth * 100).toFixed(2)} %, ceiling +${(allowance * 100).toFixed(0)} %)`,
  );
  console.log(
    `sources: ${themeTokens.length} @theme token(s) · ${classTokens.size} class token(s) in JSX · ` +
      `${HOOK_CLASSES.size} documented hook class(es)\n`,
  );

  if (violations.length === 0) {
    console.log(
      "OK — no literal colour, no z literal, no dead class, no orphan token, no size drift",
    );
  } else {
    for (const violation of violations) {
      console.log(`FAIL ${violation.check} — ${violation.message}`);
    }
    const byCheck = violations.reduce((counts, violation) => {
      counts[violation.check] = (counts[violation.check] ?? 0) + 1;
      return counts;
    }, {});
    console.log(
      `\nRESUMEN: ${violations.length} violation(s) — ${Object.entries(byCheck)
        .map(([check, count]) => `${count} ${check}`)
        .join(" · ")}`,
    );
  }
}

if (violations.length > 0) process.exitCode = 1;
