#!/usr/bin/env bash
# Build Storybook, serve it, and scan every supported brand/mode pair. Extra arguments are forwarded to test-storybook (for example
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
WORKERS="${A11Y_TEST_WORKERS:-2}"

mkdir -p "${REPORT_ROOT}"
# The reporter appends to NDJSON, so each invocation needs fresh output.
RUN_REPORT_ROOT="$(mktemp -d "${REPORT_ROOT}/run.XXXXXXXX")"
echo "A11y reports: ${RUN_REPORT_ROOT}"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "report-dir=${RUN_REPORT_ROOT}" >> "${GITHUB_OUTPUT}"
fi

if [ "${A11Y_STORYBOOK_REBUILD:-1}" != "0" ]; then
  pnpm -C "${ROOT_DIR}" build:storybook
fi

SERVER_LOG="${RUN_REPORT_ROOT}/server.log"
python3 -m http.server "${PORT}" --bind 127.0.0.1 \
  --directory "${ROOT_DIR}/storybook-static" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
  wait "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

# The request log proves our server answered, not another process on the port.
if ! curl -fs -o /dev/null --retry 30 --retry-connrefused --retry-delay 1 \
  "http://127.0.0.1:${PORT}/index.json" ||
  ! grep -q "GET /index.json" "${SERVER_LOG}"; then
  echo "The Storybook HTTP server did not become ready on port ${PORT}." >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

export A11Y_REPORT_FAIL_ON_VIOLATIONS="${FAIL_ON_VIOLATIONS}"
STATUS=0
THEME_MATRIX="$(node --input-type=module -e "import { createThemeMatrix } from '${ROOT_DIR}/test/visual-projects.mjs'; for (const {brand,mode} of createThemeMatrix()) console.log(brand,mode)")"
[ -n "$THEME_MATRIX" ] || { echo "Supported theme matrix is empty" >&2; exit 1; }
while read -r brand mode; do
  theme="${brand}-${mode}"
  THEME_DIR="${RUN_REPORT_ROOT}/${theme}"
  mkdir -p "${THEME_DIR}"
  A11Y_STORYBOOK_BRAND="${brand}" A11Y_STORYBOOK_MODE="${mode}" A11Y_REPORT_OUTPUT_DIR="${THEME_DIR}" \
    pnpm -C "${ROOT_DIR}" exec test-storybook \
    --url "http://127.0.0.1:${PORT}" \
    --config-dir .storybook \
    --index-json \
    --maxWorkers "${WORKERS}" \
    "$@" || STATUS=1

  REPORT_INPUT="${THEME_DIR}/report.ndjson"
  if [ ! -f "${REPORT_INPUT}" ]; then
    REPORT_INPUT="${THEME_DIR}/report.json"
  fi
  if [ -f "${REPORT_INPUT}" ]; then
    node "${ROOT_DIR}/scripts/storybook-a11y-summary.mjs" \
      --input "${REPORT_INPUT}" \
      --output "${THEME_DIR}/summary.md" || STATUS=1
  else
    echo "No a11y report found for ${theme}." >&2
    STATUS=1
  fi
  # A successful product report cannot mask absent calibration stories.
  node --input-type=module - "${THEME_DIR}/calibration.ndjson" <<'JS' || STATUS=1
import { readFileSync } from 'node:fs'
import { calibrationIds } from './.storybook/a11y-policy.mjs'
const entries = readFileSync(process.argv[2], 'utf8').trim().split('\n').map(JSON.parse)
if (entries.length !== calibrationIds.length || calibrationIds.some(id => entries.filter(e => e.storyId === id && e.status === 'passed').length !== 1)) {
  throw new Error('Calibration coverage is missing, duplicated or failed')
}
JS
done <<< "$THEME_MATRIX"

if [ "${FAIL_ON_VIOLATIONS}" = "false" ]; then
  echo "WARNING: Non-blocking mode enabled (A11Y_REPORT_FAIL_ON_VIOLATIONS=false)."
  echo "See ${RUN_REPORT_ROOT}/<brand>-<mode>/summary.md for details."
fi

exit "${STATUS}"
