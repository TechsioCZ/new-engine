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

dev::run_ctl() {
  local ctl_dist ctl_root

  ctl_root="${REPO_ROOT}/apps/new-engine-ctl"
  ctl_dist="${ctl_root}/dist/cli.js"
  common::require_command node
  common::require_command pnpm

  if [[ ! -f "$ctl_dist" ]] || find "$ctl_root/src" "$ctl_root/config" -type f -newer "$ctl_dist" -print -quit | grep -q .; then
    (
      cd "$ctl_root"
      pnpm run build >/dev/null
    )
  fi

  node "$ctl_dist" "$@"
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

zane::bootstrap_zane_project_inspect_json() {
  local service_slugs=("$@")
  local settings_json projects_json environment_json services_json

  settings_json="$(zane::api GET "settings/")"
  projects_json="$(zane::api GET "projects/")"
  environment_json="$(zane::api_optional_get "projects/${PROJECT_SLUG}/environment-details/${ENVIRONMENT_NAME}/" || true)"

  services_json="$({
    local service_slug service_json
    for service_slug in "${service_slugs[@]}"; do
      if [[ -n "$environment_json" ]]; then
        service_json="$(zane::get_service "$service_slug" || true)"
      else
        service_json=""
      fi

      jq -cn \
        --arg service_slug "$service_slug" \
        --argjson details "${service_json:-null}" \
        '{
          service_slug: $service_slug,
          exists: ($details != null),
          details: $details
        }'
    done
  } | jq -cs '.' )"

  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg environment_name "$ENVIRONMENT_NAME" \
    --argjson settings "$settings_json" \
    --argjson projects "$projects_json" \
    --argjson environment "${environment_json:-null}" \
    --argjson services "$services_json" \
    '{
      project_slug: $project_slug,
      environment_name: $environment_name,
      project_exists: any($projects[]?; .slug == $project_slug),
      environment_exists: ($environment != null),
      settings: {
        root_domain: ($settings.root_domain // null),
        app_domain: ($settings.app_domain // null)
      },
      shared_variables: [($environment.variables // [])[] | {key, value}],
      services: $services
    }'
}

zane::bootstrap_preview_template_db_inspect_json() {
  local db_service_slug="$1"
  local operator_service_slug="$2"
  local projects_json environment_json db_service_json operator_service_json

  projects_json="$(zane::api GET "projects/")"
  environment_json="$(zane::api_optional_get "projects/${PROJECT_SLUG}/environment-details/${ENVIRONMENT_NAME}/" || true)"

  if [[ -n "$environment_json" ]]; then
    db_service_json="$(zane::get_service "$db_service_slug" || true)"
    operator_service_json="$(zane::get_service "$operator_service_slug" || true)"
  else
    db_service_json=""
    operator_service_json=""
  fi

  jq -cn \
    --arg project_slug "$PROJECT_SLUG" \
    --arg environment_name "$ENVIRONMENT_NAME" \
    --arg db_service_slug "$db_service_slug" \
    --arg operator_service_slug "$operator_service_slug" \
    --argjson projects "$projects_json" \
    --argjson environment "${environment_json:-null}" \
    --argjson db_service "${db_service_json:-null}" \
    --argjson operator_service "${operator_service_json:-null}" \
    '{
      project_slug: $project_slug,
      environment_name: $environment_name,
      project_exists: any($projects[]?; .slug == $project_slug),
      environment_exists: ($environment != null),
      db_service: {
        service_slug: $db_service_slug,
        exists: ($db_service != null),
        details: $db_service
      },
      operator_service: {
        service_slug: $operator_service_slug,
        exists: ($operator_service != null),
        details: $operator_service
      }
    }'
}

zane::service_env_value() {
  local service_json="$1"
  local key="$2"
  jq -r --arg key "$key" '
    [.env_variables[]? | select(.key == $key) | .value] | last // empty
  ' <<<"$service_json"
}
