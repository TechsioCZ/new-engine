#!/usr/bin/env bash
# One install/build, two independent theme scanners at a time. Split the worker
# budget rather than starting three full Jest pools on the same hosted runner.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
workers="${A11Y_TEST_WORKERS:-4}"
[[ "$workers" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid A11Y_TEST_WORKERS" >&2; exit 1; }
node scripts/visual-storybook-build.mjs --ensure
themes=()
while IFS= read -r theme; do themes+=("$theme"); done < <(node --input-type=module -e '
  import { createThemeMatrix } from "./test/visual-projects.mjs";
  for (const {brand,mode} of createThemeMatrix()) console.log(`${brand}-${mode}`);
')
[ "${#themes[@]}" -gt 0 ] || { echo "No supported themes" >&2; exit 1; }
parallel=2
if [ "$workers" -lt 2 ]; then parallel=1; fi
per_theme=$((workers / parallel))
status=0
pids=()
cleanup() {
  # Each scanner owns and traps its own private HTTP server.
  if [ "${#pids[@]}" -gt 0 ]; then
    for pid in "${pids[@]}"; do kill -TERM "$pid" 2>/dev/null || true; done
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for ((offset=0; offset<${#themes[@]}; offset+=parallel)); do
  pids=()
  for ((index=offset; index<offset+parallel && index<${#themes[@]}; index++)); do
    A11Y_THEME="${themes[index]}" A11Y_THEME_COUNT="${#themes[@]}" \
      A11Y_STORYBOOK_PORT="$((6006 + index))" A11Y_STORYBOOK_REBUILD=0 \
      A11Y_TEST_WORKERS="$per_theme" bash scripts/storybook-a11y.sh "$@" &
    pids+=("$!")
  done
  for pid in "${pids[@]}"; do wait "$pid" || status=1; done
  pids=()
done
exit "$status"
