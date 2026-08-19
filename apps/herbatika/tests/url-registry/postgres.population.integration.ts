import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { parsePopulationManifest } from "@/lib/url-registry/population/manifest"
import { applyUrlRegistryPopulation } from "@/lib/url-registry/population/population-apply"
import { planUrlRegistryPopulation } from "@/lib/url-registry/population/population-plan"
import { hashPopulationStaticTaxonomy } from "@/lib/url-registry/population/static-taxonomy"
import {
  createPostgresTestContext,
  type PostgresTestContext,
} from "./postgres-test-harness"

let context: PostgresTestContext

beforeAll(async () => {
  context = createPostgresTestContext()
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

const manifest = () =>
  parsePopulationManifest({
    bindings: [
      { locale: "sk-SK", market: "sk", salesChannelId: "sc_sk" },
      { locale: "cs-CZ", market: "cz", salesChannelId: "sc_cz" },
      { locale: "hu-HU", market: "hu", salesChannelId: "sc_hu" },
      { locale: "ro-RO", market: "ro", salesChannelId: "sc_ro" },
    ],
    completeInventory: true,
    entities: [],
    generatedAt: "2026-08-19T08:00:00.000Z",
    generator: "pg18-population-integration-v1",
    schemaVersion: 1,
    sourceSnapshotHash: `sha256:${"a".repeat(64)}`,
    taxonomyApproval: {
      hash: hashPopulationStaticTaxonomy(),
      markets: Object.fromEntries(
        ["sk", "cz", "hu", "ro"].map((market) => [
          market,
          {
            editorialApproval: `test-editorial:${market}`,
            legalApproval: `test-legal:${market}`,
          },
        ])
      ),
    },
  })

describe.sequential("PostgreSQL 18.1 initial population", () => {
  it("persists command receipts and converges on an identical rerun", async () => {
    await context.reset()
    const input = manifest()
    const initial = await planUrlRegistryPopulation(input, context.registry)
    expect(initial.blockers).toEqual([])
    expect(initial.creates.length).toBeGreaterThan(0)

    const applied = await applyUrlRegistryPopulation(input, context.registry, {
      batchSize: 25,
    })
    expect(applied.applied).toBe(initial.creates.length)
    expect(applied.auditIds).toHaveLength(initial.creates.length)

    const commandCount = await context.admin.query(
      "SELECT count(*)::int AS count FROM url_registry.url_registry_command WHERE idempotency_key LIKE 'population:v1:%'"
    )
    expect(commandCount.rows[0]?.count).toBe(initial.creates.length)

    const converged = await planUrlRegistryPopulation(input, context.registry)
    expect(converged.blockers).toEqual([])
    expect(converged.creates).toEqual([])
    expect(converged.noops).toHaveLength(initial.creates.length)

    const rerun = await applyUrlRegistryPopulation(input, context.registry, {
      batchSize: 100,
    })
    expect(rerun).toMatchObject({ applied: 0, replayed: 0 })
  })
})
