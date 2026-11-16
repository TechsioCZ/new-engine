#!/usr/bin/env bash
set -euo pipefail
: "${SHARD:?}" "${SCOPE:?}" "${BUNDLE:?}" "${BUNDLES:?}" "${RUNNER_TEMP:?}"

# Each suite owns its container, server, and output. Running two browser pools
# together slowed both on the hosted runner, so suites share four cores in turn.
run_group() {
  local group="$1" workers="$2" shard="$SHARD"
  if [ "$group" = mobile ]; then shard=1/1; fi
  export PLAYWRIGHT_GROUP="$group" PLAYWRIGHT_WORKERS="$workers"
  export PLAYWRIGHT_OUTPUT_DIR="$RUNNER_TEMP/component-results/$group"
  local started=$SECONDS
  if [ "$SCOPE" = full ]; then
    unset VISUAL_CHANGED_FILES_FROM
    VISUAL_RELEASE_READINESS=1 PLAYWRIGHT_RELEASE_SHARD="$shard" node libs/ui/scripts/run-component-tests.mjs
  else
    VISUAL_CHANGED_BEHAVIOR=1 PLAYWRIGHT_SHARD="$shard" node libs/ui/scripts/run-component-tests.mjs
  fi
  echo "CI timing: $group $((SECONDS - started))s"
  local out="$RUNNER_TEMP/component-reports/ui-$group-shard-${shard%/*}"
  mkdir -p "$out"
  cp "$PLAYWRIGHT_OUTPUT_DIR"/test-results/visual-reports/*.json "$out/"
}

# Build/load before parallel invocations so a cold cache never builds twice.
image="$(node libs/ui/scripts/run-component-tests.mjs --print-plan | jq -er .image)"
if ! docker image inspect "$image" >/dev/null 2>&1; then
  time docker build -t "$image" -f docker/development/playwright/Dockerfile .
fi

if [ "${CI_BUNDLE_CPU:-}" = 1 ]; then
  echo "Runner CPU quota: $(cat /sys/fs/cgroup/cpu.max)"
  vmstat -w 10 &
  monitor_pid=$!
  trap 'kill "$monitor_pid" 2>/dev/null || true' EXIT
fi

run_group desktop 4
run_group visual 4
if [ "$BUNDLE" = "$BUNDLES" ]; then run_group mobile 4; fi
