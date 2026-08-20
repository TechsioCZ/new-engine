import { demoStaticRoutes } from "./static-taxonomy-preflight-contract"

const sqlLiteral = (value: null | string) =>
  value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`

export const buildStaticTaxonomyPreflightSql = () => {
  const values = demoStaticRoutes()
    .map(
      (route) =>
        `    (${[
          route.routeKey,
          route.equivalenceKey,
          route.parentRouteKey,
          route.segment,
          route.matchMode,
        ]
          .map(sqlLiteral)
          .join(", ")})`
    )
    .join(",\n")
  return `-- Read-only URLR evidence. Execute with psql -X -A -t -f <this-file>.
WITH expected(
  route_key,
  equivalence_key,
  parent_route_key,
  segment,
  match_mode
) AS (
  VALUES
${values}
), evidence AS (
  SELECT
    expected.route_key,
    route.id,
    route.equivalence_key,
    route.index_policy,
    route.status,
    route.version,
    COALESCE(paths.current_paths, '[]'::jsonb) AS current_paths
  FROM expected
  LEFT JOIN url_registry.url_route AS route
    ON route.market = 'ro'
   AND route.target_type = 'static'
   AND route.static_route_key = expected.route_key
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'parentRouteKey', path.parent_route_key,
        'segment', path.segment,
        'matchMode', path.match_mode
      ) ORDER BY path.id
    ) AS current_paths
    FROM url_registry.static_route_path AS path
    WHERE path.market = 'ro'
      AND path.route_key = expected.route_key
      AND path.disposition = 'current'
  ) AS paths ON true
)
SELECT COALESCE(
  jsonb_agg(
    jsonb_build_object(
      'routeKey', route_key,
      'routeId', id,
      'equivalenceKey', equivalence_key,
      'indexPolicy', index_policy,
      'status', status,
      'version', version,
      'currentPaths', current_paths
    ) ORDER BY route_key
  ),
  '[]'::jsonb
)::text
FROM evidence;
`
}
