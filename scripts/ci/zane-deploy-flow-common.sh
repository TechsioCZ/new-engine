zane::write_empty_deployments_json_file() {
  local path="$1"
  printf '%s\n' '{"services":[]}' >"$path"
}

zane::write_default_meili_provision_json_file() {
  local path="$1"
  printf '%s\n' '{"meili_keys_provisioned":false}' >"$path"
}
