import { parsePopulationManifest } from "../../src/lib/url-registry/population/manifest"
import {
  POPULATION_CATALOG_KINDS,
  POPULATION_LOCALE_BY_MARKET,
  POPULATION_MARKETS,
} from "../../src/lib/url-registry/population/manifest-contracts"
import { hashPopulationStaticTaxonomy } from "../../src/lib/url-registry/population/static-taxonomy"
import type { FourMarketConvergenceRows } from "./convergence-db"
import { expectedStaticTaxonomyProjections } from "./static-taxonomy-convergence"
import { expectedUrlrCatalogProjections } from "./urlr-convergence"

export const TEST_MIGRATION_LEDGER_SHA256 = "b".repeat(64)

export const segmentRegistryRefsFixture = () =>
  Object.fromEntries(
    POPULATION_MARKETS.map((market) => [
      market,
      {
        ref: `segment-registry-g1/${market}.json`,
        sha256: "c".repeat(64),
      },
    ])
  ) as Record<
    (typeof POPULATION_MARKETS)[number],
    Readonly<{ ref: string; sha256: string }>
  >

export const fourMarketManifestFixture = () =>
  parsePopulationManifest({
    bindings: POPULATION_MARKETS.map((market) => ({
      locale: POPULATION_LOCALE_BY_MARKET[market],
      market,
      salesChannelId: `sc_${market}`,
    })),
    completeInventory: true,
    entities: POPULATION_MARKETS.flatMap((market) =>
      POPULATION_CATALOG_KINDS.map((kind) => ({
        authority:
          kind === "product"
            ? {
                kind: "medusa-product-publication",
                locale: POPULATION_LOCALE_BY_MARKET[market],
                metadataSchemaVersion: 1,
                publicationStatus: "published",
                salesChannelId: `sc_${market}`,
                sourceEntityExists: true,
                translationVerified: true,
              }
            : {
                assignmentId: `assignment:${kind}:${market}`,
                kind: "medusa-published-assignment",
                locale: POPULATION_LOCALE_BY_MARKET[market],
                publicationStatus: "published",
                salesChannelId: `sc_${market}`,
                sourceEntityExists: true,
                translationVerified: true,
              },
        equivalenceKey: `${kind}:shared-1`,
        indexPolicy: "indexable",
        kind,
        market,
        publicSlug: `${kind}-${market}`,
        sourceEventId: `export:${kind}:${market}:1`,
        sourceId: `${kind}_shared_1`,
        sourceVersion: "1",
      }))
    ),
    generatedAt: "2026-08-21T08:00:00.000Z",
    generator: "four-market-readiness-test",
    schemaVersion: 1,
    sourceSnapshotHash: `sha256:${"a".repeat(64)}`,
    taxonomyApproval: {
      hash: hashPopulationStaticTaxonomy(),
      markets: Object.fromEntries(
        POPULATION_MARKETS.map((market) => [
          market,
          {
            editorialApproval: `editorial:${market}:v1`,
            legalApproval: `legal:${market}:v1`,
          },
        ])
      ),
    },
  })

export const fourMarketRowsFixture = (): FourMarketConvergenceRows => {
  const expected = expectedUrlrCatalogProjections(fourMarketManifestFixture())
  return {
    cursors: expected.map((item) => ({
      entityId: item.sourceId,
      entityKind: item.kind,
      lastSequence: 1,
      market: item.market,
    })),
    entityRoutes: expected.map((item) => ({
      equivalenceKey: item.equivalenceKey,
      indexPolicy: item.indexPolicy,
      kind: item.kind,
      market: item.market,
      publicSlug: item.publicSlug,
      sourceId: item.sourceId,
    })),
    events: expected.map((item) => ({
      deliveryOutcome: "applied",
      eventId: `external:${item.market}:${item.kind}`,
      id: `event:${item.market}:${item.kind}`,
      sourceVersion: item.sourceVersion,
      status: "delivered",
      streamId: `stream:${item.market}:${item.kind}`,
      streamSequence: 1,
    })),
    migrationLedgerSha256: TEST_MIGRATION_LEDGER_SHA256,
    receipts: expected.map((item) => ({
      action: "published",
      commandIdempotencyKey: `command:${item.market}:${item.kind}`,
      entityId: item.sourceId,
      entityKind: item.kind,
      market: item.market,
      sourceEventId: `event:${item.market}:${item.kind}`,
      streamSequence: 1,
    })),
    staticRoutes: expectedStaticTaxonomyProjections().map((item) => ({
      equivalenceKey: item.equivalenceKey,
      indexPolicy: item.indexPolicy,
      market: item.market,
      matchMode: item.matchMode,
      parentRouteKey: item.parentRouteKey,
      routeKey: item.routeKey,
      routeStatus: "active",
      segment: item.segment,
    })),
    streams: expected.map((item) => ({
      entityId: item.sourceId,
      entityKind: item.kind,
      id: `stream:${item.market}:${item.kind}`,
      lastSequence: 1,
      market: item.market,
      source: "medusa",
    })),
  }
}
