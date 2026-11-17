#!/usr/bin/env bash
# Build Storybook, serve it, and scan every supported brand/mode pair. One CI job scans one theme (A11Y_THEME) and one Jest shard
# (A11Y_SHARD); what that shard scanned is recorded next to its report and scripts/verify-a11y-shards.mjs asserts coverage and the
# calibration contract over the theme's shards together. Extra arguments are forwarded to test-storybook (for example
# `--testTimeout 90000`). The test timeout defaults to the Jest config value.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"
PORT="${A11Y_STORYBOOK_PORT:-6006}"
REPORT_DIR="${A11Y_REPORT_OUTPUT_DIR:-a11y-report}"
case "${REPORT_DIR}" in
  /*) REPORT_ROOT="${REPORT_DIR}" ;;
  *) REPORT_ROOT="${ROOT_DIR}/${REPORT_DIR}" ;;
esac
FAIL_ON_VIOLATIONS="${A11Y_REPORT_FAIL_ON_VIOLATIONS:-true}"
case "$FAIL_ON_VIOLATIONS" in true|false) ;; *) echo "A11Y_REPORT_FAIL_ON_VIOLATIONS must be true or false" >&2; exit 1 ;; esac
# CI passes the workflow's `workers` input; the local default keeps a laptop usable.
WORKERS="${A11Y_TEST_WORKERS:-2}"
[[ "${WORKERS}" =~ ^[1-9][0-9]*$ ]] || { echo "A11Y_TEST_WORKERS must be a positive integer, got '${WORKERS}'" >&2; exit 1; }
# Jest splits the scan by suite: one shard per job, "index/total".
SHARD="${A11Y_SHARD:-1/1}"
[[ "${SHARD}" =~ ^[1-9][0-9]*/[1-9][0-9]*$ ]] || { echo "A11Y_SHARD must be index/total, got '${SHARD}'" >&2; exit 1; }
[ "${SHARD%%/*}" -le "${SHARD##*/}" ] || { echo "A11Y_SHARD index exceeds its shard count: ${SHARD}" >&2; exit 1; }
# full and all scan every story. Any other scope narrows the scan to the suites the changed files can reach; without a usable list
# the scan falls back to everything, which is the classifier's own posture.
SCOPE="${A11Y_SCOPE:-full}"
CHANGED_FILES="${A11Y_CHANGED_FILES_FROM:-}"
case "${SCOPE}" in
  full|all|"") SCOPE=full ;;
  *)
    if [ -n "${CHANGED_FILES}" ] && [ -f "${CHANGED_FILES}" ]; then
      SCOPE=changed
    else
      echo "Scope ${SCOPE} has no changed-file list at '${CHANGED_FILES}'; scanning every story."
      SCOPE=full
    fi
    ;;
esac
SHARDS_SCRIPT="${ROOT_DIR}/scripts/verify-a11y-shards.mjs"

mkdir -p "${REPORT_ROOT}"
# The reporter appends to NDJSON, so each invocation needs fresh output.
RUN_REPORT_ROOT="$(mktemp -d "${REPORT_ROOT}/run.XXXXXXXX")"
echo "A11y reports: ${RUN_REPORT_ROOT}"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "report-dir=${RUN_REPORT_ROOT}" >> "${GITHUB_OUTPUT}"
fi

if [ "${A11Y_STORYBOOK_REBUILD:-1}" != "0" ]; then
  node "${ROOT_DIR}/scripts/visual-storybook-build.mjs" --ensure
fi

