zane::require_secret_generation_commands() {
  ci::require_command openssl
  ci::require_command tr
  ci::require_command head
}

zane::generate_secret_value() {
  local generator_json="$1"
  local kind=""
  kind="$(jq -r '.kind // empty' <<<"$generator_json")"

  case "$kind" in
    random_hex)
      local bytes=""
      bytes="$(jq -r '.bytes // empty' <<<"$generator_json")"
      [[ "$bytes" =~ ^[0-9]+$ ]] || ci::die "random_hex generator requires numeric bytes."
      openssl rand -hex "$bytes"
      ;;
    random_base64url)
      local bytes=""
      bytes="$(jq -r '.bytes // empty' <<<"$generator_json")"
      [[ "$bytes" =~ ^[0-9]+$ ]] || ci::die "random_base64url generator requires numeric bytes."
      openssl rand -base64 "$bytes" | tr '+/' '-_' | tr -d '=\n'
      ;;
    random_alnum)
      local length=""
      local value=""
      local remaining=""
      local chunk=""
      length="$(jq -r '.length // empty' <<<"$generator_json")"
      [[ "$length" =~ ^[0-9]+$ ]] || ci::die "random_alnum generator requires numeric length."
      while [[ "${#value}" -lt "$length" ]]; do
        remaining="$((length - ${#value}))"
        chunk="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c "$remaining" || true)"
        value+="$chunk"
      done
      printf '%s' "$value"
      ;;
    *)
      ci::die "Unsupported secret generator kind: ${kind:-<empty>}"
      ;;
  esac
}

zane::generate_preview_random_once_secrets_json() {
  zane::require_stack_inputs
  zane::require_secret_generation_commands

  local definitions_json=""
  definitions_json="$(stack_inputs_preview_random_once_secrets_json)"

  jq -c '.[]' <<<"$definitions_json" | while IFS= read -r secret_json; do
    [[ -n "$secret_json" ]] || continue
    local value=""
    value="$(zane::generate_secret_value "$(jq -c '.generator // {}' <<<"$secret_json")")"
    ci::gha_mask "$value"
    jq -cn \
      --argjson secret "$secret_json" \
      --arg value "$value" \
      '$secret + {value: $value}'
  done | jq -sc '.'
}

zane::search_credentials_target_env_var() {
  local output_name="$1"
  local service_id="$2"
  local env_var=""

  env_var="$(stack_inputs_runtime_provider_target_env_var "$ZANE_SEARCH_CREDENTIALS_PROVIDER_ID" "$output_name" "$service_id")"
  [[ -n "$env_var" ]] || ci::die "Missing ${output_name} target env var for provider ${ZANE_SEARCH_CREDENTIALS_PROVIDER_ID}."
  printf '%s\n' "$env_var"
}

zane::preview_random_once_env_json_for_service() {
  local service_id="$1"
  local preview_random_once_secrets_json="${2:-[]}"

  jq -cn \
    --arg service_id "$service_id" \
    --argjson preview_secrets "$preview_random_once_secrets_json" \
    '
      reduce (
        $preview_secrets[]? as $secret
        | $secret.targets[]?
        | select(.service_id == $service_id)
        | {env_var, value: $secret.value}
      ) as $item
      ({};
        . + {($item.env_var): $item.value}
      )
    '
}

zane::preview_random_once_env_keys_json_for_service() {
  local service_id="$1"
  local preview_random_once_secrets_json="${2:-[]}"

  jq -cn \
    --arg service_id "$service_id" \
    --argjson preview_secrets "$preview_random_once_secrets_json" \
    '
      [
        $preview_secrets[]?
        | .targets[]?
        | select(.service_id == $service_id)
        | .env_var
      ]
    '
}

