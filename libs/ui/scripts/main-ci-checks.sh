#!/usr/bin/env bash
set -euo pipefail
: "${NODE24_BIN:?}" "${NODE26_BIN:?}" "${UI_SCOPE:?}" "${RUNNER_TEMP:?}"
BASE_PATH="$PATH"
AFFECTED_PROJECTS="${AFFECTED_PROJECTS-}"
ui_affected=false
if [[ ",$AFFECTED_PROJECTS," == *",ui-kit,"* ]]; then ui_affected=true; fi
cpu_report="$(dirname "${BASH_SOURCE[0]}")/ci-cpu.sh"

# Both workloads use this runner's one install. Download Chromium once before
# either workload starts, rather than racing two installs into the same cache.
if [ "$UI_SCOPE" != none ] || [ "$ui_affected" = true ]; then
  timeout 420 pnpm --dir libs/ui exec playwright install --only-shell chromium
fi
index_hash() {
  node -e 'const fs=require("node:fs"),c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync("libs/ui/storybook-static/index.json")).digest("hex"))'
}
index_before=""
if [ "$UI_SCOPE" != none ]; then index_before="$(index_hash)"; fi

scan() {
  env PATH="$NODE26_BIN:$BASE_PATH" A11Y_THEME="$1" A11Y_SHARD="$2" \
    A11Y_REPORT_FAIL_ON_VIOLATIONS=true A11Y_THEME_COUNT=3 \
    A11Y_TEST_WORKERS=4 A11Y_SCOPE="$UI_SCOPE" \
    A11Y_CHANGED_FILES_FROM="$RUNNER_TEMP/ui-changed-files/changed-files.txt" \
    pnpm --dir libs/ui storybook:a11y
  bash "$cpu_report" "a11y $1 $2"
}

# business-light runs beside the checks, then akros-light; bundle 2 scans
# n1-light (ci-ui-plan.mjs). The scans are this job's longest path.
a11y_pid=""
if [ "$UI_SCOPE" != none ]; then
  (
    scan business-light 1/1
    scan akros-light 1/1
  ) &
  a11y_pid=$!
fi

# Measured on 4-vCPU runners: CPU pressure stayed above 70% while both ran,
# and business-light took 186-272s beside the checks, while one theme scan
# alone takes 129-193s. Everything forked from here on (the checks) yields
# the CPU to the scans.
renice -n 10 -p $$ >/dev/null

(
  export PATH="$NODE24_BIN:$BASE_PATH"
  pnpm lint:nx
  projects="$(AFFECTED="$AFFECTED_PROJECTS" PREPARED="@techsio/storefront-data" node -e 'const a=(process.env.AFFECTED||"").split(",");const p=new Set(process.env.PREPARED.split(","));process.stdout.write(a.filter(x=>p.has(x)).join(","))')"
  if [ -n "$projects" ]; then
    ./node_modules/.bin/nubx --node nx run-many -t typecheck --projects="$projects"
  fi
  ./node_modules/.bin/nubx --node nx affected -t lint
  ./node_modules/.bin/nubx --node nx affected -t test --exclude=ui-kit
  if [ "$ui_affected" = true ]; then
    pnpm --dir libs/ui test:visual-assets
  fi
  export PATH="$NODE26_BIN:$BASE_PATH"
  pnpm --dir libs/ui typecheck
  pnpm --dir libs/ui test
  pnpm --dir libs/ui validate:tokens
  # Build and validate the package once, on the toolchain that publishes it,
  # then import that packed build on the engines minimum.
  pnpm --dir libs/ui check:package
  if [ "$ui_affected" = true ]; then
    PATH="$NODE24_BIN:$BASE_PATH" pnpm --dir libs/ui check:consumer
  fi
  bash "$cpu_report" "workspace checks"
) &
checks_pid=$!

# Wait for both children even when one fails. A later successful check must
# never hide the other workload's failure.
status=0
wait "$checks_pid" || status=1
if [ -n "$a11y_pid" ]; then wait "$a11y_pid" || status=1; fi
if [ "$UI_SCOPE" != none ] && [ "$(index_hash)" != "$index_before" ]; then
  echo "::error::The shared Storybook index was mutated during validation"
  status=1
fi
exit "$status"
