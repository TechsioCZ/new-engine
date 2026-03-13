#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_MANIFEST_PATH="${STACK_MANIFEST_PATH:-${ROOT_DIR}/config/stack-manifest.yaml}"
STACK_INPUTS_PATH="${STACK_INPUTS_PATH:-${ROOT_DIR}/config/stack-inputs.yaml}"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"
# shellcheck source=scripts/lib/stack-manifest.sh
source "${ROOT_DIR}/scripts/lib/stack-manifest.sh"
# shellcheck source=scripts/lib/stack-inputs.sh
source "${ROOT_DIR}/scripts/lib/stack-inputs.sh"
# shellcheck source=scripts/ci/zane-deploy-common.sh
source "${ROOT_DIR}/scripts/ci/zane-deploy-common.sh"
# shellcheck source=scripts/ci/zane-deploy-commands.sh
source "${ROOT_DIR}/scripts/ci/zane-deploy-commands.sh"
# shellcheck source=scripts/ci/zane-deploy-env-inputs.sh
source "${ROOT_DIR}/scripts/ci/zane-deploy-env-inputs.sh"
# shellcheck source=scripts/ci/zane-deploy-verify-wait.sh
source "${ROOT_DIR}/scripts/ci/zane-deploy-verify-wait.sh"
# shellcheck source=scripts/ci/zane-deploy-run-flows.sh
source "${ROOT_DIR}/scripts/ci/zane-deploy-run-flows.sh"

zane::usage() {
  cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh <command> [options]

Commands:
  trigger                Trigger deploys for resolved target services
  run-preview            Run preview deploy orchestration end-to-end
  run-main               Run main deploy orchestration end-to-end

Global notes:
  - networked commands use ZANE_OPERATOR_BASE_URL + ZANE_OPERATOR_API_TOKEN unless flags override them
  - --dry-run skips network calls and emits deterministic fake responses for contract validation
  - sensitive env override values are masked before any artifact/output write
EOF
}

ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT="${ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT:-10}"
ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT="${ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT:-900}"
ZANE_SEARCH_CREDENTIALS_PROVIDER_ID="${ZANE_SEARCH_CREDENTIALS_PROVIDER_ID:-search_credentials}"

main() {
  local command="${1:-}"
  shift || true

  case "$command" in
    trigger)
      zane::cmd_trigger "$@"
      ;;
    run-preview)
      zane::cmd_run_preview "$@"
      ;;
    run-main)
      zane::cmd_run_main "$@"
      ;;
    -h|--help|help|"")
      zane::usage
      ;;
    *)
      zane::usage >&2
      ci::die "Unknown command: ${command}"
      ;;
  esac
}

main "$@"
