#!/usr/bin/env bash
set -euo pipefail

ci::die() {
  echo "$*" >&2
  exit 1
}

ci::warn() {
  local message="$*"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::warning::%s\n' "$message" >&2
  else
    printf 'warning: %s\n' "$message" >&2
  fi
}

ci::require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || ci::die "Required command not found: $cmd"
}

ci::gha_output() {
  local key="$1"
  local value="${2-}"

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$key" "$value" >>"$GITHUB_OUTPUT"
  fi
}

ci::gha_mask() {
  local value="${1-}"

  if [[ -n "$value" && "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

ci::require_env() {
  local var_name="$1"
  local human_name="${2:-$1}"

  if [[ -z "${!var_name:-}" ]]; then
    ci::die "Missing required environment variable: ${var_name} (${human_name})."
  fi
}

ci::mask_env_if_present() {
  local var_name="$1"
  ci::gha_mask "${!var_name:-}"
}

ci::normalize_csv() {
  local value="${1-}"
  awk -F',' '
    {
      for (i = 1; i <= NF; i++) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i)
        if ($i != "" && !seen[$i]++) {
          if (out != "") {
            out = out "," $i
          } else {
            out = $i
          }
        }
      }
    }
    END {
      print out
    }
  ' <<<"$value"
}

ci::json_compact() {
  ci::require_command jq
  jq -c . <<<"${1:-null}"
}
