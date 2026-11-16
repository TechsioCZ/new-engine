#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# The scanner narrows index.json for each theme. Never mutate the shared build
# or another theme's index while its browser is reading it.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
themes="$(node --input-type=module -e "
  import { createThemeMatrix } from '${root}/test/visual-projects.mjs';
  for (const {brand,mode} of createThemeMatrix()) console.log(brand + '-' + mode);
")"
pids=()
while read -r theme; do
  cp -a --reflink=auto "$root/storybook-static" "$work/$theme"
  (
    started=$SECONDS
    A11Y_THEME="$theme" A11Y_STORYBOOK_PORT="$((6006 + ${#pids[@]}))" \
      A11Y_STORYBOOK_STATIC_DIR="$work/$theme" A11Y_STORYBOOK_REBUILD=0 \
      A11Y_REPORT_OUTPUT_DIR="$root/a11y-report/$theme" \
      bash "$root/scripts/storybook-a11y.sh"
    echo "CI timing: a11y $theme $((SECONDS - started))s"
  ) &
  pids+=("$!")
done <<< "$themes"
status=0
for pid in "${pids[@]}"; do wait "$pid" || status=1; done
exit "$status"
