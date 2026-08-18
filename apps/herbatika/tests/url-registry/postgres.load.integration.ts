import { performance } from "node:perf_hooks"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  command,
  createEntityRequest,
  entityIdentity,
} from "@/lib/url-registry/behavior-helpers"
import {
  ENTITY_COUNT,
  explainIndexNames,
  loadMixedFixture,
  ROUTE_COUNT,
  STATIC_COUNT,
} from "./postgres-load-fixture"
import {
  createPostgresTestContext,
  type PostgresTestContext,
} from "./postgres-test-harness"

const COMMAND_SAMPLE_SIZE = 100
const COMMAND_SAMPLE_BUDGET_MS = 45_000
const BULK_FIXTURE_BUDGET_MS = 120_000
const HOT_READ_BUDGET_MS = 15_000

let context: PostgresTestContext

beforeAll(() => {
  context = createPostgresTestContext()
})

beforeEach(async () => {
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

describe.sequential("PostgreSQL 18.1 URL registry scale gate", () => {
  it("keeps a 100-command public-adapter sample within its robust budget", async () => {
    const namespace = context.nextNamespace("throughput")
    const keys: string[] = []
    const started = performance.now()
    for (let offset = 0; offset < COMMAND_SAMPLE_SIZE; offset += 10) {
      await Promise.all(
        Array.from({ length: 10 }, (_, index) => offset + index).map(
          (position) => {
            const token = String(position + 1).padStart(3, "0")
            const identity = entityIdentity(`${namespace}-${token}`)
            const key = `${namespace}:create:${token}`
            keys.push(key)
            return context.registry.createEntityRoute(
              command(
                key,
                createEntityRequest({
                  identity,
                  eventId: key,
                  slug: `${namespace}-${token}`,
                  equivalenceKey: `${namespace}:${token}`,
                  market: (["sk", "cz", "hu", "ro"] as const)[position % 4],
                })
              )
            )
          }
        )
      )
    }
    const elapsedMs = performance.now() - started

    expect(elapsedMs).toBeLessThan(COMMAND_SAMPLE_BUDGET_MS)
    await expect(context.countArtifacts(keys)).resolves.toEqual({
      audits: COMMAND_SAMPLE_SIZE,
      commands: COMMAND_SAMPLE_SIZE,
      outbox: COMMAND_SAMPLE_SIZE,
    })
  })

  it("commits 20k mixed routes and proves hot reads use intended indexes", async () => {
    const elapsedMs = await loadMixedFixture(context)
    expect(elapsedMs).toBeLessThan(BULK_FIXTURE_BUDGET_MS)

    const counts = await context.admin.query(`SELECT
      (SELECT count(*) FROM url_registry.url_route)::integer AS routes,
      (SELECT count(*) FROM url_registry.url_entity_slug)::integer AS slugs,
      (SELECT count(*) FROM url_registry.static_route_path)::integer AS paths`)
    expect(counts.rows[0]).toEqual({
      paths: STATIC_COUNT,
      routes: ROUTE_COUNT,
      slugs: ENTITY_COUNT,
    })

    const sample = await context.admin.query(`SELECT route.market, route.kind,
      route.source_system AS "sourceSystem",
      route.source_type AS "sourceType", route.source_id AS "sourceId",
      slug.normalized_slug AS "normalizedSlug"
      FROM url_registry.url_route AS route
      JOIN url_registry.url_entity_slug AS slug ON slug.route_id = route.id
      WHERE route.market = 'sk' AND route.kind = 'product'
      ORDER BY route.source_id
      LIMIT 100`)
    expect(sample.rows).toHaveLength(100)

    const readStarted = performance.now()
    for (let offset = 0; offset < sample.rows.length; offset += 10) {
      const batch = sample.rows.slice(offset, offset + 10)
      const resolved = await context.registry.resolveMany({
        market: "sk",
        kind: "product",
        normalizedSlugs: batch.map(({ normalizedSlug }) => normalizedSlug),
      })
      expect(resolved.kind).toBe("found")
      if (resolved.kind === "found") {
        expect(
          resolved.value.every(({ result }) => result.kind === "found")
        ).toBe(true)
      }
    }
    expect(performance.now() - readStarted).toBeLessThan(HOT_READ_BUDGET_MS)

    const hot = sample.rows[0]
    const slugIndexes = await explainIndexNames(
      context,
      `SELECT route.id
         FROM url_registry.url_entity_slug AS slug
         JOIN url_registry.url_route AS route ON route.id = slug.route_id
        WHERE slug.market = $1 AND slug.kind = $2
          AND slug.normalized_slug = $3`,
      [hot.market, hot.kind, hot.normalizedSlug]
    )
    expect(slugIndexes).toContain("url_entity_slug_market_kind_slug_unique")

    const identityIndexes = await explainIndexNames(
      context,
      `SELECT id FROM url_registry.url_route
        WHERE market = $1 AND source_system = $2 AND source_type = $3
          AND source_id = $4 AND status = 'active'`,
      [hot.market, hot.sourceSystem, hot.sourceType, hot.sourceId]
    )
    expect(identityIndexes).toContain("url_route_source_identity_unique")

    const staticParent = await context.admin.query(`SELECT market,
      parent_route_key AS "parentRouteKey"
      FROM url_registry.static_route_path
      WHERE parent_route_key IS NOT NULL
      ORDER BY market, parent_route_key
      LIMIT 1`)
    const parent = staticParent.rows[0]
    const taxonomyIndexes = await explainIndexNames(
      context,
      `SELECT route_key FROM url_registry.static_route_path
        WHERE market = $1 AND parent_route_key = $2
          AND disposition = 'current'
        ORDER BY route_key`,
      [parent.market, parent.parentRouteKey]
    )
    expect(taxonomyIndexes).toContain("static_route_path_taxonomy_idx")
  })
})
