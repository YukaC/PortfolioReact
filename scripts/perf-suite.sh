#!/usr/bin/env bash
# Single entry point for every performance and stress measurement of this site.
#
# WHY one file: the repo already measures a lot (CSS budget, lab vitals, scroll
# frame pacing, the phone's raster bill, idle, reveal timing, load under emulated
# networks, per-section cost, layer ablation, stress, four e2e suites), but each
# measurement is its own script with its own server lifecycle and its own output
# shape. A regression only becomes visible when they run in one order, against
# one server, and collapse into one table.
#
# The Playwright performance layers live in scripts/perf/probe.mjs. This file
# never inspects it: it calls the documented CLI and collects the PROBE_SUMMARY
# line the probe prints last.
#
# A broken stage must never hide the other ten, so every command is captured and
# classified instead of aborting the run.
set -euo pipefail

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"

# Canonical stage order: it is what makes the table readable and comparable.
readonly ALL_STAGES=(budget vitals scroll raster idle reveal load sections ablate stress e2e)
readonly QUICK_LIST="budget,vitals,scroll,raster"
readonly FULL_LIST="budget,vitals,scroll,raster,idle,reveal,load,sections,ablate,stress"
readonly ALL_LIST="budget,vitals,scroll,raster,idle,reveal,load,sections,ablate,stress,e2e"
readonly ALL_NETS=(none edge lte slow3g)
readonly HEADLINE_MAX=64
readonly PROBE=scripts/perf/probe.mjs

# ------------------------------------------------------------------ configuration

URL=""
PORT=4173
DO_BUILD=0
ONLY=""
PRESET=""
NET_LIST="edge,lte,slow3g"
DEVICE="phone"
ITER=3
STRICT=0
OUT=""
HEADED=0
SELECT_SET=0

# --------------------------------------------------------------------- small utils

