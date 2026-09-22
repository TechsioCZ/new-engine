#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${A11Y_STORYBOOK_PORT:-6006}"
REPORT_DIR="${A11Y_REPORT_OUTPUT_DIR:-a11y-report}"
FAIL_ON_VIOLATIONS="${A11Y_REPORT_FAIL_ON_VIOLATIONS:-false}"
WAIT_MS="${A11Y_REPORT_WAIT_MS:-30000}"
WORKERS="${A11Y_TEST_WORKERS:-2}"
TEST_TIMEOUT="${A11Y_TEST_TIMEOUT:-60000}"

mkdir -p "${ROOT_DIR}/${REPORT_DIR}/light" "${ROOT_DIR}/${REPORT_DIR}/dark"

pnpm -C "${ROOT_DIR}" build:storybook

SERVER_LOG="$(mktemp)"
python3 -m http.server "${PORT}" --directory "${ROOT_DIR}/storybook-static" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 2

set +e
A11Y_REPORT_OUTPUT_DIR="${REPORT_DIR}/light" \
A11Y_REPORT_FAIL_ON_VIOLATIONS="${FAIL_ON_VIOLATIONS}" \
A11Y_REPORT_WRITE_JUNIT="true" \
A11Y_REPORT_WAIT_MS="${WAIT_MS}" \
pnpm -C "${ROOT_DIR}" exec test-storybook \
  --url "http://127.0.0.1:${PORT}/?globals=mode:light" \
  --config-dir .storybook \
  --maxWorkers "${WORKERS}" \
  --testTimeout "${TEST_TIMEOUT}"
LIGHT_STATUS=$?

A11Y_REPORT_OUTPUT_DIR="${REPORT_DIR}/dark" \
A11Y_REPORT_FAIL_ON_VIOLATIONS="${FAIL_ON_VIOLATIONS}" \
A11Y_REPORT_WRITE_JUNIT="true" \
A11Y_REPORT_WAIT_MS="${WAIT_MS}" \
pnpm -C "${ROOT_DIR}" exec test-storybook \
  --url "http://127.0.0.1:${PORT}/?globals=mode:dark" \
  --config-dir .storybook \
  --maxWorkers "${WORKERS}" \
  --testTimeout "${TEST_TIMEOUT}"
DARK_STATUS=$?
set -e

for theme in light dark; do
  if [ -f "${ROOT_DIR}/${REPORT_DIR}/${theme}/report.json" ]; then
    node "${ROOT_DIR}/scripts/storybook-a11y-summary.mjs" \
      --input "${ROOT_DIR}/${REPORT_DIR}/${theme}/report.json" \
      --output "${ROOT_DIR}/${REPORT_DIR}/${theme}/summary.md"
  else
    echo "No a11y report JSON found for ${theme}." > "${ROOT_DIR}/${REPORT_DIR}/${theme}/summary.md"
  fi
done

if [ "${FAIL_ON_VIOLATIONS}" = "false" ]; then
  echo "WARNING: Non-blocking mode enabled (A11Y_REPORT_FAIL_ON_VIOLATIONS=false)."
  echo "See ${REPORT_DIR}/light/summary.md and ${REPORT_DIR}/dark/summary.md for details."
  exit 0
fi

if [ "${LIGHT_STATUS}" -ne 0 ] || [ "${DARK_STATUS}" -ne 0 ]; then
  exit 1
fi
