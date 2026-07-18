#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${A11Y_REPORT_OUTPUT_DIR:-a11y-report}"
FAIL_ON_VIOLATIONS="${A11Y_REPORT_FAIL_ON_VIOLATIONS:-false}"
FAIL_ON_REGRESSION="${A11Y_FAIL_ON_REGRESSION:-false}"
BASELINE_FILE="${A11Y_BASELINE_FILE:-${ROOT_DIR}/a11y-baseline.json}"
WAIT_MS="${A11Y_REPORT_WAIT_MS:-30000}"
WORKERS="${A11Y_STORYBOOK_WORKERS:-1}"
TEST_TIMEOUT="${A11Y_TEST_TIMEOUT:-60000}"
TRANSPORT_ATTEMPTS="${A11Y_TRANSPORT_ATTEMPTS:-3}"
REQUESTED_PORT="${A11Y_STORYBOOK_PORT:-0}"

if ! [[ "${TRANSPORT_ATTEMPTS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "A11Y_TRANSPORT_ATTEMPTS must be a positive integer." >&2
  exit 1
fi
if ! [[ "${WORKERS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "A11Y_STORYBOOK_WORKERS must be a positive integer." >&2
  exit 1
fi
if ! [[ "${REQUESTED_PORT}" =~ ^[0-9]+$ ]] || [ "${REQUESTED_PORT}" -gt 65535 ]; then
  echo "A11Y_STORYBOOK_PORT must be an integer from 0 through 65535." >&2
  exit 1
fi

REPORT_ROOT="$(mise exec node@24 -- node -e 'const path=require("node:path"); console.log(path.resolve(process.argv[1], process.argv[2]))' "${ROOT_DIR}" "${REPORT_DIR}")"
case "${REPORT_ROOT}/" in
  "${ROOT_DIR}/"*) ;;
  *)
    echo "A11Y_REPORT_OUTPUT_DIR must resolve inside ${ROOT_DIR}." >&2
    exit 1
    ;;
esac
if [ "${REPORT_ROOT}" = "${ROOT_DIR}" ]; then
  echo "A11Y_REPORT_OUTPUT_DIR cannot be the UI package root." >&2
  exit 1
fi

TEMP_PARENT="${TMPDIR:-${ROOT_DIR}/.tmp}"
mkdir -p "${TEMP_PARENT}"
TEMP_ROOT="$(mktemp -d "${TEMP_PARENT%/}/storybook-a11y.XXXXXX")"
STATIC_DIR="${TEMP_ROOT}/storybook-static"
CANONICAL_INDEX="${TEMP_ROOT}/index.json"
READY_FILE="${TEMP_ROOT}/server-port"
SERVER_LOG="${TEMP_ROOT}/server.log"
PUBLISH_DIR="${TEMP_ROOT}/publish"
SERVER_PID=""
RUNNER_PID=""
CLEANED_UP="false"

terminate_tree() {
  local parent="$1"
  local child
  for child in $(pgrep -P "${parent}" 2>/dev/null || true); do
    terminate_tree "${child}"
  done
  kill -TERM "${parent}" >/dev/null 2>&1 || true
}

cleanup() {
  if [ "${CLEANED_UP}" = "true" ]; then
    return
  fi
  CLEANED_UP="true"

  if [ -n "${RUNNER_PID}" ]; then
    terminate_tree "${RUNNER_PID}"
    wait "${RUNNER_PID}" >/dev/null 2>&1 || true
    RUNNER_PID=""
  fi
  if [ -n "${SERVER_PID}" ]; then
    terminate_tree "${SERVER_PID}"
    wait "${SERVER_PID}" >/dev/null 2>&1 || true
    SERVER_PID=""
  fi
  rm -rf -- "${TEMP_ROOT}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

mise exec node@24 -- pnpm -C "${ROOT_DIR}" exec storybook build --output-dir "${STATIC_DIR}"
mise exec node@24 -- node "${ROOT_DIR}/scripts/storybook-a11y-index.mjs" \
  --input "${STATIC_DIR}/index.json" \
  --output "${CANONICAL_INDEX}"

mise exec node@24 -- node "${ROOT_DIR}/scripts/storybook-a11y-server.mjs" \
  --root "${STATIC_DIR}" \
  --index "${CANONICAL_INDEX}" \
  --ready-file "${READY_FILE}" \
  --port "${REQUESTED_PORT}" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 100); do
  if [ -s "${READY_FILE}" ]; then
    break
  fi
  if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    printf 'Storybook server exited before readiness.\n' >&2
    printf '%s\n' '--- server log ---' >&2
    cat "${SERVER_LOG}" >&2
    exit 1
  fi
  sleep 0.1
done

if [ ! -s "${READY_FILE}" ]; then
  echo "Timed out waiting for the Storybook server to bind." >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi
PORT="$(tr -d '[:space:]' < "${READY_FILE}")"
STORYBOOK_URL="http://127.0.0.1:${PORT}"

for _ in $(seq 1 100); do
  if mise exec node@24 -- node -e 'fetch(`${process.argv[1]}/index.json`, { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(String(response.status)); const index = await response.json(); if (!index?.entries) throw new Error("missing entries") })' "${STORYBOOK_URL}" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
    echo "Storybook server exited during readiness checks." >&2
    cat "${SERVER_LOG}" >&2
    exit 1
  fi
  sleep 0.1
done

if ! mise exec node@24 -- node -e 'fetch(`${process.argv[1]}/index.json`, { cache: "no-store" }).then(async (response) => { if (!response.ok) throw new Error(String(response.status)); const index = await response.json(); if (!index?.entries) throw new Error("missing entries") }).catch(() => process.exit(1))' "${STORYBOOK_URL}"; then
  echo "Storybook server did not become ready." >&2
  cat "${SERVER_LOG}" >&2
  exit 1
fi

is_transport_failure() {
  grep -Eiq 'ECONNREFUSED|ECONNRESET|ECONNABORTED|EPIPE|ETIMEDOUT|ERR_CONNECTION_(REFUSED|RESET|CLOSED)|socket hang up|browser has been closed|browser disconnected|page closed|target closed|context closed|fetch failed|network.*(error|failed)|connect ECONN' "$1"
}

run_theme() {
  local theme="$1"
  local attempt=1
  local status=1
  local attempt_dir=""
  local attempt_log=""

  while [ "${attempt}" -le "${TRANSPORT_ATTEMPTS}" ]; do
    attempt_dir="${TEMP_ROOT}/reports/${theme}/attempt-${attempt}"
    attempt_log="${TEMP_ROOT}/${theme}-attempt-${attempt}.log"
    mkdir -p "${attempt_dir}"

    set +e
    A11Y_THEME="${theme}" \
    A11Y_REPORT_OUTPUT_DIR="${attempt_dir}" \
    A11Y_REPORT_FAIL_ON_VIOLATIONS="${FAIL_ON_VIOLATIONS}" \
    A11Y_REPORT_WAIT_MS="${WAIT_MS}" \
    A11Y_TEST_TIMEOUT="${TEST_TIMEOUT}" \
    mise exec node@24 -- pnpm -C "${ROOT_DIR}" exec test-storybook \
      --url "${STORYBOOK_URL}" \
      --config-dir .storybook \
      --index-json \
      --no-cache \
      --maxWorkers "${WORKERS}" \
      --testTimeout "${TEST_TIMEOUT}" > "${attempt_log}" 2>&1 &
    RUNNER_PID=$!
    wait "${RUNNER_PID}"
    status=$?
    RUNNER_PID=""
    set -e
    cat "${attempt_log}"

    if [ "${status}" -eq 0 ]; then
      break
    fi
    if ! is_transport_failure "${attempt_log}" || [ "${attempt}" -eq "${TRANSPORT_ATTEMPTS}" ]; then
      return "${status}"
    fi
    if ! kill -0 "${SERVER_PID}" >/dev/null 2>&1; then
      echo "Storybook server exited after a transport failure." >&2
      cat "${SERVER_LOG}" >&2
      return "${status}"
    fi

    echo "Retrying ${theme} after transport failure (${attempt}/${TRANSPORT_ATTEMPTS})." >&2
    attempt=$((attempt + 1))
  done

  mise exec node@24 -- node "${ROOT_DIR}/scripts/storybook-a11y-finalize.mjs" \
    --index "${CANONICAL_INDEX}" \
    --report-dir "${attempt_dir}" \
    --theme "${theme}"
  mise exec node@24 -- node "${ROOT_DIR}/scripts/storybook-a11y-summary.mjs" \
    --input "${attempt_dir}/report.json" \
    --output "${attempt_dir}/summary.md"

  mkdir -p "${PUBLISH_DIR}"
  mv "${attempt_dir}" "${PUBLISH_DIR}/${theme}"
}

run_theme light
run_theme dark

REGRESSION_ARGS=(
  --report-root "${PUBLISH_DIR}"
  --baseline "${BASELINE_FILE}"
)
if [ "${FAIL_ON_REGRESSION}" = "true" ]; then
  REGRESSION_ARGS+=(--fail-on-new)
fi
mise exec node@24 -- node "${ROOT_DIR}/scripts/storybook-a11y-regression.mjs" "${REGRESSION_ARGS[@]}"

rm -rf -- "${REPORT_ROOT}"
mv "${PUBLISH_DIR}" "${REPORT_ROOT}"

if [ "${FAIL_ON_VIOLATIONS}" = "false" ]; then
  echo "WARNING: Known accessibility violations remain and are reported above."
  if [ "${FAIL_ON_REGRESSION}" = "false" ]; then
    echo "WARNING: Regression failures are disabled locally (A11Y_FAIL_ON_REGRESSION=false)."
  fi
  echo "See ${REPORT_DIR}/light/summary.md and ${REPORT_DIR}/dark/summary.md for full details."
fi