# The scanner narrows its served index. Give it a private tree, so the
# producer's cached/shared build stays immutable even when a scan fails.
SERVER_ROOT="$(mktemp -d)"
SERVER_PID=""
cleanup() {
  if [ -n "${SERVER_PID}" ]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
  fi
  rm -rf "${SERVER_ROOT}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
cp -a "${ROOT_DIR}/storybook-static/." "${SERVER_ROOT}/"
INDEX_JSON="${SERVER_ROOT}/index.json"

# Every shard plans and records against the build's whole index; only the copy
# the runner is served gets narrowed to the shard, so a stale narrowing from a
# previous invocation can never be mistaken for the build's real contents.
FULL_INDEX="${RUN_REPORT_ROOT}/index-full.json"
if [ ! -f "${INDEX_JSON}" ]; then
  echo "The Storybook build produced no index at ${INDEX_JSON}." >&2
  exit 1
fi
cp "${INDEX_JSON}" "${FULL_INDEX}"

SERVER_LOG="${RUN_REPORT_ROOT}/server.log"
VISUAL_STORYBOOK_PORT="${PORT}" VISUAL_STORYBOOK_STATIC_DIR="${SERVER_ROOT}" \
  node test/visual-static-server.mjs > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

# A failed bind must not accidentally scan another process on this port.
if ! curl -fs -o /dev/null --retry 30 --retry-connrefused --retry-delay 1 \
  "http://127.0.0.1:${PORT}/index.json" ||
  ! grep -q "Serving Storybook on http://127.0.0.1:${PORT}" "${SERVER_LOG}" ||
  ! kill -0 "${SERVER_PID}" 2>/dev/null; then
  echo "The Storybook HTTP server did not become ready on port ${PORT}." >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

export A11Y_REPORT_FAIL_ON_VIOLATIONS="${FAIL_ON_VIOLATIONS}"
STATUS=0
THEME_MATRIX="$(node --input-type=module -e "import { createThemeMatrix } from '${ROOT_DIR}/test/visual-projects.mjs'; for (const {brand,mode} of createThemeMatrix()) console.log(brand,mode)")"
[ -n "$THEME_MATRIX" ] || { echo "Supported theme matrix is empty" >&2; exit 1; }
# CI scans one theme per job (A11Y_THEME=brand-mode). A11Y_THEME_COUNT must
# match the supported matrix so a new theme cannot silently go unscanned.
if [ -n "${A11Y_THEME:-}" ]; then
  if [ "${A11Y_THEME_COUNT:-}" != "$(printf '%s\n' "$THEME_MATRIX" | wc -l | tr -d ' ')" ]; then
    echo "A11Y_THEME_COUNT does not match the supported theme matrix" >&2
    exit 1
  fi
  THEME_MATRIX="$(printf '%s\n' "$THEME_MATRIX" | awk -v want="${A11Y_THEME}" '$1"-"$2 == want')"
  [ -n "$THEME_MATRIX" ] || { echo "Unsupported A11Y_THEME: ${A11Y_THEME}" >&2; exit 1; }
fi
# A11Y_THEME_COUNT is already checked against the supported matrix above; without it the matrix itself is the count.
THEME_COUNT="${A11Y_THEME_COUNT:-$(printf '%s\n' "$THEME_MATRIX" | wc -l | tr -d ' ')}"
while read -r brand mode; do
  theme="${brand}-${mode}"
  THEME_DIR="${RUN_REPORT_ROOT}/${theme}"
  mkdir -p "${THEME_DIR}"
  # Declares the stories this theme must cover and which of them are this shard's.
  PLAN_ARGS=(--plan --index "${FULL_INDEX}" --out "${THEME_DIR}" --theme "${theme}" \
    --shard "${SHARD}" --theme-count "${THEME_COUNT}" --scope "${SCOPE}")
  if [ "${SCOPE}" = "changed" ]; then
    PLAN_ARGS+=(--changed-files "${CHANGED_FILES}")
  fi
  # The plan writes the index this shard is served, which is what narrows it.
  # Jest's own --shard is deliberately not used: it orders suites by a SHA-1 of
  # each test path relative to rootDir, and the runner regenerates the
  # index-json suites into a fresh mkdtemp directory every invocation, so the
  # shards hash different paths and neither agree nor cover. Measured on run
  # 43882857373: 21 business-light stories ran in two shards and others in none.
  node "${SHARDS_SCRIPT}" "${PLAN_ARGS[@]}" --write-index "${INDEX_JSON}"
  RUN_ARGS=(--url "http://127.0.0.1:${PORT}" --config-dir .storybook --index-json --json \
    --maxWorkers "${WORKERS}")
  # --json puts Jest's machine-readable result on stdout and leaves every human message on stderr, so the log keeps the failures
  # and the report keeps the list of stories this shard ran.
  JEST_STDOUT="${THEME_DIR}/jest-stdout.log"
  TIMEFORMAT="A11y workload ${theme}: wall %3R s, user %3U s, system %3S s"
  time A11Y_STORYBOOK_BRAND="${brand}" A11Y_STORYBOOK_MODE="${mode}" A11Y_REPORT_OUTPUT_DIR="${THEME_DIR}" \
    pnpm -C "${ROOT_DIR}" exec test-storybook "${RUN_ARGS[@]}" "$@" \
    > "${JEST_STDOUT}" || STATUS=1

  REPORT_INPUT="${THEME_DIR}/report.ndjson"
  if [ -f "${REPORT_INPUT}" ]; then
    node "${ROOT_DIR}/scripts/storybook-a11y-summary.mjs" \
      --input "${REPORT_INPUT}" \
      --output "${THEME_DIR}/summary.md" || STATUS=1
  elif [ "${SCOPE}" = "full" ]; then
    echo "No a11y report found for ${theme}." >&2
    STATUS=1
  else
    # A narrowed scan can hand a shard only stories that belong to another theme, or no story at all.
    echo "No story in this shard produced an a11y report for ${theme}."
  fi
  # Records what this shard scanned from Jest's own result JSON, mapped through the whole index so a story belonging to another
  # shard is recognised rather than unmatched. Calibration and story coverage are asserted over the theme's shards together,
  # because the plan hands the calibration suite to exactly one of them.
  node "${SHARDS_SCRIPT}" --record --index "${FULL_INDEX}" --out "${THEME_DIR}" \
    --theme "${theme}" --shard "${SHARD}" --jest-output "${JEST_STDOUT}" || STATUS=1
done <<< "$THEME_MATRIX"

if [ "${FAIL_ON_VIOLATIONS}" = "false" ]; then
  echo "WARNING: Non-blocking mode enabled (A11Y_REPORT_FAIL_ON_VIOLATIONS=false)."
  echo "See ${RUN_REPORT_ROOT}/<brand>-<mode>/summary.md for details."
fi

exit "${STATUS}"
