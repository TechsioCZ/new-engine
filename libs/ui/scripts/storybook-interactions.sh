#!/usr/bin/env bash
# Run Storybook play functions (interaction tests) and gate on their result.
#
# Deliberately runs with the axe reporter off (A11Y_REPORT_ENABLED=0): accessibility
# is covered by storybook-a11y.sh against its own baseline, and mixing the two makes
# a failed interaction assertion indistinguishable from a colour-contrast warning.
# Here a non-zero exit means a play function actually failed.
#
# Reuses an existing storybook-static build when present so CI can build once.
#   SKIP_BUILD=1        reuse libs/ui/storybook-static as-is
#   INTERACTION_GREP    only run stories whose name matches (e.g. DataTable)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${INTERACTION_STORYBOOK_PORT:-6007}"
WORKERS="${INTERACTION_TEST_WORKERS:-2}"
TEST_TIMEOUT="${INTERACTION_TEST_TIMEOUT:-60000}"

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  pnpm -C "${ROOT_DIR}" build:storybook
fi

if [ ! -d "${ROOT_DIR}/storybook-static" ]; then
  echo "No storybook-static build found at ${ROOT_DIR}/storybook-static" >&2
  exit 1
fi

SERVER_LOG="$(mktemp)"
python3 -m http.server "${PORT}" --directory "${ROOT_DIR}/storybook-static" > "${SERVER_LOG}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Wait for the static server rather than sleeping a fixed amount.
for _ in $(seq 1 40); do
  if curl -sSf "http://127.0.0.1:${PORT}/index.json" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# test-storybook takes a positional regex matched against story file paths.
# It does not support --testNamePattern; passing one makes it print help and exit 0,
# which silently looks like a pass.
EXTRA_ARGS=()
if [ -n "${INTERACTION_GREP:-}" ]; then
  EXTRA_ARGS+=("${INTERACTION_GREP}")
fi

RESULTS_FILE="$(mktemp -t storybook-interactions-XXXXXX.json)"

set +e
A11Y_REPORT_ENABLED=0 \
pnpm -C "${ROOT_DIR}" exec test-storybook \
  --url "http://127.0.0.1:${PORT}" \
  --config-dir .storybook \
  --maxWorkers "${WORKERS}" \
  --testTimeout "${TEST_TIMEOUT}" \
  --json --outputFile "${RESULTS_FILE}" \
  "${EXTRA_ARGS[@]+"${EXTRA_ARGS[@]}"}"
RUN_STATUS=$?
set -e

# A run that executes zero tests exits 0 — that happens when the browser fails to
# launch, or when an unsupported CLI flag makes test-storybook print help instead.
# Treat "nothing ran" as a failure so this job can never be a silent pass.
TOTAL="$(node -e "
  try {
    const r = require('${RESULTS_FILE}');
    process.stdout.write(String(r.numTotalTests ?? 0));
  } catch { process.stdout.write('0'); }
")"

echo "Interaction tests executed: ${TOTAL}"

if [ "${TOTAL}" -eq 0 ]; then
  echo "No interaction tests ran — refusing to report success." >&2
  exit 1
fi

exit "${RUN_STATUS}"