zane::render_preview_db_env_json() {
  local service_id="$1"
  local service_json="$2"
  local lane="$3"
  local preview_db_name="$4"
  local preview_db_user="$5"
  local preview_db_password="$6"
  local current_env_json="${7:-}"

  if [[ -z "$current_env_json" ]]; then
    current_env_json='{}'
  fi

  if [[ "$lane" != "preview" ]] || ! jq -e '.consumes.preview_db == true' <<<"$service_json" >/dev/null; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  [[ -n "$preview_db_name" ]] || ci::die "Preview DB name is required for service ${service_id}."
  [[ -n "$preview_db_user" ]] || ci::die "Preview DB user is required for service ${service_id}."
  [[ -n "$preview_db_password" ]] || ci::die "Preview DB password is required for service ${service_id}."

  jq -cn \
    --argjson current "$current_env_json" \
    --arg db_name "$preview_db_name" \
    --arg db_user "$preview_db_user" \
    --arg db_password "$preview_db_password" \
    '$current + {
      DC_MEDUSA_APP_DB_NAME: $db_name,
      DC_MEDUSA_APP_DB_USER: $db_user,
      DC_MEDUSA_APP_DB_PASSWORD: $db_password
    }'
}

zane::render_preview_random_once_env_json() {
  local service_id="$1"
  local lane="$2"
  local preview_random_once_secrets_json="${3:-[]}"
  local current_env_json="${4:-}"

  if [[ -z "$current_env_json" ]]; then
    current_env_json='{}'
  fi

  if [[ "$lane" != "preview" ]]; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  jq -cn \
    --argjson current "$current_env_json" \
    --argjson preview_env "$(zane::preview_random_once_env_json_for_service "$service_id" "$preview_random_once_secrets_json")" \
    '$current + $preview_env'
}

zane::render_meili_frontend_env_json() {
  local service_id="$1"
  local service_json="$2"
  local lane="$3"
  local meili_frontend_key="$4"
  local meili_frontend_env_var="$5"
  local current_env_json="${6:-}"

  if [[ -z "$current_env_json" ]]; then
    current_env_json='{}'
  fi

  if ! jq -e '.consumes.meili_frontend_key == true' <<<"$service_json" >/dev/null; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  if [[ "$lane" != "main" && -z "$meili_frontend_key" ]]; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  [[ -n "$meili_frontend_key" ]] || ci::die "Frontend Meili key is required for service ${service_id}."

  jq -cn \
    --argjson current "$current_env_json" \
    --arg env_var "$meili_frontend_env_var" \
    --arg value "$meili_frontend_key" \
    '$current + {($env_var): $value}'
}

zane::render_meili_backend_env_json() {
  local service_id="$1"
  local service_json="$2"
  local lane="$3"
  local meili_backend_key="$4"
  local meili_backend_env_var="$5"
  local current_env_json="${6:-}"

  if [[ -z "$current_env_json" ]]; then
    current_env_json='{}'
  fi

  if ! jq -e '.consumes.meili_backend_key == true' <<<"$service_json" >/dev/null; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  if [[ "$lane" != "main" && -z "$meili_backend_key" ]]; then
    printf '%s\n' "$current_env_json"
    return 0
  fi

  [[ -n "$meili_backend_key" ]] || ci::die "Backend Meili key is required for service ${service_id}."

  jq -cn \
    --argjson current "$current_env_json" \
    --arg env_var "$meili_backend_env_var" \
    --arg value "$meili_backend_key" \
    '$current + {($env_var): $value}'
}

