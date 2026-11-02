/**
 * Measure the site on a real phone, from the machine that serves it.
 *
 * A phone cannot be driven by Playwright without a cable, and a cable is not
 * always there. So this is the other route: a reverse proxy that serves the site
 * unchanged except for one deferred script, which measures the page *where it
 * actually runs* — real GPU, real DPR, real refresh rate — and posts the numbers
 * back here.
 *
 * What it can see: frame pacing during a real scroll, long tasks, LCP/CLS, the
 * reveal timing of every block, the device's own numbers, and — from the anomaly
 * scan — which node flickered, vanished, moved on its own, sat under something
 * else, or was re-rendered in a loop. The field block answers the question a phone
 * is uniquely good at: whether the background holds still, drifts with the content,
 * snaps or flickers, layer by layer, while a finger scrolls it. What it cannot see is
 * anything that lives in the DevTools protocol (compositor layers, overdraw):
 * that needs `adb` and `--remote-debugging-port`. The proxy measures the phone;
 * it does not pretend to measure its compositor.
 *
 *   node scripts/perf/remote-proxy.mjs --target http://127.0.0.1:4173 --port 4300
 *   # then open http://<this machine>:4300/es on the phone, tap "Empezar", scroll,
 *   # tap "Terminar y enviar"
 *
 * The measuring script itself is scripts/perf/meter.js, served at /__perf/meter.js.
 *
 * Exit codes: 0 ran · 2 bad usage · 3 the target never answered.
 */

import http from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { parseArgs, fail } from "./lib.mjs";

const args = parseArgs(
  process.argv.slice(2),
  {
    target: "http://127.0.0.1:4173",
    port: 4300,
    host: "0.0.0.0",
    out: "/tmp/perf-remote",
  },
  ["help"],
);

if (args.help) {
  console.log(`remote-proxy — measure the site on a real phone through an injected meter.

usage: node scripts/perf/remote-proxy.mjs [--target <url>] [--port <n>] [--host <ip>] [--out <dir>]

  --target <url>   the site to serve (default http://127.0.0.1:4173, a production build)
  --port <n>       port this proxy listens on (default 4300)
  --host <ip>      0.0.0.0 keeps it reachable over the tailnet (default)
  --out <dir>      where the posted reports land (default /tmp/perf-remote)

The meter adds one rAF loop, one 100 ms sampler, a 20 Hz field pass and one
shadow-DOM badge, and it times its own passes: the report's "meter" line says how
much of the frame cost is the probe and how much is the site.`);
  process.exit(0);
}

const target = new URL(args.target);
const send = target.protocol === "https:" ? httpsRequest : httpRequest;

/**
 * The meter is a real file, not a template inside this one. As a template every
 * backtick needed escaping, one miss reached the phone as a SyntaxError and the
 * badge never appeared — no data and nothing in this terminal to say why. A file
 * can be parsed by `node --check`, by the guard in `main()`, and by the phone.
 */
const METER_PATH = new URL("../../src/perf/meter.js", import.meta.url);
const METER = readFileSync(METER_PATH, "utf8");

