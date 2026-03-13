zane::require_common_commands() {
  ci::require_command jq
  ci::require_command curl
  stack_inputs_exists
  stack_inputs_require_parser
}

zane::require_manifest() {
  MANIFEST_PATH="$STACK_MANIFEST_PATH"
  manifest_exists
  manifest_require_parser
}

zane::require_stack_inputs() {
  stack_inputs_exists
  stack_inputs_require_parser
}

zane::require_file() {
  local path="$1"
  [[ -f "$path" ]] || ci::die "Required file not found: $path"
}

zane::require_lane() {
  local lane="$1"
  case "$lane" in
    preview|main) ;;
    *) ci::die "Lane must be preview or main." ;;
  esac
}

zane::require_numeric() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || ci::die "${label} must be numeric."
}

zane::normalize_csv_or_empty() {
  local value="${1-}"
  ci::normalize_csv "$value"
}

zane::merge_csv_values() {
  local existing="${1-}"
  local current="${2-}"
  zane::normalize_csv_or_empty "${existing},${current}"
}

zane::csv_to_lines() {
  local csv="${1-}"
  if [[ -n "$csv" ]]; then
    tr ',' '\n' <<<"$csv"
  fi
}

zane::preview_environment_name() {
  local pr_number="$1"
  local prefix="${ZANE_PREVIEW_ENV_PREFIX:-pr-}"
  printf '%s%s\n' "$prefix" "$pr_number"
}

zane::service_json() {
  local service_id="$1"
  local service_json
  service_json="$(ci_zane_service_json "$service_id")"
  [[ -n "$service_json" ]] || ci::die "Service is not deployable or missing Zane metadata: ${service_id}"
  printf '%s\n' "$service_json"
}

zane::service_allowed_in_lane() {
  local service_json="$1"
  local lane="$2"
  jq -e --arg lane "$lane" '(.deploy_lanes | index($lane)) != null' <<<"$service_json" >/dev/null
}

zane::csv_from_lookup_in_manifest_order() {
  local lane="$1"
  local lookup_name="$2"
  local service_id
  local out=""

  # shellcheck disable=SC2178,SC1083
  declare -n lookup_ref="$lookup_name"

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    if [[ "${lookup_ref[$service_id]:-false}" == "true" ]]; then
      if [[ -n "$out" ]]; then
        out+=",${service_id}"
      else
        out="${service_id}"
      fi
    fi
  done < <(ci_zane_lane_service_ids "$lane")

  printf '%s\n' "$out"
}

zane::services_json_from_csv() {
  local csv="$1"
  local tmp_file
  local service_id

  tmp_file="$(mktemp)"
  trap "rm -f '$tmp_file'" RETURN

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    zane::service_json "$service_id" >>"$tmp_file"
    printf '\n' >>"$tmp_file"
  done < <(zane::csv_to_lines "$csv")

  if [[ ! -s "$tmp_file" ]]; then
    printf '[]\n'
    return 0
  fi

  jq -sc '.' "$tmp_file"
}

zane::service_slugs_json_from_csv() {
  local csv="$1"
  local services_json
  services_json="$(zane::services_json_from_csv "$csv")"
  jq -c '[.[].service_slug]' <<<"$services_json"
}

