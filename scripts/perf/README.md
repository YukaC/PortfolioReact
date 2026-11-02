# Performance and stress suite

One command runs every performance and stress measurement this repo owns and
prints one table. It does not introduce new budgets: it runs the gates that
already exist, in a fixed order, and adds the layers the older scripts never
saw (the phone's raster bill, cost per section, load under an emulated network,
layer ablation, stress).

```bash
pnpm perf                                  # every stage except e2e
pnpm perf --url http://127.0.0.1:3000      # measure a server that is already up
pnpm perf:quick                            # budget, vitals, scroll, raster
pnpm perf:stress                           # only stress
pnpm perf:ablate                           # only ablate
bash scripts/perf-suite.sh --help          # stages, flags, exit codes
```

## Stages

| Stage | What it measures |
| --- | --- |
| `budget` | `check-css` (compiled size, colour literals, dead classes, orphan tokens) and `check-motion-aliases` |
| `vitals` | lab LCP / CLS / TBT / JS per route, mobile 390px, CPU 4x |
| `scroll` | scroll frame pacing, desktop profile then mobile-4x |
| `raster` | the same mobile-4x scroll on SwiftShader: the bill the phone's GPU pays for effects a desktop GPU absorbs |
| `idle` | no scroll, no input: draw calls and presented frames per second before and after the window, plus DOM and heap growth |
| `reveal` | `reveal-timeline` per section, plus `probe reveal` |
| `load` | `probe load` for every network in `--net` |
| `sections` | `probe sections` with a hardware GPU, then with SwiftShader |
| `ablate` | `probe ablate` on SwiftShader: one expensive layer off at a time, reported as a delta against the baseline scroll |
| `stress` | `probe stress`: fling, resize and rotation, live `prefers-reduced-motion` / `prefers-reduced-transparency` changes, SPA navigation with back/forward, the WorkList filter remount, the mobile drawer, and `--iter` repetitions for leak detection |
| `e2e` | `e2e-a11y`, `e2e-runtime`, `e2e-nojs`, `e2e-functional` |

`--quick` is `budget,vitals,scroll,raster`; `--full` (the default) is every
stage except `e2e`; `--all` is everything; `--only <list>` takes any subset, in
any order, and runs it in canonical order.

## Measuring a real phone

A phone cannot be driven by Playwright without a cable, and the number that
matters most is the one only a real phone has: its DPR and its GPU. So there is a
second entry point, outside the stage list:

```bash
node scripts/perf/remote-proxy.mjs --target http://127.0.0.1:4173 --port 4300
```

It reverse-proxies the site and injects `meter.js` into the HTML it serves. Open
`http://<this-machine>:4300/es` on the phone and a badge appears: press
**Empezar**, scroll, press **Terminar y enviar**. The report is POSTed back and
printed here.

What the badge reports: frame pacing at the phone's real refresh rate, long
tasks, LCP/CLS, stranded reveals, and the meter's **own** cost (`ms/s`), so a slow
probe is never read as a slow phone. It also runs an anomaly scan — flicker,
vanished, jitter, resized, covered, overflow, outsider, classThrash, deadTap —
and a per-layer field panel that answers whether the background stays put,
drifts with the scroll, jumps or flickers, with a sparkline per layer.

Limits: it cannot read the compositor (layers, overdraw) — that needs `adb` and
`--remote-debugging-port` — and it reads `meter.js` once at startup, so editing
the meter needs a proxy restart. The proxy refuses to start if the meter does not
parse, which is the guard that keeps a broken meter from silently measuring
nothing.

## Server lifecycle

- `--url <u>` measures that server and never starts, stops or restarts anything.
  Use it for the dev server on `127.0.0.1:3000`: the suite will not touch it.
- Otherwise the suite starts its own `next start -p <port>` (default `4173`),
  waits until it answers, and stops it through a single `EXIT`/`INT`/`TERM`
  cleanup path, so no orphan survives a Ctrl-C.
- A server the suite did not start is never adopted: if the chosen port already
  answers, the run stops with exit 3 and tells you to pass `--url`.
- `--build` runs `next build` and is the **only** path that writes `.next`. It
  wipes the previous build, so a `next start` still serving that directory has to
  be restarted afterwards.

## Reading the result

```
stage  | status | headline              | ms
------------------------------------------------
budget | ok     | css ok, motion ok     | 281
vitals | failed | worst LCP 312ms, 3 route(s) over budget | 14559
------------------------------------------------
total: 1 ok, 1 failed, 0 skipped
failing: vitals (full output in <out>/vitals/*.log)
artifacts: <out>
```

`status` is `ok`, `failed` or `skipped` (a skipped stage has nothing to run it
with, e.g. a missing `scripts/perf/probe.mjs`). A broken stage never hides the
others: the run continues and every failure is listed at the end.

The headline never invents a number. For the legacy scripts it quotes the line
the script itself printed (`p95`, `LCP`, `RESUMEN`, `OK`/`FAIL`); for the probe
stages it uses the `PROBE_SUMMARY` line the probe prints last.

Budgets are the ones the repo already enforces. The suite only turns a budget
miss into a non-zero exit when `--strict` is passed; without it a failed budget
is reported and the exit stays 0.

## Exit codes

| Code | Meaning |
| --- | --- |
| 0 | every selected stage ran (a failed budget is only exit 1 under `--strict`) |
| 1 | `--strict` and a stage failed or a budget was missed, or `next build` failed |
| 2 | bad usage: unknown stage, unknown flag, missing or invalid value |
| 3 | nothing to measure: no `--url`, no `.next/BUILD_ID` and no `--build` |

## Artifacts

```
<out>/summary.ndjson   one PROBE_SUMMARY line per probe run
<out>/results.ndjson   one line per stage: stage, status, headline, ms
<out>/<stage>/*.log    full output of every command in that stage
<out>/probes/*.json    raw probe reports
```

`<out>` defaults to `.perf/<UTC timestamp>`, which `.gitignore` already
ignores. Pass `--out /tmp/perf-<name>` for throwaway runs you do not want to
keep.

## Notes

- Measure a production server (`next start`, i.e. the suite's own server or a
  `pnpm build && pnpm start` you already have) when a budget claim matters. On
  the dev server the JS and TBT budgets fail by construction (unminified
  bundles), which the `vitals` stage reports honestly.
- `scripts/perf/probe.mjs` owns the Playwright performance layers and prints the
  `PROBE_SUMMARY` line. This suite only calls its documented CLI
  (`<mode> [--url] [--out] [--label] [--device] [--dpr] [--cpu] [--gl] [--net]
  [--iter] [--headed]`); it never imports it.
- `scripts/perf/lib.mjs` holds the shared profiles (device, network, renderer)
  so no mode defines its own viewport, DPR, UA or Chromium flags.
