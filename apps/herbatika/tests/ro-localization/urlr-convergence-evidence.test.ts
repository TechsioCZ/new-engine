import { describe, expect, it } from "vitest"
import type { PopulationManifest } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  hashUrlrConvergenceProof,
  parseUrlrConvergenceProof,
  serializeUrlrConvergenceProof,
} from "./urlr-convergence-contract"
import type { OutboxEventRow } from "./urlr-convergence-db"
import {
  computeUrlrConvergenceEvidence,
  UrlrConvergenceMismatchError,
  type UrlrConvergenceRows,
} from "./urlr-convergence-evidence"
import {
  buildExpectedUrlrEntities,
  type ExpectedUrlrEntity,
} from "./urlr-convergence-identity"

const binding = {
  catalogScopeSha256: "a".repeat(64),
  releaseId: "ro-demo-20260820",
  staticTaxonomyConvergenceSha256: "b".repeat(64),
}
const SHA256 = /^[a-f0-9]{64}$/

const manifestEntity = (
  kind: "brand" | "category" | "product",
  sourceId: string,
  sourceVersion: string
) => ({
  authority:
    kind === "product"
      ? {
          kind: "medusa-product-publication",
          locale: "ro-RO",
          metadataSchemaVersion: 1,
          publicationStatus: "published",
          salesChannelId: "sc_ro",
          sourceEntityExists: true,
          translationVerified: true,
        }
      : {
          assignmentId: `assignment_${sourceId}`,
          kind: "medusa-published-assignment",
          locale: "ro-RO",
          publicationStatus: "published",
          salesChannelId: "sc_ro",
          sourceEntityExists: true,
          translationVerified: true,
        },
  equivalenceKey: `${kind}:${sourceId}`,
  indexPolicy: "indexable",
  kind,
  market: "ro",
  publicSlug: `${kind}-${sourceId}`,
  sourceEventId: `population:${kind}:${sourceId}:${sourceVersion}`,
  sourceId,
  sourceVersion,
})

const manifest = (entities = [manifestEntity("product", "prod_1", "2")]) =>
  ({
    bindings: [],
    completeInventory: true,
    entities,
    generatedAt: "2026-08-20T18:00:00.000Z",
    generator: "fixture",
    schemaVersion: 1,
    sourceSnapshotHash: `sha256:${"c".repeat(64)}`,
    taxonomyApproval: { hash: `sha256:${"d".repeat(64)}`, markets: {} },
  }) as unknown as PopulationManifest

const scope = {
  brandIds: [],
  categoryPublishedIds: [],
  productPublishedIds: ["prod_1"],
}

const event = (sequence: number, sourceVersion: string): OutboxEventRow => ({
  availableAt: "2026-08-20T17:00:00.000Z",
  deliveryOutcome: sequence === 1 ? "applied" : "already-applied",
  eventId: `business-event-${sequence}`,
  id: `urlroe_${sequence}`,
  lastErrorCode: null,
  leaseExpiresAt: null,
  sourceVersion,
  status: "delivered",
  streamId: "urlros_1",
  streamSequence: sequence,
})

const expected = (): readonly ExpectedUrlrEntity[] =>
  buildExpectedUrlrEntities(scope, manifest())

const rows = (
  events: readonly OutboxEventRow[] = [event(1, "1"), event(2, "2")]
): UrlrConvergenceRows => ({
  activeRoutes: [
    {
      entityId: "prod_1",
      entityKind: "product",
      market: "ro",
      routeId: "00000000-0000-4000-8000-000000000001",
    },
  ],
  cursors: [
    {
      entityId: "prod_1",
      entityKind: "product",
      lastSequence: 2,
      market: "ro",
    },
  ],
  events,
  receipts: [
    {
      action: "unpublished",
      commandIdempotencyKey: "cmd_1",
      entityId: "prod_1",
      entityKind: "product",
      market: "ro",
      sourceEventId: "urlroe_1",
      streamSequence: 1,
    },
    {
      action: "slug-changed",
      commandIdempotencyKey: "cmd_2",
      entityId: "prod_1",
      entityKind: "product",
      market: "ro",
      sourceEventId: "urlroe_2",
      streamSequence: 2,
    },
  ],
  streams: [
    {
      entityId: "prod_1",
      entityKind: "product",
      id: "urlros_1",
      lastSequence: 2,
      marketCode: "ro",
      source: "medusa",
    },
  ],
})

const input = (rowOverrides: UrlrConvergenceRows = rows()) => ({
  binding,
  expected: expected(),
  generatedAt: "2026-08-20T18:00:00.000Z",
  now: new Date("2026-08-20T18:00:00.000Z"),
  rows: rowOverrides,
})

describe("URLR convergence evidence", () => {
  it("accepts delivered historical predecessors and binds the terminal sourceVersion", async () => {
    const proof = computeUrlrConvergenceEvidence(input())
    expect(proof.boundary).toMatchObject({
      expectedEntityCount: 1,
      expectedEventCount: 2,
      expectedStreamCount: 1,
    })
    expect(proof.streams.notDeliveredThroughLastSequenceCount).toBe(0)
    expect(proof.urlrReceipts.count).toBe(2)

    const parsed = parseUrlrConvergenceProof(proof, binding)
    expect(serializeUrlrConvergenceProof(parsed).endsWith("\n")).toBe(true)
    await expect(hashUrlrConvergenceProof(parsed)).resolves.toMatch(SHA256)
  })

  it("rejects a terminal event that does not match the retained manifest", () => {
    const stale = rows([event(1, "1"), event(2, "stale")])
    expect(() => computeUrlrConvergenceEvidence(input(stale))).toThrow(
      "terminal sourceVersion"
    )
  })

  it("rejects any undelivered historical predecessor", () => {
    const pending: OutboxEventRow = {
      ...event(1, "1"),
      deliveryOutcome: null,
      status: "pending",
    }
    try {
      computeUrlrConvergenceEvidence(input(rows([pending, event(2, "2")])))
      throw new Error("expected convergence computation to fail")
    } catch (error) {
      expect(error).toBeInstanceOf(UrlrConvergenceMismatchError)
      expect((error as UrlrConvergenceMismatchError).mismatchClass).toBe(
        "pending"
      )
    }
  })

  it("requires exact outbox-row receipt identity at every sequence", () => {
    const mismatched = rows()
    const receipts = mismatched.receipts.map((receipt) =>
      receipt.streamSequence === 1
        ? { ...receipt, sourceEventId: "wrong-outbox-row" }
        : receipt
    )
    expect(() =>
      computeUrlrConvergenceEvidence(input({ ...mismatched, receipts }))
    ).toThrow("receipts do not exactly cover")
  })
})

describe("URLR expected entity binding", () => {
  it("uses the actual Medusa source identity and manifest sourceVersion", () => {
    expect(expected()).toEqual([
      {
        entityId: "prod_1",
        entityKey: "product:prod_1",
        kind: "product",
        sourceVersion: "2",
        streamKey: "medusa|product|prod_1|ro",
      },
    ])
  })

  it("rejects duplicate scope IDs and manifest/scope drift", () => {
    expect(() =>
      buildExpectedUrlrEntities(
        { ...scope, productPublishedIds: ["prod_1", "prod_1"] },
        manifest()
      )
    ).toThrow("duplicate entity id")
    expect(() =>
      buildExpectedUrlrEntities(
        scope,
        manifest([
          manifestEntity("product", "prod_1", "2"),
          manifestEntity("brand", "brand_1", "1"),
        ])
      )
    ).toThrow("outside the import scope")
  })
})