const HTML_INJECT = `<script src="/__perf/meter.js" defer></script>`;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const summarize = (r) => {
  const f = r.frames;
  const anomalies = r.anomalies || { total: 0, byKind: {}, items: [] };
  const byKind = Object.entries(anomalies.byKind || {}).map(([kind, count]) => `${kind} ${count}`);
  const items = (anomalies.items || [])
    .slice(0, 10)
    .map((item) => `              ${item.kind} · ${item.selector} · ${item.label || "-"} · ${item.at} ms`);
  const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
  /* The meter's own bill, right under the frames it is charged against: this is the
     line that says whether the phone was slow or the probe was. An artifact from
     before the meter measured itself has no block, and says so. */
  const meter = r.meter;
  const meterLine =
    meter && Number.isFinite(meter.costMsPerSecond)
      ? `meter         ${meter.costMsPerSecond} ms/s · ${meter.costPctOfWindow} % de la ventana · peor pase ${meter.longestPassMs} ms · panel ${r.window && r.window.panelOn === false ? "OFF" : "ON"}`
      : "meter         n/a";
  const field = r.field;
  const fieldLayers = field && Array.isArray(field.layers) ? field.layers : [];
  const fieldLines = [
    field && fieldLayers.length
      ? `field         ${field.verdict} · scroll ${field.scrollRange.from}→${field.scrollRange.to} px`
      : `field         ${field && field.verdict === "disabled" ? "disabled (panel apagado)" : "none"}`,
    ...fieldLayers.map(
      (layer) => `              ${layer.name} · ${layer.verdict} · Δview ${signed(layer.deltaViewport)}px`,
    ),
  ];
  const lines = [
    `device        ${r.ua.replace(/^.*?\(/, "(").slice(0, 70)}`,
    `screen        ${r.screen.w}x${r.screen.h} @${r.screen.dpr}x · viewport ${r.viewport.w}x${r.viewport.h}`,
    `refresh       ~${r.refreshHz} Hz (${r.refreshMs} ms/frame, budget ${f.budget} ms)`,
    `frames        ${f.n} · p50 ${f.p50} · p95 ${f.p95} · p99 ${f.p99} · max ${f.max} ms`,
    meterLine,
    `over budget   ${f.overBudget} (${(((f.overBudget / Math.max(f.n, 1)) * 100) || 0).toFixed(1)} %) · >32ms ${f.over32} · >50ms ${f.over50}`,
    `long tasks    ${r.longtasks.count} · ${r.longtasks.totalMs} ms (max ${r.longtasks.maxMs} ms)`,
    `vitals        FCP ${r.vitals.fcp} · LCP ${r.vitals.lcp} · CLS ${r.vitals.cls}`,
    `reveals       ${r.reveals.revealed}/${r.reveals.total} revealed · stuck in view ${r.reveals.stuckInView}`,
    `resources     ${r.resources.count} · ${r.resources.kb} KB (js ${r.resources.jsKb} KB)`,
    `canvas        ${r.canvas} · cores ${r.cores ?? "n/a"} · mem ${r.memoryGb ?? "n/a"} GB`,
  ];
  /* Attribution: the frame numbers say how slow, this block says which object. */
  lines.push(`anomalies     ${anomalies.total ? byKind.join(" · ") : "none"}`);
  if (anomalies.total) lines.push(...items);
  /* The background is its own question, so it gets its own block. */
  lines.push(...fieldLines);
  return lines.join("\n");
};

/* --------------------------------------------------------------------- server */

