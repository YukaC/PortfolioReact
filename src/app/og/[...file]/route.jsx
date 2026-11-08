import { ImageResponse } from "next/og";
import {
  PERSON_JOB_TITLE,
  PERSON_LOCALITY,
  SITE_NAME,
  SITE_URL,
} from "@/data/constants";
import { translator } from "@/i18n/index.js";
import { SUPPORTED_LOCALES } from "@/i18n/locale";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "@/lib/seo";

/**
 * §24 S2 — the social card: `/og/en.png`, `/og/es.png`, `/og/pt.png`.
 *
 * The site used to hand `og:image` the square portrait, which every crawler
 * then cropped to a 1.91:1 box: a 640×640 face with the chin cut off, followed
 * by the *wrong* `og:image:alt` (it described the portrait under a card that no
 * longer existed). A `summary_large_image` card wants 1200×630 and it wants the
 * thing the page is about, so this route draws it: the wordmark, the role, the
 * city, the language and the address, in the site's own palette.
 *
 * Drawn with `next/og`'s `ImageResponse` and nothing else (no new dependency,
 * no network, no font download): the bundled default font is the fallback, and
 * the palette below is the only copy of `globals.css`'s tokens outside the
 * stylesheet — Satori cannot read a `var()`, and inlining the five hexes is
 * cheaper and more honest than a parallel token file nobody would keep in sync.
 * The portrait keeps the jobs it already had (`Person.image`,
 * `primaryImageOfPage`, the About section); it is only the card that changed.
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

/** `--color-ink`, `--color-mist`, `--color-sky`, `--color-paper`, `--color-mut`,
    `--color-coral` — read from `@theme` in `src/styles/globals.css`. */
const PALETTE = {
  ink: "#060b1a",
  mist: "#16233d",
  sky: "#8fcbff",
  paper: "#eef2ff",
  mut: "#c2cde4",
  coral: "#e2727f",
};

const HOST = SITE_URL.replace(/^https?:\/\//, "");

/** The three cards, generated with the rest of the static routes. */
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((lang) => ({ file: [`${lang}.png`] }));
}

/** `en.png` → `en`; anything else is not a card this site has. */
function localeFromSegment(segment) {
  const match = /^([a-z]{2})\.png$/.exec(String(segment ?? ""));
  return match && SUPPORTED_LOCALES.includes(match[1]) ? match[1] : null;
}

/**
 * `/og/{lang}.png` — a route handler, not a page: the response is the image
 * itself. It is named `GET` so the params from `generateStaticParams` are
 * prerendered at build time (a `default` export leaves Next without an HTTP
 * method, which marks the route dynamic).
 */
export async function GET(request, context) {
  const params = (await context?.params) ?? {};
  const lang = localeFromSegment(Array.isArray(params.file) ? params.file.join("/") : params.file);

  if (!lang) {
    return new Response("Not found", { status: 404 });
  }

  const { t } = translator(lang);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "68px 76px",
          backgroundColor: PALETTE.ink,
          backgroundImage: `radial-gradient(120% 120% at 10% 0%, ${PALETTE.mist} 0%, ${PALETTE.ink} 62%)`,
          color: PALETTE.paper,
        }}
      >
        {/* The address and the language, as the page's eyebrow does it. */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: PALETTE.sky,
          }}
        >
          <div style={{ display: "flex" }}>{HOST}</div>
          <div style={{ display: "flex" }}>{lang.toUpperCase()}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: -4,
              lineHeight: 1.05,
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 42, color: PALETTE.mut }}>
            {PERSON_JOB_TITLE}
          </div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 36, color: PALETTE.sky }}>
            {PERSON_LOCALITY}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 26,
            color: PALETTE.mut,
          }}
        >
          <div style={{ display: "flex", maxWidth: 900 }}>{t("meta.title")}</div>
          {/* The lattice, reduced to one row of its dots: the identity the page
              carries, at the only size a 630px card can hold it. */}
          <div style={{ display: "flex", alignItems: "center" }}>
            {Array.from({ length: 9 }, (_, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  marginLeft: 14,
                  borderRadius: 4,
                  backgroundColor: PALETTE.coral,
                  opacity: 0.75,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
  );
}
