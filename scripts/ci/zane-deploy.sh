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
  plan                   Resolve requested + coupled deploy services from the manifest
  render-env-overrides   Render preview env override payload from prepare outputs
  resolve-environment    Resolve preview/main Zane environment through zane-operator
  resolve-targets        Resolve per-service Zane deploy targets for the environment
  apply-env-overrides    Apply rendered env overrides to target services
  trigger                Trigger deploys for resolved target services
  run-preview            Run preview deploy orchestration end-to-end
  run-main               Run main deploy orchestration end-to-end
  verify                 Verify preview/main deploy contract through zane-operator

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
    plan)
      zane::cmd_plan "$@"
      ;;
    render-env-overrides)
      zane::cmd_render_env_overrides "$@"
      ;;
    resolve-environment)
      zane::cmd_resolve_environment "$@"
      ;;
    resolve-targets)
      zane::cmd_resolve_targets "$@"
      ;;
    apply-env-overrides)
      zane::cmd_apply_env_overrides "$@"
      ;;
    trigger)
      zane::cmd_trigger "$@"
      ;;
    run-preview)
      zane::cmd_run_preview "$@"
      ;;
    run-main)
      zane::cmd_run_main "$@"
      ;;
    verify)
      zane::cmd_verify "$@"
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
