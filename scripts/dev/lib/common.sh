#!/usr/bin/env bash
set -euo pipefail

common::die() {
  echo "$*" >&2
  exit 1
}

common::warn() {
  local message="$*"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::warning::%s\n' "$message" >&2
  else
    printf 'warning: %s\n' "$message" >&2
  fi
}

common::info() {
  local message="$*"
  if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::notice::%s\n' "$message" >&2
  else
    printf '%s\n' "$message" >&2
  fi
}

common::require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || common::die "Required command not found: $cmd"
}

common::gha_output() {
  local key="$1"
  local value="${2-}"

  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$key" "$value" >>"$GITHUB_OUTPUT"
  fi
}

common::gha_mask() {
  local value="${1-}"

  if [[ -n "$value" && "${GITHUB_ACTIONS:-}" == "true" ]]; then
    printf '::add-mask::%s\n' "$value"
  fi
}

common::require_env() {
  local var_name="$1"
  local human_name="${2:-$1}"

  if [[ -z "${!var_name:-}" ]]; then
    common::die "Missing required environment variable: ${var_name} (${human_name})."
  fi
}

common::mask_env_if_present() {
  local var_name="$1"
  common::gha_mask "${!var_name:-}"
}

common::normalize_csv() {
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

common::json_compact() {
  common::require_command jq
  jq -c . <<<"${1:-null}"
}

common::url_host() {
  local url="${1-}"
  local host="$url"

  host="${host#http://}"
  host="${host#https://}"
  host="${host%%/*}"
  host="${host%%:*}"
  printf '%s\n' "$host"
}

common::host_uses_local_caddy_ca() {
  local host="${1-}"
  [[ "$host" == *.127-0-0-1.sslip.io || "$host" == *.localhost ]]
}

common::configure_node_extra_ca_certs_from_local_caddy() {
  local needs_local_ca="false"
  local url
  local host
  local temp_cert

  if [[ -n "${NODE_EXTRA_CA_CERTS:-}" ]]; then
    return 0
  fi

  for url in "$@"; do
    [[ -n "$url" ]] || continue
    host="$(common::url_host "$url")"
    if common::host_uses_local_caddy_ca "$host"; then
      needs_local_ca="true"
      break
    fi
  done

  [[ "$needs_local_ca" == "true" ]] || return 0
  command -v docker >/dev/null 2>&1 || common::die "Local sslip routes require docker so the helper can trust the zane-local-caddy CA."

  temp_cert="$(mktemp "${TMPDIR:-/tmp}/new-engine-caddy-root.XXXXXX.crt")"
  if ! docker cp zane-local-caddy:/data/caddy/pki/authorities/local/root.crt "$temp_cert" >/dev/null 2>&1; then
    rm -f "$temp_cert"
    common::die "Unable to read the local Caddy root CA from zane-local-caddy. Start the local Caddy container or set NODE_EXTRA_CA_CERTS explicitly."
  fi

  export NODE_EXTRA_CA_CERTS="$temp_cert"
  export NEW_ENGINE_NODE_EXTRA_CA_CERTS_TEMP="$temp_cert"
  common::info "Using local Caddy root CA for Node TLS trust."
}

common::cleanup_node_extra_ca_certs_temp() {
  local temp_cert="${NEW_ENGINE_NODE_EXTRA_CA_CERTS_TEMP:-}"

  if [[ -n "$temp_cert" && -f "$temp_cert" ]]; then
    rm -f "$temp_cert"
  fi
}
