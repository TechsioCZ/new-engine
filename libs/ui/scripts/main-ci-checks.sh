#!/usr/bin/env bash
set -euo pipefail
: "${NODE24_BIN:?}" "${NODE26_BIN:?}" "${UI_SCOPE:?}" "${RUNNER_TEMP:?}"
BASE_PATH="$PATH"
AFFECTED_PROJECTS="${AFFECTED_PROJECTS-}"
ui_affected=false
if [[ ",$AFFECTED_PROJECTS," == *",ui-kit,"* ]]; then ui_affected=true; fi

# Workspace asset tests need host Chromium; behavior uses the cached image.
if [ "$ui_affected" = true ]; then
  timeout 420 pnpm --dir libs/ui exec playwright install --only-shell chromium
fi
index_hash() {
  node -e 'const fs=require("node:fs"),c=require("node:crypto");process.stdout.write(c.createHash("sha256").update(fs.readFileSync("libs/ui/storybook-static/index.json")).digest("hex"))'
}
index_before=""
if [ "$UI_SCOPE" != none ]; then index_before="$(index_hash)"; fi

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
    pnpm --dir libs/ui check:package
  fi
  export PATH="$NODE26_BIN:$BASE_PATH"
  pnpm --dir libs/ui typecheck
  pnpm --dir libs/ui test
  pnpm --dir libs/ui validate:tokens
  pnpm --dir libs/ui check:package
) &
checks_pid=$!

browser_pid=""
if [ "$UI_SCOPE" != none ]; then
  env PATH="$NODE26_BIN:$BASE_PATH" BUNDLE_GROUP=behavior SHARD=1/1 \
    SCOPE="$UI_SCOPE" \
    VISUAL_CHANGED_FILES_FROM="$RUNNER_TEMP/ui-changed-files/changed-files.txt" \
    bash libs/ui/scripts/component-ci-bundle.sh &
  browser_pid=$!
fi

# Wait for both children even when one fails. A later successful check must
# never hide the other workload's failure.
status=0
wait "$checks_pid" || status=1
if [ -n "$browser_pid" ]; then wait "$browser_pid" || status=1; fi
if [ "$UI_SCOPE" != none ] && [ "$(index_hash)" != "$index_before" ]; then
  echo "::error::The shared Storybook index was mutated during validation"
  status=1
fi
exit "$status"