zane::required_persisted_env_json() {
  local lane="$1"
  local services_csv="$2"
  local meili_frontend_env_var=""
  local meili_backend_env_var=""
  local random_once_secrets_json='[]'
  local tmp_items=""

  zane::require_lane "$lane"
  zane::require_stack_inputs
  services_csv="$(zane::normalize_csv_or_empty "$services_csv")"
  meili_frontend_env_var="$(zane::search_credentials_target_env_var frontend_key n1)"
  meili_backend_env_var="$(zane::search_credentials_target_env_var backend_key medusa-be)"
  random_once_secrets_json="$(stack_inputs_preview_random_once_secrets_json)"

  tmp_items="$(mktemp)"
  trap "rm -f '$tmp_items'" RETURN

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue

    local service_json=""
    local service_slug=""
    local env_keys_json='[]'
    service_json="$(zane::service_json "$service_id")"
    service_slug="$(jq -r '.service_slug' <<<"$service_json")"

    if [[ "$lane" == "preview" ]] && jq -e '.consumes.preview_db == true' <<<"$service_json" >/dev/null; then
      env_keys_json="$(jq -cn \
        --argjson current "$env_keys_json" \
        '$current + ["DC_MEDUSA_APP_DB_NAME", "DC_MEDUSA_APP_DB_USER", "DC_MEDUSA_APP_DB_PASSWORD"]')"
    fi

    if jq -e '.consumes.meili_frontend_key == true' <<<"$service_json" >/dev/null; then
      env_keys_json="$(jq -cn \
        --argjson current "$env_keys_json" \
        --arg key "$meili_frontend_env_var" \
        '$current + [$key]')"
    fi

    if jq -e '.consumes.meili_backend_key == true' <<<"$service_json" >/dev/null; then
      env_keys_json="$(jq -cn \
        --argjson current "$env_keys_json" \
        --arg key "$meili_backend_env_var" \
        '$current + [$key]')"
    fi

    if [[ "$lane" == "preview" ]]; then
      env_keys_json="$(jq -cn \
        --argjson current "$env_keys_json" \
        --argjson preview_secret_keys "$(zane::preview_random_once_env_keys_json_for_service "$service_id" "$random_once_secrets_json")" \
        '
          $current + $preview_secret_keys
        ')"
    fi

    env_keys_json="$(jq -c 'map(select(length > 0)) | unique' <<<"$env_keys_json")"
    if [[ "$(jq 'length' <<<"$env_keys_json")" -gt 0 ]]; then
      jq -cn \
        --arg service_id "$service_id" \
        --arg service_slug "$service_slug" \
        --argjson env_keys "$env_keys_json" \
        '{service_id:$service_id, service_slug:$service_slug, env_keys:$env_keys}' >>"$tmp_items"
      printf '\n' >>"$tmp_items"
    fi
  done < <(zane::csv_to_lines "$services_csv")

  if [[ -s "$tmp_items" ]]; then
    jq -sc '.' "$tmp_items"
  else
    printf '%s\n' '[]'
  fi
}

zane::provision_preview_meili_keys() {
  local project_slug="$1"
  local environment_name="$2"
  local service_slug="$3"
  local base_url="$4"
  local api_token="$5"
  local dry_run="${6:-false}"

  [[ -n "$project_slug" ]] || ci::die "Project slug is required for preview Meili provisioning."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required for preview Meili provisioning."
  [[ -n "$service_slug" ]] || ci::die "Service slug is required for preview Meili provisioning."

  local backend_env_var=""
  local frontend_env_var=""
  backend_env_var="$(zane::search_credentials_target_env_var backend_key medusa-be)"
  frontend_env_var="$(zane::search_credentials_target_env_var frontend_key n1)"

  if [[ "$dry_run" == "true" ]]; then
    jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --arg service_slug "$service_slug" \
      --arg backend_env_var "$backend_env_var" \
      --arg frontend_env_var "$frontend_env_var" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        service_slug: $service_slug,
        meili_url: ("https://" + $service_slug + ".dry-run.invalid"),
        backend_key: "dry-run:preview:backend",
        backend_env_var: $backend_env_var,
        backend_created: true,
        backend_updated: false,
        frontend_key: "dry-run:preview:frontend",
        frontend_env_var: $frontend_env_var,
        frontend_created: true,
        frontend_updated: false
      }'
    return 0
  fi

  local payload
  payload="$(jq -cn \
    --arg project_slug "$project_slug" \
    --arg environment_name "$environment_name" \
    --arg service_slug "$service_slug" \
    '{project_slug:$project_slug, environment_name:$environment_name, service_slug:$service_slug}')"
  zane::api_request POST "/v1/zane/meilisearch/provision-keys" "$payload" "$base_url" "$api_token"
}