zane::preview_service_sets_json() {
  local cloned_ids_csv=""
  local excluded_ids_csv=""
  local cloned_services_json='[]'
  local excluded_services_json='[]'

  cloned_ids_csv="$(paste -sd, < <(ci_zane_preview_cloned_service_ids) || true)"
  excluded_ids_csv="$(paste -sd, < <(ci_zane_preview_excluded_service_ids) || true)"
  cloned_ids_csv="$(zane::normalize_csv_or_empty "$cloned_ids_csv")"
  excluded_ids_csv="$(zane::normalize_csv_or_empty "$excluded_ids_csv")"
  cloned_services_json="$(zane::services_json_from_csv "$cloned_ids_csv")"
  excluded_services_json="$(zane::services_json_from_csv "$excluded_ids_csv")"

  jq -cn \
    --arg preview_cloned_service_ids_csv "$cloned_ids_csv" \
    --arg preview_excluded_service_ids_csv "$excluded_ids_csv" \
    --argjson preview_cloned_services "$cloned_services_json" \
    --argjson preview_excluded_services "$excluded_services_json" \
    '{
      preview_cloned_service_ids_csv: $preview_cloned_service_ids_csv,
      preview_excluded_service_ids_csv: $preview_excluded_service_ids_csv,
      preview_cloned_services: $preview_cloned_services,
      preview_excluded_services: $preview_excluded_services
    }'
}

zane::preview_service_slug_sets_json() {
  local preview_cloned_service_ids_csv="$1"
  local preview_excluded_service_ids_csv="$2"

  jq -cn \
    --argjson expected_preview_service_slugs "$(zane::service_slugs_json_from_csv "$preview_cloned_service_ids_csv")" \
    --argjson excluded_preview_service_slugs "$(zane::service_slugs_json_from_csv "$preview_excluded_service_ids_csv")" \
    '{
      expected_preview_service_slugs: $expected_preview_service_slugs,
      excluded_preview_service_slugs: $excluded_preview_service_slugs
    }'
}

zane::service_ids_json_from_csv() {
  local csv="$1"
  jq -c -Rn --arg csv "$(zane::normalize_csv_or_empty "$csv")" 'if $csv == "" then [] else ($csv | split(",")) end'
}

zane::deployment_refs_json() {
  local deployments_json_path="${1-}"
  local deployments_json_inline="${2-}"

  if [[ -n "$deployments_json_path" ]]; then
    zane::require_file "$deployments_json_path"
    jq -c '.services // []' "$deployments_json_path"
    return 0
  fi

  if [[ -n "$deployments_json_inline" ]]; then
    jq -c '.services // []' <<<"$deployments_json_inline"
    return 0
  fi

  printf '[]\n'
}

