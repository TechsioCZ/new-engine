export const ROUTE_COLUMNS = `id, market, kind, target_type, source_system,
  source_type, source_id, static_route_key, equivalence_key, index_policy,
  status, successor_route_id, version, created_at, updated_at`

export const SLUG_COLUMNS = `id, market, kind, normalized_slug, route_id,
  disposition, normalization_version, created_at`

export const STATIC_PATH_COLUMNS = `id, market, route_key, parent_route_key,
  segment, match_mode, disposition, introduced_in_version, created_at`
