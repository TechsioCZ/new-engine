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
