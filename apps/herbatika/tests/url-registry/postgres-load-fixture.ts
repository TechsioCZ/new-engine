import { performance } from "node:perf_hooks"
import type { PostgresTestContext } from "./postgres-test-harness"

export const ROUTE_COUNT = 20_000
export const ENTITY_COUNT = ROUTE_COUNT / 2
export const STATIC_COUNT = ROUTE_COUNT / 2

const insertEntityRoutes = `INSERT INTO url_registry.url_route (
  id, market, kind, target_type, source_system, source_type, source_id,
  static_route_key, equivalence_key, index_policy, status,
  successor_route_id, version
) SELECT
  md5('urlr-load-entity-route-' || n)::uuid,
  (ARRAY['sk', 'cz', 'hu', 'ro'])[((n - 1) % 4) + 1],
  (ARRAY['product', 'category', 'brand', 'collection', 'campaign',
         'article', 'page'])[((n - 1) % 7) + 1],
  'entity', 'medusa', 'product',
  'load-entity-' || lpad(n::text, 5, '0'), NULL,
  'load-equivalence-' || lpad(n::text, 5, '0'),
  CASE WHEN n % 5 = 0 THEN 'noindex' ELSE 'indexable' END,
  'active', NULL, 1
FROM generate_series(1, $1::integer) AS fixture(n)`

const insertEntitySlugs = `INSERT INTO url_registry.url_entity_slug (
  id, market, kind, normalized_slug, route_id, disposition,
  normalization_version
) SELECT
  md5('urlr-load-entity-slug-' || n)::uuid,
  (ARRAY['sk', 'cz', 'hu', 'ro'])[((n - 1) % 4) + 1],
  (ARRAY['product', 'category', 'brand', 'collection', 'campaign',
         'article', 'page'])[((n - 1) % 7) + 1],
  'load-product-' || lpad(n::text, 5, '0'),
  md5('urlr-load-entity-route-' || n)::uuid,
  'current', 1
FROM generate_series(1, $1::integer) AS fixture(n)`

const insertStaticRoutes = `INSERT INTO url_registry.url_route (
  id, market, kind, target_type, source_system, source_type, source_id,
  static_route_key, equivalence_key, index_policy, status,
  successor_route_id, version
) SELECT
  md5('urlr-load-static-route-' || n)::uuid,
  (ARRAY['sk', 'cz', 'hu', 'ro'])[((n - 1) % 4) + 1],
  'static', 'static', NULL, NULL, NULL,
  'load-static-' || lpad(n::text, 5, '0'), NULL,
  CASE WHEN n % 5 = 0 THEN 'noindex' ELSE 'indexable' END,
  'active', NULL, 1
FROM generate_series(1, $1::integer) AS fixture(n)`

const insertStaticPaths = `INSERT INTO url_registry.static_route_path (
  id, market, route_key, parent_route_key, segment, match_mode,
  disposition, introduced_in_version
) SELECT
  md5('urlr-load-static-path-' || n)::uuid,
  (ARRAY['sk', 'cz', 'hu', 'ro'])[((n - 1) % 4) + 1],
  'load-static-' || lpad(n::text, 5, '0'),
  CASE
    WHEN n = (((n - 1) / 400) * 400) + ((n - 1) % 4) + 1 THEN NULL
    ELSE 'load-static-' || lpad(
      ((((n - 1) / 400) * 400) + ((n - 1) % 4) + 1)::text, 5, '0'
    )
  END,
  'static-segment-' || lpad(n::text, 5, '0'),
  CASE WHEN n % 11 = 0 THEN 'prefix' ELSE 'exact' END,
  'current', 1
FROM generate_series(1, $1::integer) AS fixture(n)`

export const loadMixedFixture = async (context: PostgresTestContext) => {
  const client = await context.admin.connect()
  const started = performance.now()
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL statement_timeout = '120s'")
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query("SET CONSTRAINTS ALL DEFERRED")
    // Scale-only fixture: behavior and races always use the public adapter.
    await client.query(insertEntityRoutes, [ENTITY_COUNT])
    await client.query(insertEntitySlugs, [ENTITY_COUNT])
    await client.query(insertStaticRoutes, [STATIC_COUNT])
    await client.query(insertStaticPaths, [STATIC_COUNT])
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
      // Preserve the fixture error; the isolated gate container is disposable.
    })
    throw error
  } finally {
    client.release()
  }
  await context.admin.query("ANALYZE url_registry.url_route")
  await context.admin.query("ANALYZE url_registry.url_entity_slug")
  await context.admin.query("ANALYZE url_registry.static_route_path")
  return performance.now() - started
}

type ExplainNode = Readonly<{
  "Index Name"?: unknown
  Plans?: readonly ExplainNode[]
}>

const collectIndexNames = (node: ExplainNode): string[] => [
  ...(typeof node["Index Name"] === "string" ? [node["Index Name"]] : []),
  ...(Array.isArray(node.Plans)
    ? node.Plans.flatMap((child) => collectIndexNames(child))
    : []),
]

export const explainIndexNames = async (
  context: PostgresTestContext,
  sql: string,
  values: readonly unknown[]
): Promise<readonly string[]> => {
  const explained = await context.admin.query(
    `EXPLAIN (FORMAT JSON, COSTS OFF) ${sql}`,
    [...values]
  )
  const document = explained.rows[0]?.["QUERY PLAN"]
  if (!(Array.isArray(document) && document[0]?.Plan)) {
    throw new Error("PostgreSQL returned an invalid JSON execution plan")
  }
  return collectIndexNames(document[0].Plan as ExplainNode)
}