zane::cmd_render_env_overrides() {
  zane::require_manifest
  ci::require_command jq

  local lane=""
  local services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local preview_random_once_secrets_json=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local meili_backend_key=""
  local output_json=""
  local service_id
  local service_json
  local service_slug
  local env_json
  local item_json
  local tmp_items

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --services-csv)
        services_csv="${2-}"
        shift 2
        ;;
      --preview-db-name)
        preview_db_name="${2-}"
        shift 2
        ;;
      --preview-db-user)
        preview_db_user="${2-}"
        shift 2
        ;;
      --preview-db-password)
        preview_db_password="${2-}"
        shift 2
        ;;
      --preview-random-once-secrets-json)
        preview_random_once_secrets_json="${2-}"
        shift 2
        ;;
      --meili-frontend-key)
        meili_frontend_key="${2-}"
        shift 2
        ;;
      --meili-frontend-env-var)
        meili_frontend_env_var="${2-}"
        shift 2
        ;;
      --meili-backend-key)
        meili_backend_key="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh render-env-overrides --lane <preview|main> --services-csv <csv> [options]

Options:
  --preview-db-name <name>
  --preview-db-user <user>
  --preview-db-password <password>
  --preview-random-once-secrets-json <json>
  --meili-frontend-key <key>
  --meili-frontend-env-var <env-var>   default: resolved from stack-inputs provider contract
  --meili-backend-key <key>
  --output-json <path>                 write full JSON with sensitive values to path

Behavior:
  - stdout always prints a redacted JSON payload
  - preview-only values are ignored for main lane
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for render-env-overrides: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  zane::require_stack_inputs
  services_csv="$(zane::normalize_csv_or_empty "$services_csv")"
  preview_random_once_secrets_json="${preview_random_once_secrets_json:-[]}"
  meili_frontend_env_var="${meili_frontend_env_var:-$(zane::search_credentials_target_env_var frontend_key n1)}"
  local meili_backend_env_var=""
  meili_backend_env_var="$(zane::search_credentials_target_env_var backend_key medusa-be)"

  ci::gha_mask "$preview_db_password"
  ci::gha_mask "$meili_frontend_key"
  ci::gha_mask "$meili_backend_key"

  tmp_items="$(mktemp)"
  trap "rm -f '$tmp_items'" RETURN

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    service_json="$(zane::service_json "$service_id")"
    service_slug="$(jq -r '.service_slug' <<<"$service_json")"
    env_json='{}'
    env_json="$(zane::render_preview_db_env_json \
      "$service_id" \
      "$service_json" \
      "$lane" \
      "$preview_db_name" \
      "$preview_db_user" \
      "$preview_db_password" \
      "$env_json")"
    env_json="$(zane::render_preview_random_once_env_json \
      "$service_id" \
      "$lane" \
      "$preview_random_once_secrets_json" \
      "$env_json")"
    env_json="$(zane::render_meili_frontend_env_json \
      "$service_id" \
      "$service_json" \
      "$lane" \
      "$meili_frontend_key" \
      "$meili_frontend_env_var" \
      "$env_json")"
    env_json="$(zane::render_meili_backend_env_json \
      "$service_id" \
      "$service_json" \
      "$lane" \
      "$meili_backend_key" \
      "$meili_backend_env_var" \
      "$env_json")"

    if [[ "$(jq 'length' <<<"$env_json")" -gt 0 ]]; then
      item_json="$(jq -cn \
        --arg service_id "$service_id" \
        --arg service_slug "$service_slug" \
        --argjson env "$env_json" \
        '{service_id:$service_id, service_slug:$service_slug, env:$env}')"
      printf '%s\n' "$item_json" >>"$tmp_items"
    fi
  done < <(zane::csv_to_lines "$services_csv")

  local services_json
  if [[ -s "$tmp_items" ]]; then
    services_json="$(jq -sc '.' "$tmp_items")"
  else
    services_json='[]'
  fi

  local full_json
  full_json="$(jq -cn --arg lane "$lane" --argjson services "$services_json" '{lane:$lane, services:$services}')"

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$full_json"
  fi

  local override_service_ids_csv
  override_service_ids_csv="$(jq -r '[.services[].service_id] | join(",")' <<<"$full_json")"
  ci::gha_output override_service_ids_csv "$override_service_ids_csv"
  ci::gha_output override_service_count "$(jq -r '.services | length' <<<"$full_json")"

  jq -c '
    .services |= map(.env |= with_entries(.value = "***redacted***"))
  ' <<<"$full_json"
}