zane::plan_stage_numbers() {
  local plan_json="$1"
  zane::require_file "$plan_json"

  jq -r '
    [.deploy_services[]?.deploy_stage // 100]
    | unique
    | sort
    | .[]
  ' "$plan_json"
}

zane::stage_services_csv_from_plan() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -r --argjson stage "$stage" '
    [.deploy_services[] | select((.deploy_stage // 100) == $stage) | .id] | join(",")
  ' "$plan_json"
}

zane::stage_has_service() {
  local plan_json="$1"
  local stage="$2"
  local service_id="$3"
  zane::require_file "$plan_json"

  jq -e --argjson stage "$stage" --arg service_id "$service_id" '
    any(.deploy_services[]?; (.id == $service_id) and ((.deploy_stage // 100) == $stage))
  ' "$plan_json" >/dev/null
}

zane::stage_has_meili_consumers() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -e --argjson stage "$stage" '
    any(.deploy_services[]?; ((.deploy_stage // 100) == $stage) and (((.consumes.meili_frontend_key // false) == true) or ((.consumes.meili_backend_key // false) == true)))
  ' "$plan_json" >/dev/null
}

zane::merge_deployments_json_file() {
  local source_json="$1"
  local dest_json="$2"
  local merged_json

  zane::require_file "$source_json"
  zane::require_file "$dest_json"

  merged_json="$(jq -cn \
    --argjson existing "$(jq -c '.services // []' "$dest_json")" \
    --argjson current "$(jq -c '.services // []' "$source_json")" \
    '{
      services: (($existing + $current) | unique_by(.service_id + ":" + .deployment_hash))
    }')"
  zane::write_json_file "$dest_json" "$merged_json"
}

zane::filter_targets_for_git_commit() {
  local targets_json="$1"
  local env_overrides_json="$2"
  local desired_commit_sha="${3-}"
  local filtered_targets_json="$4"
  local filtered_env_overrides_json="$5"
  local adopted_deployments_json="$6"

  zane::require_file "$targets_json"
  zane::require_file "$env_overrides_json"

  if [[ -z "$desired_commit_sha" ]]; then
    cp "$targets_json" "$filtered_targets_json"
    cp "$env_overrides_json" "$filtered_env_overrides_json"
    printf '%s\n' '{"services":[]}' >"$adopted_deployments_json"
    return 0
  fi

  jq -cn \
    --arg desired_commit_sha "$desired_commit_sha" \
    --argjson targets "$(jq -c '.services // []' "$targets_json")" \
    --argjson env_overrides "$(jq -c '.services // []' "$env_overrides_json")" \
    '
      def env_override_map:
        reduce $env_overrides[]? as $item ({}; .[$item.service_id] = ($item.env // {}));
      def overrides_match($current_env; $expected_env):
        all(($expected_env | to_entries)[]; (($current_env[.key] // null) == .value));
      def tracks_branch_head($configured_commit_sha):
        (($configured_commit_sha // "" | ascii_upcase) == "" or ($configured_commit_sha // "" | ascii_upcase) == "HEAD");
      def skip_reason($target; $expected_env):
        if ($target.service_type != "git") then null
        elif ($target.has_unapplied_changes // false) then "pending_changes"
        elif ((tracks_branch_head($target.configured_commit_sha) | not) and (($target.configured_commit_sha // "") != $desired_commit_sha)) then "configured_commit_sha_mismatch"
        elif (
          (($target.current_production_deployment // null) != null)
          and (($target.current_production_deployment.status // "" | ascii_upcase) == "HEALTHY")
          and (($target.current_production_deployment.commit_sha // "") == $desired_commit_sha)
          and overrides_match(($target.current_production_deployment.env // {}); $expected_env)
        ) then "already_current_commit"
        elif (
          (($target.active_deployment // null) != null)
          and (($target.active_deployment.commit_sha // "") == $desired_commit_sha)
          and overrides_match(($target.active_deployment.env // {}); $expected_env)
        ) then "reuse_in_progress_deployment"
        elif (($target.current_production_deployment.status // "" | ascii_upcase) != "HEALTHY") then "current_deployment_not_healthy"
        elif (($target.current_production_deployment.commit_sha // "") != $desired_commit_sha) then "commit_sha_mismatch"
        elif (overrides_match(($target.current_production_deployment.env // {}); $expected_env) | not) then "env_override_drift"
        else "no_current_healthy_deployment"
        end;
      (env_override_map) as $expected
      | ($targets | map(
          . as $target
          | ($expected[$target.service_id] // {}) as $service_env
          | . + {skip_reason: skip_reason($target; $service_env)}
        )) as $classified
      | {
          services: [$classified[] | select(.skip_reason != "already_current_commit" and .skip_reason != "reuse_in_progress_deployment") | del(.skip_reason)],
          skipped_services: [$classified[] | select(.skip_reason == "already_current_commit") | {
            service_id,
            service_slug,
            reason: .skip_reason,
            deployment_hash: (.current_production_deployment.deployment_hash // null),
            commit_sha: (.current_production_deployment.commit_sha // null)
          }],
          adopted_deployments: [$classified[] | select(.skip_reason == "reuse_in_progress_deployment") | {
            service_id,
            service_slug,
            deployment_hash: (.active_deployment.deployment_hash // null),
            status: (.active_deployment.status // null)
          }]
        }
    ' >"$filtered_targets_json"

  jq -cn \
    --argjson filtered_targets "$(jq -c '.services // []' "$filtered_targets_json")" \
    --argjson env_overrides "$(jq -c '.services // []' "$env_overrides_json")" \
    '
      ($filtered_targets | map(.service_id)) as $allowed
      | {
          services: [$env_overrides[] | select(.service_id as $id | $allowed | index($id))]
        }
    ' >"$filtered_env_overrides_json"

  jq -cn \
    --argjson adopted "$(jq -c '.adopted_deployments // []' "$filtered_targets_json")" \
    '{services: $adopted}' >"$adopted_deployments_json"
}

zane::stage_plan_json() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -c --argjson stage "$stage" '
    . as $plan
    | .deploy_services = [.deploy_services[] | select((.deploy_stage // 100) == $stage)]
    | .deploy_services_csv = ([.deploy_services[].id] | join(","))
  ' "$plan_json"
}

zane::write_json_file() {
  local path="$1"
  local payload="$2"
  printf '%s\n' "$payload" >"$path"
}

zane::json_file_csv() {
  local json_file="$1"
  local jq_filter="$2"

  zane::require_file "$json_file"
  jq -r "$jq_filter" "$json_file"
}

zane::merge_csv_from_json_file() {
  local existing_csv="${1-}"
  local json_file="$2"
  local jq_filter="$3"
  local current_csv=""

  current_csv="$(zane::json_file_csv "$json_file" "$jq_filter")"
  zane::merge_csv_values "$existing_csv" "$current_csv"
}

zane::allocate_temp_file_vars() {
  local var_name=""
  local tmp_path=""

  for var_name in "$@"; do
    tmp_path="$(mktemp)"
    printf -v "$var_name" '%s' "$tmp_path"
  done
}

zane::install_temp_file_cleanup_trap() {
  local var_name=""
  local tmp_path=""
  local cleanup_cmd="rm -f"

  for var_name in "$@"; do
    tmp_path="${!var_name:-}"
    [[ -n "$tmp_path" ]] || continue
    cleanup_cmd+=" '$tmp_path'"
  done

  trap "$cleanup_cmd" RETURN
}

zane::api_request() {
  local method="$1"
  local path="$2"
  local payload="${3-}"
  local base_url="$4"
  local api_token="$5"
  local tmp_body
  local http_code
  local safe_body_json
  local curl_args

  [[ -n "$base_url" ]] || ci::die "zane-operator base URL is required."
  [[ -n "$api_token" ]] || ci::die "zane-operator API token is required."

  ci::gha_mask "$base_url"
  ci::gha_mask "$api_token"

  base_url="${base_url%/}"
  tmp_body="$(mktemp)"
  trap "rm -f '$tmp_body'" RETURN

  curl_args=(
    --silent
    --show-error
    --output "$tmp_body"
    --write-out '%{http_code}'
    --connect-timeout 20
    --max-time 20
    -H "Authorization: Bearer ${api_token}"
    -H 'Accept: application/json'
    -H 'Content-Type: application/json'
    -X "$method"
  )

  if [[ "$method" == "GET" ]]; then
    curl_args+=(
      --retry 3
      --retry-all-errors
      --retry-delay 2
    )
  fi

  if [[ -n "$payload" ]]; then
    curl_args+=(--data "$payload")
  fi

  http_code="$(
    curl \
      "${curl_args[@]}" \
      "${base_url}${path}"
  )" || {
    local status=$?
    ci::die "zane-operator request failed before a successful HTTP response (curl exit ${status})."
  }

  if ! jq -e . >/dev/null 2>&1 <"$tmp_body"; then
    ci::die "zane-operator returned non-JSON response (HTTP ${http_code})."
  fi

  safe_body_json="$(jq -c '
    walk(
      if type == "object" then
        with_entries(
          if (.key | ascii_downcase | test("password|token|secret|key|url")) and (.value | type == "string")
          then .value = "***redacted***"
          else .
          end
        )
      else .
      end
    )
  ' <"$tmp_body")"

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    ci::die "zane-operator request returned HTTP ${http_code}: ${safe_body_json}"
  fi

  jq -c . <"$tmp_body"
}
