import { describe, expect, it } from "vitest"
import { POPULATION_MARKETS } from "../../src/lib/url-registry/population/manifest-contracts"
import { collectFourMarketConvergenceArtifacts } from "./convergence-collector"
import {
  fourMarketManifestFixture,
  fourMarketRowsFixture,
  segmentRegistryRefsFixture,
  TEST_MIGRATION_LEDGER_SHA256,
} from "./convergence-test-fixture"

const collect = (rows = fourMarketRowsFixture()) =>
  collectFourMarketConvergenceArtifacts({
    identity: {
      environmentId: "zane-production",
      generatedAt: "2026-08-21T08:05:00.000Z",
      releaseId: "release-2026-08-21",
    },
    manifest: fourMarketManifestFixture(),
    rows,
    segmentRegistryByMarket: segmentRegistryRefsFixture(),
  })

describe("four-market convergence collector", () => {
  it("proves exact live outbox, URLR route, cursor, receipt, and taxonomy state", () => {
    const artifacts = collect()

    for (const proof of [artifacts.urlRegistry, artifacts.staticTaxonomy]) {
      expect(proof).toMatchObject({
        environmentId: "zane-production",
        migrationLedgerSha256: TEST_MIGRATION_LEDGER_SHA256,
        releaseId: "release-2026-08-21",
        state: "converged",
      })
      expect(Object.keys(proof.markets)).toEqual(POPULATION_MARKETS)
    }
    expect(artifacts.urlRegistry.markets.sk.expectedCount).toBe(4)
    expect(artifacts.staticTaxonomy.markets.ro.expectedCount).toBeGreaterThan(0)
  })

  it.each([
    "pending",
    "processing",
    "failed",
  ])("rejects an outbox event in %s state", (status) => {
    const rows = fourMarketRowsFixture()
    const events = [{ ...rows.events[0], status }, ...rows.events.slice(1)]
    expect(() => collect({ ...rows, events })).toThrow("is not converged")
  })

  it.each([
    [
      "receipt",
      (rows: ReturnType<typeof fourMarketRowsFixture>) => ({
        ...rows,
        receipts: rows.receipts.slice(1),
      }),
    ],
    [
      "cursor",
      (rows: ReturnType<typeof fourMarketRowsFixture>) => ({
        ...rows,
        cursors: rows.cursors.slice(1),
      }),
    ],
    [
      "entity route",
      (rows: ReturnType<typeof fourMarketRowsFixture>) => ({
        ...rows,
        entityRoutes: rows.entityRoutes.slice(1),
      }),
    ],
  ])("rejects a missing %s", (_label, mutate) => {
    expect(() => collect(mutate(fourMarketRowsFixture()))).toThrow(
      "is not converged"
    )
  })

  it("rejects terminal source-version and static taxonomy drift", () => {
    const rows = fourMarketRowsFixture()
    expect(() =>
      collect({
        ...rows,
        events: [
          { ...rows.events[0], sourceVersion: "wrong" },
          ...rows.events.slice(1),
        ],
      })
    ).toThrow("is not converged")
    expect(() =>
      collect({
        ...rows,
        staticRoutes: [
          { ...rows.staticRoutes[0], segment: "wrong-segment" },
          ...rows.staticRoutes.slice(1),
        ],
      })
    ).toThrow("is not converged")
  })

  it("rejects duplicate receipts, cursors, and unknown outbox events", () => {
    const rows = fourMarketRowsFixture()
    expect(() =>
      collect({ ...rows, receipts: [...rows.receipts, rows.receipts[0]] })
    ).toThrow("is not converged")
    expect(() =>
      collect({
        ...rows,
        receipts: [
          ...rows.receipts,
          { ...rows.receipts[0], streamSequence: 2 },
        ],
      })
    ).toThrow("is not converged")
    expect(() =>
      collect({ ...rows, cursors: [...rows.cursors, rows.cursors[0]] })
    ).toThrow("is not converged")
    expect(() =>
      collect({
        ...rows,
        events: [{ ...rows.events[0], streamId: "unknown" }],
      })
    ).toThrow("outbox event has no in-scope stream")
  })

  it("enforces terminal receipt action and command bindings", () => {
    const rows = fourMarketRowsFixture()
    for (const receipt of [
      {
        ...rows.receipts[0],
        action: "noop-source-present",
        commandIdempotencyKey: null,
      },
      { ...rows.receipts[0], action: "unpublished" },
    ]) {
      expect(() =>
        collect({ ...rows, receipts: [receipt, ...rows.receipts.slice(1)] })
      ).not.toThrow()
    }
    for (const receipt of [
      { ...rows.receipts[0], action: "requires-publication" },
      { ...rows.receipts[0], action: "published", commandIdempotencyKey: null },
      { ...rows.receipts[0], action: "noop-source-present" },
    ]) {
      expect(() =>
        collect({ ...rows, receipts: [receipt, ...rows.receipts.slice(1)] })
      ).toThrow("is not converged")
    }
  })
})
