#!/usr/bin/env bash

dev::load_env_file() {
  local env_file="$1"
  local require_mode="${2:-required}"

  if [[ ! -f "$env_file" ]]; then
    if [[ "$require_mode" == "optional" ]]; then
      return 0
    fi
    common::die "Env file not found: $env_file"
  fi

  set +u
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
  set -u
}

dev::first_non_empty() {
  local value
  for value in "$@"; do
    if [[ -n "${value:-}" ]]; then
      printf '%s\n' "$value"
      return 0
    fi
  done
  printf '\n'
}

dev::confirm_or_die() {
  local expected_phrase="$1"
  local summary="$2"
  local prompt

  if [[ "${ASSUME_YES:-false}" == "true" ]]; then
    return 0
  fi

  printf '%s\n' "$summary" >&2
  printf 'Type "%s" to continue: ' "$expected_phrase" >&2
  read -r prompt
  [[ "$prompt" == "$expected_phrase" ]] || common::die "Confirmation rejected."
}

zane::request() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local response_file status
  local url="${ZANE_BASE_URL%/}/api/${path#/}"
  local curl_args=()

  response_file="$(mktemp)"
  curl_args=(
    --silent
    --show-error
    --location
    --request "$method"
    --cookie "$COOKIE_JAR"
    --cookie-jar "$COOKIE_JAR"
    --header 'Accept: application/json'
    --output "$response_file"
    --write-out '%{http_code}'
  )

  if [[ "$method" != "GET" ]]; then
    curl_args+=(--header "X-CSRFToken: ${CSRF_TOKEN}")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(
      --header 'Content-Type: application/json'
      --data "$body"
    )
  fi

  curl_args+=("$url")
  status="$(curl "${curl_args[@]}")"
  printf '%s\t%s\n' "$status" "$response_file"
}

zane::api() {
  local method="$1"
  local path="$2"
  local body="${3-}"
  local status response_file

  read -r status response_file < <(zane::request "$method" "$path" "$body")
  if [[ ! "$status" =~ ^2 ]]; then
    {
      echo "Zane API request failed:"
      echo "  ${method} ${path}"
      echo "  HTTP ${status}"
      echo "  response: $(cat "$response_file")"
    } >&2
    rm -f "$response_file"
    exit 1
  fi

  cat "$response_file"
  rm -f "$response_file"
}

zane::api_optional_get() {
  local path="$1"
  local status response_file

  read -r status response_file < <(zane::request GET "$path")
  if [[ "$status" == "404" ]]; then
    rm -f "$response_file"
    return 1
  fi
  if [[ ! "$status" =~ ^2 ]]; then
    {
      echo "Zane API request failed:"
      echo "  GET ${path}"
      echo "  HTTP ${status}"
      echo "  response: $(cat "$response_file")"
    } >&2
    rm -f "$response_file"
    exit 1
  fi

  cat "$response_file"
  rm -f "$response_file"
}

zane::refresh_csrf_token() {
  CSRF_TOKEN="$(
    awk '
      $6 == "csrftoken" {
        token = $7
      }
      END {
        print token
      }
    ' "$COOKIE_JAR"
  )"
}

zane::login() {
  local login_payload

  COOKIE_JAR="$(mktemp)"
  trap 'rm -f "$COOKIE_JAR"' EXIT

  zane::api GET "csrf/" >/dev/null
  zane::refresh_csrf_token
  [[ -n "$CSRF_TOKEN" ]] || common::die "Unable to obtain CSRF token from Zane."

  login_payload="$(
    jq -n \
      --arg username "$ZANE_USERNAME" \
      --arg password "$ZANE_PASSWORD" \
      '{username: $username, password: $password}'
  )"

  zane::api POST "auth/login/" "$login_payload" >/dev/null
  zane::refresh_csrf_token
}

zane::get_service() {
  local service_slug="$1"
  zane::api_optional_get "projects/${PROJECT_SLUG}/${ENVIRONMENT_NAME}/service-details/${service_slug}/"
}

zane::service_env_value() {
  local service_json="$1"
  local key="$2"
  jq -r --arg key "$key" '
    [.env_variables[]? | select(.key == $key) | .value] | last // empty
  ' <<<"$service_json"
}
