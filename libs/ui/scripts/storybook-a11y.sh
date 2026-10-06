#!/usr/bin/env bash
# Build Storybook, serve it, and run the APCA a11y test runner in light and
# dark mode. Extra arguments are forwarded to test-storybook (for example
# `--testTimeout 90000`). The test timeout defaults to the Jest config value.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${A11Y_STORYBOOK_PORT:-6006}"
REPORT_DIR="${A11Y_REPORT_OUTPUT_DIR:-a11y-report}"
case "${REPORT_DIR}" in
  /*) REPORT_ROOT="${REPORT_DIR}" ;;
  *) REPORT_ROOT="${ROOT_DIR}/${REPORT_DIR}" ;;
esac
FAIL_ON_VIOLATIONS="${A11Y_REPORT_FAIL_ON_VIOLATIONS:-false}"
WORKERS="${A11Y_TEST_WORKERS:-2}"

mkdir -p "${REPORT_ROOT}"
# The reporter appends to NDJSON, so each invocation needs fresh output.
RUN_REPORT_ROOT="$(mktemp -d "${REPORT_ROOT}/run.XXXXXXXX")"
echo "A11y reports: ${RUN_REPORT_ROOT}"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "report-dir=${RUN_REPORT_ROOT}" >> "${GITHUB_OUTPUT}"
fi

pnpm -C "${ROOT_DIR}" build:storybook

SERVER_LOG="$(mktemp)"
python3 -m http.server "${PORT}" --bind 127.0.0.1 \
  --directory "${ROOT_DIR}/storybook-static" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
  wait "${SERVER_PID}" >/dev/null 2>&1 || true
  rm -f "${SERVER_LOG}"
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
for theme in light dark; do
  THEME_DIR="${RUN_REPORT_ROOT}/${theme}"
  mkdir -p "${THEME_DIR}"
  A11Y_STORYBOOK_MODE="${theme}" A11Y_REPORT_OUTPUT_DIR="${THEME_DIR}" \
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
    echo "No a11y report found for ${theme}." > "${THEME_DIR}/summary.md"
  fi
done

if [ "${FAIL_ON_VIOLATIONS}" = "false" ]; then
  echo "WARNING: Non-blocking mode enabled (A11Y_REPORT_FAIL_ON_VIOLATIONS=false)."
  echo "See ${RUN_REPORT_ROOT}/light/summary.md and ${RUN_REPORT_ROOT}/dark/summary.md for details."
fi

exit "${STATUS}"
