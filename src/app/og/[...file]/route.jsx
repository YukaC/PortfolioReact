import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { PERSON_LOCALITY, SITE_NAME, SITE_URL } from "@/data/constants";
import { translator } from "@/i18n/index.js";
import { SUPPORTED_LOCALES } from "@/i18n/locale";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/seo";

/**
 * §24 S2 — the social card: `/og/en.png`, `/og/es.png`, `/og/pt.png`.
 *
 * A `summary_large_image` card wants 1200×630 and the thing the page is about,
 * so this route draws the hero as the page shows it: the status line, the name,
 * the role, and the statement with its accent in sky — standing on the field's
 * cobalt light and the coral 48px lattice, which is what makes the card read as
 * this site and not as a template.
 *
 * Drawn with `next/og`'s `ImageResponse` and no network: the two faces the
 * hero uses (Space Grotesk 500, Manrope 400; OFL) sit next to this file as TTF,
 * because Satori reads TrueType and not the woff2 `next/font` ships, and a build
 * must not depend on reaching Google. The palette below is the only copy of
 * `globals.css`'s tokens outside the stylesheet — Satori cannot read a `var()`.
 * The portrait keeps the jobs it already had (`Person.image`,
 * `primaryImageOfPage`, the About section).
 *
 * Prerendered at build for the three languages, so the response is a static PNG
 * with a long cache life, not a per-request render.
 *
 * The segment is a catch-all (`[...file]`) rather than `[lang].png` because
 * Next's router only treats a segment that is *entirely* a placeholder as
 * dynamic: `app/og/[lang].png/route.jsx` compiles to the literal path
 * `/og/[lang].png`, so `/og/en.png` is a 404 and the static params are never
 * consulted (measured). The catch-all keeps the URL the audit asks for —
 * `/og/{lang}.png` — and hands the handler the one segment it has to read.
 */

export const dynamic = "force-static";
export const dynamicParams = false;

/** `--color-*` from `@theme` in `src/styles/globals.css`. */
const PALETTE = {
  ink: "#060b1a",
  sky: "#8fcbff",
  paper: "#eef2ff",
  mut: "#c2cde4",
  dim: "#9eabc4",
  coral: "#e2727f",
  live: "#4ade80",
};

const HOST = SITE_URL.replace(/^https?:\/\//, "");

/** The lattice: one dot per 48px cell, centred at `n * 48 + 24`, the pale core
    every fourth cell — the same grid `.bocanada-lattice` tiles on the page. */
const CELL = 48;
const LATTICE = Array.from(
  { length: Math.ceil(OG_IMAGE_WIDTH / CELL) * Math.ceil(OG_IMAGE_HEIGHT / CELL) },
  (_, index) => {
    const columns = Math.ceil(OG_IMAGE_WIDTH / CELL);
    const cx = index % columns;
    const cy = Math.floor(index / columns);
    return { cx, cy, core: cx % 4 === 0 && cy % 4 === 0 };
  },
);

/** A few strikes at whole cells, kept off the copy. */
const FLARES = [
  { cx: 19, cy: 2, size: 34 },
  { cx: 23, cy: 9, size: 26 },
  { cx: 15, cy: 11, size: 22 },
];

const FONT_DIR = path.join(process.cwd(), "src/app/og/[...file]");
const fonts = Promise.all([
  readFile(path.join(FONT_DIR, "SpaceGrotesk-Medium.ttf")),
  readFile(path.join(FONT_DIR, "Manrope-Regular.ttf")),
]).then(([grotesk, manrope]) => [
  { name: "Space Grotesk", data: grotesk, weight: 500, style: "normal" },
  { name: "Manrope", data: manrope, weight: 400, style: "normal" },
]);

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ file: [`${lang}.png`] }));
}

function localeFromSegment(segment) {
  const match = /^([a-z]{2})\.png$/.exec(String(segment ?? ""));
  return match && SUPPORTED_LOCALES.includes(match[1]) ? match[1] : null;
}

/** The statement's lines, each split into the plain words and the accented
    tail, the way `SplitHeading` marks the `em`. */
function statementLines(title, accent) {
  return title.split("\n").map((line) => {
    const at = accent ? line.indexOf(accent) : -1;
    return at === -1
      ? { plain: line, accent: "" }
      : { plain: line.slice(0, at), accent: line.slice(at) };
  });
}

export async function GET(request, context) {
  const params = (await context?.params) ?? {};
  const lang = localeFromSegment(Array.isArray(params.file) ? params.file.join("/") : params.file);
  if (!lang) {
    return new Response("Not found", { status: 404 });
  }

  const { t } = translator(lang);
  const role = t("hero.role");
  const lines = statementLines(t("hero.title"), t("hero.accent"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: PALETTE.ink,
          // `.bocanada-field`'s three stops.
          backgroundImage:
            "radial-gradient(ellipse 70% 48% at 50% 6%, rgba(150,210,255,0.15), transparent 58%), radial-gradient(ellipse 88% 66% at 72% 40%, rgba(2,60,140,0.55), transparent 64%), linear-gradient(180deg, #081430 0%, #050d20 54%, #04091a 100%)",
          fontFamily: "Manrope",
          color: PALETTE.paper,
        }}
      >
        {LATTICE.map(({ cx, cy, core }) => (
          <div
            key={`${cx}x${cy}`}
            style={{
              position: "absolute",
              left: cx * CELL + 24 - 2,
              top: cy * CELL + 24 - 2,
              width: 4,
              height: 4,
              borderRadius: 4,
              backgroundColor: core ? "#ffe2e4" : PALETTE.coral,
              opacity: core ? 0.6 : 0.7,
            }}
          />
        ))}
        {FLARES.map(({ cx, cy, size }) => (
          <div
            key={`flare-${cx}x${cy}`}
            style={{
              position: "absolute",
              left: cx * CELL + 24 - size / 2,
              top: cy * CELL + 24 - size / 2,
              width: size,
              height: size,
              borderRadius: size,
              backgroundImage: `radial-gradient(circle, rgba(250,220,224,0.9) 0%, rgba(226,114,127,0.45) 32%, transparent 62%)`,
            }}
          />
        ))}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "0 80px",
            // The copy halo the site gives every line standing on the field.
            textShadow: "0 1px 2px rgba(3,8,22,0.9), 0 0 24px rgba(3,8,22,0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: PALETTE.mut }}>
            <div
              style={{
                display: "flex",
                width: 11,
                height: 11,
                marginRight: 14,
                borderRadius: 11,
                backgroundColor: PALETTE.live,
                boxShadow: "0 0 0 6px rgba(74,222,128,0.16)",
              }}
            />
            {t("hero.status")}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 26,
              fontFamily: "Space Grotesk",
              fontSize: 96,
              letterSpacing: -3.8,
              lineHeight: 1.02,
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 32, color: PALETTE.dim }}>
            {`${role.charAt(0).toUpperCase()}${role.slice(1)} · ${PERSON_LOCALITY}`}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 36,
              fontFamily: "Space Grotesk",
              fontSize: 54,
              letterSpacing: -1.6,
              lineHeight: 1.12,
            }}
          >
            {lines.map((line) => (
              <div key={line.plain + line.accent} style={{ display: "flex" }}>
                {line.plain ? <span style={{ whiteSpace: "pre" }}>{line.plain}</span> : null}
                {line.accent ? <span style={{ color: PALETTE.sky }}>{line.accent}</span> : null}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 80,
            bottom: 52,
            display: "flex",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: PALETTE.sky,
          }}
        >
          {HOST}
        </div>
      </div>
    ),
    { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT, fonts: await fonts },
  );
}