usage() {
  cat <<'EOF'
perf-suite.sh - the single entry point for every performance and stress test.

Runs every gate this repo owns against one server and prints one table. Stages
that break are reported, not fatal: the remaining stages still run.

usage: bash scripts/perf-suite.sh [select] [options]

select (default: --full)
  --only <list>   comma separated stage names, any order:
                  budget,vitals,scroll,raster,idle,reveal,load,sections,ablate,stress,e2e
  --quick         budget, vitals, scroll, raster
  --full          every stage except e2e
  --all           every stage
  --stress        only stress
  --ablate        only ablate

server
  --url <u>       measure a server that is already running (dev or prod).
                  The suite then never starts, stops or restarts anything.
  --port <n>      port for the suite's own server (default 4173)
  --build         run `next build` before measuring. This is the ONLY path that
                  writes .next, and it wipes the previous build: a `next start`
                  still serving that directory must be restarted afterwards.

stages
  budget    check-css (size, colour literals, dead classes) + check-motion-aliases
  vitals    lab LCP / CLS / TBT / JS per route, mobile 390px, CPU 4x
  scroll    scroll frame pacing, desktop profile then mobile-4x
  raster    scroll frame pacing on mobile-4x with SwiftShader: the bill the
            phone's GPU actually pays, not the desktop GPU's
  idle      no scroll, no input: draw calls and presented frames per second,
            plus DOM and heap growth over the window
  reveal    reveal timeline per section, plus probe reveal
  load      probe load for every network in --net, on --device
  sections  probe sections with a hardware GPU, then with SwiftShader
  ablate    probe ablate on SwiftShader: one expensive layer off at a time,
            reported as a delta against the baseline scroll
  stress    probe stress: fling, resize, live preference changes, SPA nav, the
            WorkList filter remount, the mobile drawer, and --iter repetitions
            to expose a leak
  e2e       e2e-a11y, e2e-runtime, e2e-nojs, e2e-functional

options
  --net <list>    networks for the load stage (default edge,lte,slow3g;
                  allowed none, edge, lte, slow3g)
  --device <d>    device profile for the probe stages (default phone)
  --iter <n>      repetitions for the stress stage (default 3)
  --strict        exit 1 when a stage failed or a budget was missed. Without it
                  a failed budget is reported and the exit code stays 0.
  --out <dir>     artifact directory (default .perf/<UTC timestamp>)
  --headed        pass --headed to the Playwright stages
  -h, --help      this text

exit codes
  0  every selected stage ran; a failed budget only becomes exit 1 under --strict
  1  --strict and a stage failed or a budget was missed, or `next build` failed
  2  bad usage: unknown stage, unknown flag, missing or invalid value
  3  nothing to measure: no --url, no .next/BUILD_ID and no --build

artifacts
  <out>/summary.ndjson  one PROBE_SUMMARY line per probe run
  <out>/results.ndjson  one line per stage: stage, status, headline, ms
  <out>/<stage>/*.log   full output of every command in that stage
EOF
}

die() {
  local code=$1
  shift
  printf 'perf-suite: %s\n' "$*" >&2
  exit "$code"
}

# A flag that needs a value never falls back to a default: a typo in a flag must
# not silently measure something else.
value_of() {
  local flag=$1
  local value=${2-}
  if [[ -z $value || $value == -* ]]; then
    die 2 "$flag wants a value"
  fi
  printf '%s' "$value"
}

is_stage() {
  local name=$1 stage
  for stage in "${ALL_STAGES[@]}"; do
    if [[ $stage == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

is_net() {
  local name=$1 net
  for net in "${ALL_NETS[@]}"; do
    if [[ $net == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

now_ms() {
  date +%s%3N 2>/dev/null || printf '%s000' "$(date +%s)"
}

# Text that is safe inside a table cell and inside a JSON string: no cell
# separator, no quotes, no control bytes, and no non-ASCII borrowed from a
# child's output, so the table stays grep-able.
clean_text() {
  local text=$1
  text=${text//\\/}
  text=${text//\"/\'}
  text=${text//|//}
  text=${text//$'\n'/ }
  text=${text//$'\r'/}
  printf '%s' "$text" | LC_ALL=C tr -d '[:cntrl:]' | LC_ALL=C tr '\200-\377' ' ' | tr -s ' '
}

shorten() {
  local text
  text=$(clean_text "$1")
  if ((${#text} > HEADLINE_MAX)); then
    printf '%s..' "${text:0:HEADLINE_MAX-2}"
  else
    printf '%s' "$text"
  fi
}

# First line of a log matching an extended regex, trimmed. The legacy scripts
# print their own verdicts, so the headline quotes them instead of recomputing
# a number this file does not own.
pick() {
  local log=$1
  local pattern=$2
  local line
  [[ -f $log ]] || return 1
  line=$(grep -E -m 1 -- "$pattern" "$log" || true)
  [[ -z $line ]] && return 1
  line=${line#"${line%%[![:space:]]*}"}
  line=${line%"${line##*[![:space:]]}"}
  [[ -z $line ]] && return 1
  printf '%s' "$line"
}

# Highest p95 the measured script itself printed.
worst_p95() {
  local log=$1
  local value
  [[ -f $log ]] || return 1
  value=$(grep -oE 'p95 [0-9][0-9.]* ?ms' "$log" | awk '{ v = $2 + 0; if (v > max) max = v } END { if (NR > 0) printf "%.1f", max }' || true)
  [[ -z $value ]] && return 1
  printf 'p95 %sms' "$value"
}

# Failures a legacy script reported on its own RESUMEN line.
resumen_fails() {
  local log=$1
  local line
  line=$(pick "$log" '^RESUMEN:') || line=""
  if [[ -z $line ]]; then
    printf '0'
    return 0
  fi
  printf '%s' "$line" | awk 'match($0, /[0-9]+ (FAIL|FALLA)/) { print substr($0, RSTART, RLENGTH - 5) + 0; exit }'
}

resumen_token() {
  local fails
  fails=$(resumen_fails "$1")
  if [[ -z $fails ]]; then
    fails=0
  fi
  if ((fails > 0)); then
    printf 'MISS %s' "$fails"
  else
    printf 'pass'
  fi
}

status_token() {
  if (($1 == 0)); then
    printf 'ok'
  else
    printf 'FAIL'
  fi
}

# ------------------------------------------------------------------- stage plumbing

STAGES=()
RES_STAGE=()
RES_STATUS=()
RES_HEADLINE=()
RES_MS=()

OK_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

STAGE_DIR=""
STAGE_STATUS=ok
STAGE_HEADLINE=""
SUMMARY_NDJSON=""
RESULTS_NDJSON=""

# Run one command, stream it, and keep its full output for the headline.
run_cmd() {
  local name=$1
  shift
  local log="$STAGE_DIR/$name.log"
  local status=0
  printf '$ %s\n\n' "$*" >>"$log"
  # pipefail makes the pipeline report the command's own status; tee keeps the
  # operator in the loop while the artifact keeps the whole story.
  "$@" 2>&1 | tee -a "$log" || status=$?
  return "$status"
}

probe_available() {
  [[ -f $PROBE ]]
}

# One probe run: stream it, log it, and collect its summary line.
run_probe() {
  local label=$1
  local mode=$2
  shift 2
  local log="$STAGE_DIR/probe-$label.log"
  local status=0
  local args=(node "$PROBE" "$mode" --url "$TARGET_URL" --out "$OUT/probes" --label "$label" --device "$DEVICE")
  if ((HEADED)); then
    args+=(--headed)
  fi
  args+=("$@")
  printf '$ %s\n\n' "${args[*]}" >>"$log"
  "${args[@]}" 2>&1 | tee -a "$log" || status=$?
  capture_probe_summary "$log" || true
  return "$status"
}

capture_probe_summary() {
  local log=$1
  local json
  json=$(grep -E '^PROBE_SUMMARY ' "$log" | tail -n 1 | sed -E 's/^PROBE_SUMMARY +//' || true)
  [[ -z $json ]] && return 1
  printf '%s\n' "$json" >>"$SUMMARY_NDJSON"
}

# The probe owns the headline wording; this file only shortens it.
probe_headline() {
  local log=$1
  local json
  json=$(grep -E '^PROBE_SUMMARY ' "$log" | tail -n 1 | sed -E 's/^PROBE_SUMMARY +//' || true)
  [[ -z $json ]] && return 1
  printf '%s' "$json" | node -e '
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { raw += chunk; });
    process.stdin.on("end", () => {
      let summary;
      try {
        summary = JSON.parse(raw);
      } catch {
        process.exit(1);
      }
      // The agreed shape is {name,value,unit,limit,pass,text}; a probe that
      // already wrote a sentence as a plain string is accepted as-is, because
      // the suite may not be the only consumer of that line.
      const headline = summary.headline;
      let text = "";
      let missed = false;
      if (typeof headline === "string") {
        text = headline;
      } else if (headline && typeof headline === "object") {
        text =
          headline.text ||
          [headline.name, headline.value, headline.unit].filter((part) => part !== "" && part != null).join(" ");
        missed = headline.pass === false;
      }
      if (!text) process.exit(1);
      process.stdout.write(missed ? `${text} [MISS]` : text);
    });
  '
}

skip_stage() {
  STAGE_STATUS=skipped
  STAGE_HEADLINE=$1
}

run_stage() {
  local name=$1
  local start ms
  STAGE_DIR="$OUT/$name"
  STAGE_STATUS=ok
  STAGE_HEADLINE=""
  mkdir -p "$STAGE_DIR"
  printf '\n== %s ==\n' "$name"
  start=$(now_ms)
  "stage_$name" || STAGE_STATUS=failed
  ms=$(( $(now_ms) - start ))
  if [[ -z $STAGE_HEADLINE ]]; then
    STAGE_HEADLINE="-"
  fi
  STAGE_HEADLINE=$(shorten "$STAGE_HEADLINE")
  RES_STAGE+=("$name")
  RES_STATUS+=("$STAGE_STATUS")
  RES_HEADLINE+=("$STAGE_HEADLINE")
  RES_MS+=("$ms")
  case $STAGE_STATUS in
  ok) OK_COUNT=$((OK_COUNT + 1)) ;;
  skipped) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
  *) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
  esac
  printf '{"stage":"%s","status":"%s","headline":"%s","ms":%s}\n' \
    "$name" "$STAGE_STATUS" "$STAGE_HEADLINE" "$ms" >>"$RESULTS_NDJSON"
}

# ------------------------------------------------------------------------- stages

stage_budget() {
  local css_status=0
  local motion_status=0
  local css_fails
  local motion_tok=css
  run_cmd check-css node scripts/check-css.mjs || css_status=$?
  run_cmd check-motion-aliases node scripts/check-motion-aliases.mjs || motion_status=$?

  css_fails=$(grep -cE '^FAIL ' "$STAGE_DIR/check-css.log" || true)
  if grep -q 'clean' "$STAGE_DIR/check-motion-aliases.log"; then
    motion_tok='motion ok'
  else
    motion_tok='motion FAIL'
  fi
  if grep -qE '^OK ' "$STAGE_DIR/check-css.log"; then
    STAGE_HEADLINE="css ok, $motion_tok"
  else
    STAGE_HEADLINE="css ${css_fails:-0} fail, $motion_tok"
  fi
  if ((css_status != 0 || motion_status != 0)); then
    return 1
  fi
  return 0
}

stage_vitals() {
  local status=0
  local worst
  local over
  run_cmd measure-vitals node scripts/measure-vitals.mjs --url "$TARGET_URL" || status=$?
  worst=$(awk '/^\// { seen = 1; match($0, /[0-9]+ms/); v = substr($0, RSTART, RLENGTH - 2) + 0; if (v > max) max = v } END { if (seen) printf "%dms", max }' "$STAGE_DIR/measure-vitals.log" || true)
  # measure-vitals prints a verdict per route and no RESUMEN line, so the
  # headline counts the verdicts it printed instead of assuming a format.
  over=$(grep -c 'FAIL' "$STAGE_DIR/measure-vitals.log" || true)
  if [[ -z $worst ]]; then
    STAGE_HEADLINE="not measured (see log)"
  elif [[ ${over:-0} != 0 ]]; then
    STAGE_HEADLINE="worst LCP $worst, ${over} route(s) over budget"
  else
    STAGE_HEADLINE="worst LCP $worst, pass"
  fi
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_scroll() {
  local desktop_status=0
  local mobile_status=0
  local desk
  local mob
  run_cmd scroll-desktop node scripts/measure-scroll-perf.mjs \
    --url "$TARGET_URL" --profile desktop --out "$STAGE_DIR/scroll-desktop.json" || desktop_status=$?
  run_cmd scroll-mobile-4x node scripts/measure-scroll-perf.mjs \
    --url "$TARGET_URL" --profile mobile-4x --out "$STAGE_DIR/scroll-mobile-4x.json" || mobile_status=$?
  desk=$(worst_p95 "$STAGE_DIR/scroll-desktop.log") || desk="p95 n/a"
  mob=$(worst_p95 "$STAGE_DIR/scroll-mobile-4x.log") || mob="p95 n/a"
  STAGE_HEADLINE="desktop $desk, mobile-4x $mob"
  if ((desktop_status != 0 || mobile_status != 0)); then
    return 1
  fi
  return 0
}

stage_raster() {
  local status=0
  local p95
  local log="$STAGE_DIR/raster-mobile-4x-swiftshader.log"
  # Same profile as scroll on purpose: the delta between the two is the GPU bill
  # a phone pays for effects a desktop GPU absorbs without showing it.
  run_cmd raster-mobile-4x-swiftshader node scripts/measure-scroll-perf.mjs \
    --url "$TARGET_URL" --profile mobile-4x --swiftshader --out "$STAGE_DIR/raster.json" || status=$?
  p95=$(worst_p95 "$log") || p95="p95 n/a"
  STAGE_HEADLINE="swiftshader mobile-4x $p95, $(resumen_token "$log")"
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_idle() {
  local status=0
  local res
  run_cmd measure-idle node scripts/measure-idle.mjs --url "$TARGET_URL" --out "$STAGE_DIR/idle.json" || status=$?
  res=$(pick "$STAGE_DIR/measure-idle.log" '^RESUMEN:') || res="no RESUMEN"
  STAGE_HEADLINE=$res
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_reveal() {
  local status=0
  local probe_status=0
  local p95
  local res
  local probe_text
  run_cmd reveal-timeline node scripts/reveal-timeline.mjs --url "$TARGET_URL" --out "$STAGE_DIR/reveal.json" || status=$?
  p95=$(worst_p95 "$STAGE_DIR/reveal-timeline.log") || p95="p95 n/a"
  res=$(pick "$STAGE_DIR/reveal-timeline.log" '^RESUMEN:') || res=""
  if probe_available; then
    run_probe reveal reveal || probe_status=$?
    probe_text=$(probe_headline "$STAGE_DIR/probe-reveal.log") || probe_text="no PROBE_SUMMARY"
    STAGE_HEADLINE="$p95, $probe_text"
  else
    STAGE_HEADLINE="$p95${res:+, $res} (probe missing)"
  fi
  if ((status != 0 || probe_status != 0)); then
    return 1
  fi
  return 0
}

stage_load() {
  local status=0
  local headline=""
  local net
  local head
  local -a nets=()
  if ! probe_available; then
    skip_stage "probe missing: $PROBE"
    return 0
  fi
  IFS=, read -r -a nets <<<"$NET_LIST"
  for net in ${nets[@]+"${nets[@]}"}; do
    net=${net//[[:space:]]/}
    [[ -z $net ]] && continue
    run_probe "load-$net" load --net "$net" || status=$?
    head=$(probe_headline "$STAGE_DIR/probe-load-$net.log") || head="no PROBE_SUMMARY"
    headline=${headline:+$headline, }"$net $head"
  done
  STAGE_HEADLINE=${headline:-"no network selected"}
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_sections() {
  local status=0
  local hw
  local sw
  if ! probe_available; then
    skip_stage "probe missing: $PROBE"
    return 0
  fi
  run_probe sections-hw sections --gl hw || status=$?
  run_probe sections-sw sections --gl sw || status=$?
  hw=$(probe_headline "$STAGE_DIR/probe-sections-hw.log") || hw="n/a"
  sw=$(probe_headline "$STAGE_DIR/probe-sections-sw.log") || sw="n/a"
  STAGE_HEADLINE="hw $hw, sw $sw"
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_ablate() {
  local status=0
  local head
  if ! probe_available; then
    skip_stage "probe missing: $PROBE"
    return 0
  fi
  run_probe ablate ablate --gl sw || status=$?
  head=$(probe_headline "$STAGE_DIR/probe-ablate.log") || head="no PROBE_SUMMARY"
  STAGE_HEADLINE=$head
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_stress() {
  local status=0
  local head
  if ! probe_available; then
    skip_stage "probe missing: $PROBE"
    return 0
  fi
  run_probe stress stress --iter "$ITER" || status=$?
  head=$(probe_headline "$STAGE_DIR/probe-stress.log") || head="no PROBE_SUMMARY"
  STAGE_HEADLINE=$head
  if ((status != 0)); then
    return 1
  fi
  return 0
}

stage_e2e() {
  local a11y=0
  local runtime=0
  local nojs=0
  local functional=0
  local -a headed=()
  if ((HEADED)); then
    headed=(--headed)
  fi
  run_cmd e2e-a11y node scripts/e2e-a11y.mjs --root "$ROOT" || a11y=$?
  run_cmd e2e-runtime node scripts/e2e-runtime.mjs --url "$TARGET_URL" || runtime=$?
  run_cmd e2e-nojs node scripts/e2e-nojs.mjs --url "$TARGET_URL" || nojs=$?
  run_cmd e2e-functional node scripts/e2e-functional.mjs --url "$TARGET_URL" \
    ${headed[@]+"${headed[@]}"} || functional=$?
  STAGE_HEADLINE="a11y $(status_token "$a11y"), runtime $(status_token "$runtime"), nojs $(status_token "$nojs"), functional $(status_token "$functional")"
  if ((a11y != 0 || runtime != 0 || nojs != 0 || functional != 0)); then
    return 1
  fi
  return 0
}

# -------------------------------------------------------------- server + lifecycle

SERVER_PID=""
SERVER_LOG=""
TARGET_URL=""
OWN_SERVER=0

next_binary() {
  if [[ -x node_modules/.bin/next ]]; then
    printf '%s' node_modules/.bin/next
    return 0
  fi
  die 3 "node_modules/.bin/next is missing; run 'pnpm install' first"
}

stop_server() {
  if ((OWN_SERVER == 0)) || [[ -z $SERVER_PID ]]; then
    return 0
  fi
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  SERVER_PID=""
  OWN_SERVER=0
}

# One cleanup path, so no exit can leave an orphan behind. The signal traps only
# turn a signal into an exit, which is what makes this EXIT trap run.
on_exit() {
  local status=$?
  trap - EXIT
  stop_server
  exit "$status"
}

responds() {
  curl -fsS -o /dev/null --max-time 2 "$1"
}

wait_for_server() {
  local url=$1
  local attempt
  for attempt in $(seq 1 120); do
    if responds "$url/"; then
      return 0
    fi
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
      printf 'perf-suite: next start exited before answering; last lines of %s:\n' "$SERVER_LOG" >&2
      tail -n 20 "$SERVER_LOG" >&2 || true
      return 1
    fi
    sleep 0.5
  done
  return 1
}

start_server() {
  local url="http://127.0.0.1:$PORT"
  SERVER_LOG="$OUT/server.log"
  printf 'perf-suite: starting %s start -p %s\n' "$(next_binary)" "$PORT"
  "$(next_binary)" start -p "$PORT" >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  OWN_SERVER=1
  wait_for_server "$url" || die 3 "the suite's own server on port $PORT never answered; see $SERVER_LOG"
}

# ------------------------------------------------------------------------ selection

RESOLVED=()

resolve_stages() {
  local list=$1
  local name
  local stage
  local wanted=" "
  local -a parts=()
  RESOLVED=()
  IFS=, read -r -a parts <<<"$list"
  for name in ${parts[@]+"${parts[@]}"}; do
    name=${name//[[:space:]]/}
    [[ -z $name ]] && continue
    is_stage "$name" || die 2 "unknown stage: $name (see --help)"
    wanted+="$name "
  done
  [[ $wanted == " " ]] && die 2 "empty stage selection"
  # Canonical order, so the table reads the same however --only is typed.
  for stage in "${ALL_STAGES[@]}"; do
    if [[ $wanted == *" $stage "* ]]; then
      RESOLVED+=("$stage")
    fi
  done
}

# ----------------------------------------------------------------------------- main

while (($#)); do
  case $1 in
  --url)
    URL=$(value_of "$1" "${2-}")
    shift 2
    ;;
  --port)
    PORT=$(value_of "$1" "${2-}")
    [[ $PORT =~ ^[0-9]+$ ]] || die 2 "--port wants a number, got: $PORT"
    shift 2
    ;;
  --build)
    DO_BUILD=1
    shift
    ;;
  --only)
    ONLY=$(value_of "$1" "${2-}")
    SELECT_SET=$((SELECT_SET + 1))
    shift 2
    ;;
  --quick | --full | --all | --stress | --ablate)
    PRESET=${1#--}
    SELECT_SET=$((SELECT_SET + 1))
    shift
    ;;
  --net)
    NET_LIST=$(value_of "$1" "${2-}")
    shift 2
    ;;
  --device)
    DEVICE=$(value_of "$1" "${2-}")
    shift 2
    ;;
  --iter)
    ITER=$(value_of "$1" "${2-}")
    if [[ ! $ITER =~ ^[0-9]+$ ]] || ((ITER < 1)); then
      die 2 "--iter wants a positive number, got: $ITER"
    fi
    shift 2
    ;;
  --strict)
    STRICT=1
    shift
    ;;
  --out)
    OUT=$(value_of "$1" "${2-}")
    shift 2
    ;;
  --headed)
    HEADED=1
    shift
    ;;
  -h | --help)
    usage
    exit 0
    ;;
  *)
    die 2 "unknown argument: $1 (see --help)"
    ;;
  esac
done

if ((SELECT_SET > 1)); then
  die 2 "pick one stage selection: --only, --quick, --full, --all, --stress or --ablate"
fi

case $PRESET in
quick) resolve_stages "$QUICK_LIST" ;;
all) resolve_stages "$ALL_LIST" ;;
stress) resolve_stages "stress" ;;
ablate) resolve_stages "ablate" ;;
*)
  if [[ -n $ONLY ]]; then
    resolve_stages "$ONLY"
  else
    resolve_stages "$FULL_LIST"
  fi
  ;;
esac
STAGES=()
if ((${#RESOLVED[@]} > 0)); then
  STAGES=("${RESOLVED[@]}")
fi

# Validate every network up front: a typo must not surface eight minutes into a
# run that already opened a browser.
net_check=()
IFS=, read -r -a net_check <<<"$NET_LIST"
for net in ${net_check[@]+"${net_check[@]}"}; do
  net=${net//[[:space:]]/}
  [[ -z $net ]] && continue
  is_net "$net" || die 2 "unknown network: $net (allowed: ${ALL_NETS[*]})"
done

if [[ -z $OUT ]]; then
  OUT=.perf/$(date -u +%Y%m%dT%H%M%SZ)
fi
mkdir -p "$OUT"
OUT=$(cd -- "$OUT" && pwd)
SUMMARY_NDJSON="$OUT/summary.ndjson"
RESULTS_NDJSON="$OUT/results.ndjson"
: >"$SUMMARY_NDJSON"
: >"$RESULTS_NDJSON"

trap on_exit EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ((DO_BUILD)); then
  printf '== build (this wipes .next) ==\n'
  if ! "$(next_binary)" build 2>&1 | tee "$OUT/build.log"; then
    die 1 "next build failed; see $OUT/build.log"
  fi
fi

if [[ -n $URL ]]; then
  TARGET_URL=${URL%/}
  printf 'perf-suite: measuring %s (server lifecycle skipped)\n' "$TARGET_URL"
  if ! responds "$TARGET_URL/"; then
    printf 'perf-suite: warning: %s does not answer yet\n' "$TARGET_URL" >&2
  fi
else
  if [[ ! -f .next/BUILD_ID ]]; then
    die 3 "no production build in .next and no --url. Run 'pnpm build' (or pass --build), or measure a running server with --url http://127.0.0.1:3000"
  fi
  # Never adopt a server this process did not start: it could not stop it either.
  if responds "http://127.0.0.1:$PORT/"; then
    die 3 "port $PORT already answers; pass --url http://127.0.0.1:$PORT to measure it, or --port with a free port"
  fi
  start_server
  TARGET_URL="http://127.0.0.1:$PORT"
fi

printf 'perf-suite: %s stage(s): %s\n' "${#STAGES[@]}" "${STAGES[*]}"

for stage in "${STAGES[@]}"; do
  run_stage "$stage"
done

# --------------------------------------------------------------------------- report

print_report() {
  local w_stage=5
  local w_status=6
  local w_head=8
  local i
  local value
  local failing=""
  local skipped=""
  local sep

  for value in "${RES_STAGE[@]}"; do
    if ((${#value} > w_stage)); then w_stage=${#value}; fi
  done
  for value in "${RES_STATUS[@]}"; do
    if ((${#value} > w_status)); then w_status=${#value}; fi
  done
  for value in "${RES_HEADLINE[@]}"; do
    if ((${#value} > w_head)); then w_head=${#value}; fi
  done
  sep=$(printf '%*s' $((w_stage + w_status + w_head + 18)) '' | tr ' ' '-')

  printf '\n%s\n' "$sep"
  printf '%-*s | %-*s | %-*s | %s\n' "$w_stage" "stage" "$w_status" "status" "$w_head" "headline" "ms"
  printf '%s\n' "$sep"
  for ((i = 0; i < ${#RES_STAGE[@]}; i++)); do
    printf '%-*s | %-*s | %-*s | %s\n' \
      "$w_stage" "${RES_STAGE[$i]}" \
      "$w_status" "${RES_STATUS[$i]}" \
      "$w_head" "${RES_HEADLINE[$i]}" \
      "${RES_MS[$i]}"
    case ${RES_STATUS[$i]} in
    ok) ;;
    skipped) skipped=${skipped:+$skipped, }${RES_STAGE[$i]} ;;
    *) failing=${failing:+$failing, }${RES_STAGE[$i]} ;;
    esac
  done
  printf '%s\n' "$sep"
  printf 'total: %d ok, %d failed, %d skipped\n' "$OK_COUNT" "$FAIL_COUNT" "$SKIP_COUNT"
  if [[ -n $failing ]]; then
    printf 'failing: %s (full output in %s/<stage>/*.log)\n' "$failing" "$OUT"
  fi
  if [[ -n $skipped ]]; then
    printf 'skipped: %s (nothing to run them with)\n' "$skipped"
  fi
  printf 'artifacts: %s\n' "$OUT"
  if ((STRICT == 0 && FAIL_COUNT > 0)); then
    printf 'note: exit 0 without --strict; add --strict to fail on the above\n'
  fi
}

print_report

if ((STRICT == 1 && FAIL_COUNT > 0)); then
  exit 1
fi
exit 0
