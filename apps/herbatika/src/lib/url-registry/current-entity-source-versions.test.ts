import { describe, expect, it, vi } from "vitest"
import type {
  EntityUrlRoute,
  UrlEntitySlug,
  UrlRegistryAuditRecord,
} from "./contracts"
import { readCurrentEntitySourceVersions } from "./current-entity-source-versions"
import type { ActiveEntityRouteTarget } from "./model"

const timestamp = "2026-08-21T10:00:00.000Z"

const projection = (sourceId: string, version = 2): ActiveEntityRouteTarget => {
  const route: EntityUrlRoute = {
    createdAt: timestamp,
    equivalenceKey: `category:${sourceId}`,
    id: `route-${sourceId}`,
    indexPolicy: "indexable",
    kind: "category",
    market: "sk",
    sourceId,
    sourceSystem: "medusa",
    sourceType: "category",
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: timestamp,
    version,
  }
  const currentSlug: UrlEntitySlug = {
    createdAt: timestamp,
    disposition: "current",
    id: `slug-${sourceId}`,
    kind: "category",
    market: "sk",
    normalizationVersion: 1,
    normalizedSlug: sourceId,
    routeId: route.id,
  }
  return { currentSlug, projectionType: "entity", route }
}

const audit = (
  target: ActiveEntityRouteTarget,
  sourceVersion: string,
  overrides: Partial<UrlRegistryAuditRecord> = {}
): UrlRegistryAuditRecord => ({
  action: "update-route",
  affectedRouteIds: [target.route.id],
  commandVersion: 1,
  createdAt: timestamp,
  details: {},
  id: `audit-${sourceVersion}`,
  idempotencyKey: `key-${sourceVersion}`,
  outcome: "noop",
  previousVersion: target.route.version,
  requestFingerprint: `fingerprint-${sourceVersion}`,
  resultVersion: target.route.version,
  routeId: target.route.id,
  source: {
    producer: "catalog",
    sourceEventId: `event-${sourceVersion}`,
    sourceId: target.route.sourceId,
    sourceSystem: target.route.sourceSystem,
    sourceType: target.route.sourceType,
    sourceVersion,
  },
  ...overrides,
})

describe("readCurrentEntitySourceVersions", () => {
  it("reads every audit page and lets the latest exact current-version audit win", async () => {
    const target = projection("category_1")
    const listAuditRecords = vi
      .fn()
      .mockResolvedValueOnce({
        kind: "found",
        value: {
          items: [audit(target, "5", { resultVersion: 1 }), audit(target, "6")],
          nextCursor: "page-2",
        },
      })
      .mockResolvedValueOnce({
        kind: "found",
        value: { items: [audit(target, "7")], nextCursor: null },
      })

    await expect(
      readCurrentEntitySourceVersions([target], { listAuditRecords })
    ).resolves.toEqual({
      kind: "found",
      value: [{ routeId: target.route.id, sourceVersion: "7" }],
    })
    expect(listAuditRecords).toHaveBeenNthCalledWith(1, {
      cursor: undefined,
      limit: 100,
    })
    expect(listAuditRecords).toHaveBeenNthCalledWith(2, {
      cursor: "page-2",
      limit: 100,
    })
  })

  it("rejects wrong identity, wrong route version, and missing current proof", async () => {
    const target = projection("category_1")
    const listAuditRecords = vi.fn().mockResolvedValue({
      kind: "found",
      value: {
        items: [
          audit(target, "6", {
            source: {
              ...audit(target, "6").source,
              sourceId: "category_other",
            },
          }),
          audit(target, "7", { resultVersion: 1 }),
        ],
        nextCursor: null,
      },
    })

    await expect(
      readCurrentEntitySourceVersions([target], { listAuditRecords })
    ).resolves.toEqual({
      causeCode: "MISSING_CURRENT_ENTITY_SOURCE_VERSION",
      kind: "invalid-response",
    })
  })

  it("rejects duplicate candidates and repeated cursors", async () => {
    const target = projection("category_1")
    await expect(
      readCurrentEntitySourceVersions([target, target], {
        listAuditRecords: vi.fn(),
      })
    ).resolves.toEqual({
      causeCode: "DUPLICATE_ENTITY_SOURCE_VERSION_CANDIDATE",
      kind: "invalid-response",
    })

    await expect(
      readCurrentEntitySourceVersions([target], {
        listAuditRecords: vi.fn().mockResolvedValue({
          kind: "found",
          value: { items: [], nextCursor: "loop" },
        }),
      })
    ).resolves.toEqual({
      causeCode: "INVALID_URL_REGISTRY_AUDIT_PAGINATION",
      kind: "invalid-response",
    })
  })

  it.each([
    { kind: "unavailable" as const },
    { causeCode: "MALFORMED_AUDIT", kind: "invalid-response" as const },
  ])("propagates $kind audit reads", async (failure) => {
    await expect(
      readCurrentEntitySourceVersions([projection("category_1")], {
        listAuditRecords: vi.fn().mockResolvedValue(failure),
      })
    ).resolves.toEqual(failure)
  })
})
