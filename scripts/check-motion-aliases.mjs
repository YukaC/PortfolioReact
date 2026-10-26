#!/usr/bin/env node
/**
 * GSAP reset-target guard — static, no browser.
 *
 * `gsap.quickTo()` is `gsap.to({ prop: "+=0.1", paused: true })` plus
 * `tween.resetTo(prop, …)`, and `resetTo()` can only rewrite a PropTween that already
 * exists under that exact name (`_updatePropTweens`, gsap-core.js). CSSPlugin declares
 * `_propertyAliases` and expands a few properties before building those PropTweens, so a
 * `quickTo()`/`resetTo()` on an alias finds nothing: GSAP re-inits the tween, warns
 * "not eligible for reset" once per call, and animates nothing. Footer.jsx shipped that
 * for `scale` — every pointer frame, a warning and no motion.
 *
 * The alias list is read from the installed GSAP, so this guard follows the dependency
 * instead of keeping a hardcoded copy that rots.
 *
 * Exit codes: 0 clean · 1 violation · 2 usage this guard cannot prove · 3 tooling missing.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_PLUGIN = path.join(ROOT, "node_modules", "gsap", "CSSPlugin.js");
const SCAN_ROOTS = [path.join(ROOT, "src")];
const SCANNED_EXTENSIONS = new Set([".js", ".jsx", ".mjs"]);
const RESET_CALLS = { quickTo: 1, resetTo: 0 };

const violations = [];
const unproven = [];

function fail(code, message) {
  console.error(`check-motion-aliases: ${message}`);
  process.exit(code);
}

/** Property aliases CSSPlugin expands before the PropTweens are built. */
function readAliases() {
  if (!existsSync(CSS_PLUGIN)) fail(3, `gsap not installed: ${CSS_PLUGIN} is missing`);

  const source = readFileSync(CSS_PLUGIN, "utf8");
  const block = source.match(/_propertyAliases\s*=\s*\{([\s\S]*?)\n\s*\}[,;]/);
  if (!block) fail(3, "could not find _propertyAliases in gsap/CSSPlugin.js");

  const aliases = new Map();
  for (const [, name, expansion] of block[1].matchAll(/([A-Za-z_$][\w$]*)\s*:\s*"([^"]*)"/g)) {
    aliases.set(name, expansion);
  }
  if (aliases.size === 0) fail(3, "_propertyAliases parsed as empty");

  return aliases;
}

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (SCANNED_EXTENSIONS.has(path.extname(entry))) {
      yield full;
    }
  }
}

/** Raw arguments of the call whose "(" sits at `open`, split on top-level commas. */
function callArguments(source, open) {
  const args = [];
  let depth = 0;
  let current = "";
  let quote = null;

  for (let i = open + 1; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (char === "\\") {
        current += char + source[i + 1];
        i += 1;
        continue;
      }
      current += char;
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) {
        args.push(current.trim());
        return args;
      }
      depth -= 1;
    } else if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  return args;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

/** Same text with comments blanked out, so prose about `quickTo()` is not scanned. */
function stripComments(source) {
  let out = "";
  let index = 0;
  let quote = null;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      out += char;
      index += 1;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") {
        out += " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      out += "  ";
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) {
        out += source[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      out += "  ";
      index += 2;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

function scan(file, aliases) {
  const source = stripComments(readFileSync(file, "utf8"));
  const relative = path.relative(ROOT, file);

  for (const [call, propertyArg] of Object.entries(RESET_CALLS)) {
    const pattern = new RegExp(`\\b${call}\\(`, "g");
    for (const match of source.matchAll(pattern)) {
      const open = match.index + match[0].length - 1;
      const args = callArguments(source, open);
      const raw = args[propertyArg];
      const where = `${relative}:${lineOf(source, match.index)}`;

      if (raw === undefined) {
        unproven.push(`${where} ${call}() without a property argument`);
        continue;
      }

      const literal = /^(["'`])([^"'`]*)\1$/.exec(raw);
      if (!literal) {
        unproven.push(`${where} ${call}() property is not a string literal: ${raw}`);
        continue;
      }

      const property = literal[2];
      if (aliases.has(property)) {
        violations.push({
          where,
          call,
          property,
          expansion: aliases.get(property),
        });
      }
    }
  }
}

const aliases = readAliases();

for (const root of SCAN_ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) scan(file, aliases);
}

const aliasList = [...aliases]
  .map(([name, expansion]) => `${name} → ${expansion}`)
  .join(" · ");

if (violations.length > 0) {
  console.error(
    `check-motion-aliases: ${violations.length} reset target(s) use a CSSPlugin alias.`,
  );
  for (const { where, call, property, expansion } of violations) {
    console.error(
      `  ${where} ${call}(…, "${property}") — "${property}" expands to ${expansion}, so a reset finds no PropTween of its own and animates nothing.`,
    );
    console.error(`    Fix: target ${expansion.split(",").join(" and ")} instead, or drop the tween.`);
  }
  process.exit(1);
}

if (unproven.length > 0) {
  console.error(
    `check-motion-aliases: ${unproven.length} call(s) this guard cannot prove:`,
  );
  for (const entry of unproven) console.error(`  ${entry}`);
  console.error(
    "  Fix: pass the property as a string literal so the alias guard can see it.",
  );
  process.exit(2);
}

console.log(
  `check-motion-aliases: clean — no reset target uses a CSSPlugin alias (${aliasList}).`,
);