const proxy = http.createServer(async (req, res) => {
  if (req.url.startsWith("/__perf/meter.js")) {
    /* The meter is 66 KB of source and it is served on every navigation, so it is
       compressed like anything else here: an instrument that adds 66 KB to the
       page it measures is measuring a heavier page. */
    const accepts = String(req.headers["accept-encoding"] || "");
    const plain = Buffer.from(METER, "utf8");
    let body = plain;
    const headers = {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
      "service-worker-allowed": "/",
    };
    if (/\bbr\b/.test(accepts)) {
      const compressed = brotliCompressSync(plain);
      if (compressed.length < plain.length) {
        body = compressed;
        headers["content-encoding"] = "br";
      }
    } else if (/\bgzip\b/.test(accepts)) {
      const compressed = gzipSync(plain);
      if (compressed.length < plain.length) {
        body = compressed;
        headers["content-encoding"] = "gzip";
      }
    }
    headers["content-length"] = body.length;
    res.writeHead(200, headers);
    res.end(body);
    return;
  }

  if (req.url.startsWith("/__perf/report") && req.method === "POST") {
    try {
      const report = JSON.parse(await readBody(req));
      mkdirSync(args.out, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = `${args.out}/phone-${stamp}.json`;
      writeFileSync(file, JSON.stringify(report, null, 2));
      console.log(`\n=== report from the phone (${report.url}) ===`);
      console.log(summarize(report));
      console.log(`artifact      ${file}\n`);
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');
    } catch (error) {
      console.error("bad report:", error.message);
      res.writeHead(400);
      res.end('{"ok":false}');
    }
    return;
  }

  /**
   * Only the document is asked for uncompressed, because an HTML body has to be
   * rewritten to inject the meter.
   *
   * This used to be `identity` for every request, and it was the most expensive bug
   * the proxy had: every script, stylesheet and font crossed the wire raw. Measured
   * against the same build (2 nov 2026): the page weighed 861 KB through the proxy
   * and 293 KB served directly, and one HTML document 153 KB instead of 25 KB. Every
   * phone report taken through it measured a site 2.9x heavier than the one people
   * open — FCP 1672 ms on a phone against 108 ms on the same build in a lab, with the
   * tail of the frame distribution inflated by the extra bytes and their decode.
   *
   * So the request keeps the browser's `accept-encoding` unless the browser says it
   * is asking for a document (`sec-fetch-dest: document`, or `accept: text/html` for
   * clients that do not send the hint). Assets then stream compressed, untouched.
   */
  const wantsDocument = () => {
    try {
      const dest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
      if (dest) return dest === "document";
      return String(req.headers.accept || "").includes("text/html");
    } catch {
      return true;
    }
  };

  const upstream = send(
    {
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: target.host,
        ...(wantsDocument() ? { "accept-encoding": "identity" } : {}),
      },
    },
    (upstreamRes) => {
      const type = upstreamRes.headers["content-type"] || "";
      const isHtml = type.includes("text/html");

      if (!isHtml) {
        res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
        upstreamRes.pipe(res);
        return;
      }

      const chunks = [];
      upstreamRes.on("data", (c) => chunks.push(c));
      upstreamRes.on("end", () => {
        let html = Buffer.concat(chunks).toString("utf8");
        html = html.includes("</body>")
          ? html.replace("</body>", `${HTML_INJECT}</body>`)
          : html + HTML_INJECT;
        const headers = { ...upstreamRes.headers };
        delete headers["content-encoding"];
        delete headers["content-length"];
        delete headers["transfer-encoding"];

        /* It goes back out compressed, because the body had to be *un*compressed only
           to carry the injected script: served raw, this document was 153 KB against
           the 25 KB the target hands a browser, and a phone parsed the difference on
           every navigation. The client's own `accept-encoding` decides, so a client
           that asks for nothing still gets plain text. */
        const accepts = String(req.headers["accept-encoding"] || "");
        const plain = Buffer.byteLength(html);
        let body = Buffer.from(html, "utf8");
        if (/\bbr\b/.test(accepts)) {
          const compressed = brotliCompressSync(body);
          if (compressed.length < plain) {
            body = compressed;
            headers["content-encoding"] = "br";
          }
        } else if (/\bgzip\b/.test(accepts)) {
          const compressed = gzipSync(body);
          if (compressed.length < plain) {
            body = compressed;
            headers["content-encoding"] = "gzip";
          }
        }
        headers["content-length"] = body.length;
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(body);
      });
    },
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain" });
    res.end(`probe proxy: ${error.message}`);
  });

  req.pipe(upstream);
});

const probeTarget = () =>
  new Promise((resolve) => {
    const req = send(
      { hostname: target.hostname, port: target.port || 80, path: "/", method: "HEAD" },
      (r) => {
        r.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.end();
  });

const main = async () => {
  /* Fail here, loudly, instead of on the phone with a blank page and a console the
     reader cannot open. This is the guard the template never had. */
  try {
    new Function(readFileSync(METER_PATH, "utf8"));
  } catch (error) {
    fail(1, `meter.js does not parse: ${error.message}`);
  }

  if (!(await probeTarget())) {
    fail(3, `nothing is answering at ${args.target} — start the site there first, or pass --target`);
  }
  proxy.listen(args.port, args.host, () => {
    console.log(`perf remote proxy → ${args.target}`);
    console.log(`listening on http://${args.host}:${args.port}`);
    console.log(`open      http://<this-machine>:${args.port}/es   on the phone`);
    console.log(`reports   ${args.out}`);
    console.log("waiting for a report — Ctrl-C to stop\n");
  });
};

const shutdown = () => {
  proxy.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch((error) => fail(1, error.message));
