import { describe, expect, it, vi } from "vitest"
import {
  type CollectionIndexSourceDependencies,
  readCollectionIndexSource,
} from "./collections-index-source"
import type { CollectionRouteSourceMarketBinding } from "./collections-route-source"

const binding: CollectionRouteSourceMarketBinding = {
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const assignment = (id: string, patch: Record<string, unknown> = {}) => ({
  entityId: id,
  id,
  marketCode: "sk",
  publicationStatus: "published",
  publicSlug: `${id}-slug`,
  salesChannelId: "sc_sk",
  schemaVersion: 1,
  sourceVersion: "v1",
  ...patch,
})

const dependencies = (
  overrides: Partial<CollectionIndexSourceDependencies> = {}
): CollectionIndexSourceDependencies => ({
  listAssignments: vi.fn().mockResolvedValue({
    count: 3,
    items: [assignment("pcol_1"), assignment("pcol_2"), assignment("pcol_3")],
    limit: 100,
    offset: 0,
  }),
  listCollections: vi.fn().mockImplementation(({ ids }) => ({
    collections: ids.map((id: string) => ({ id, title: `Title ${id}` })),
    count: ids.length,
  })),
  resolveMarket: vi.fn(() => binding),
  ...overrides,
})

describe("readCollectionIndexSource", () => {
  it("intersects URLR routes with published assignments and preserves URLR order", async () => {
    const deps = dependencies()

    const result = await readCollectionIndexSource(
      { market: "sk", routeSourceIds: ["pcol_3", "pcol_1"] },
      deps
    )

    expect(result).toEqual({
      kind: "found",
      value: [
        { id: "pcol_3", title: "Title pcol_3" },
        { id: "pcol_1", title: "Title pcol_1" },
      ],
    })
    expect(deps.listAssignments).toHaveBeenCalledWith({
      binding,
      limit: 100,
      offset: 0,
    })
    expect(deps.listCollections).toHaveBeenCalledWith({
      binding,
      ids: ["pcol_1", "pcol_3"],
    })
  })

  it("does no backend work when URLR has no collection routes", async () => {
    const deps = dependencies()

    await expect(
      readCollectionIndexSource({ market: "sk", routeSourceIds: [] }, deps)
    ).resolves.toEqual({ kind: "found", value: [] })
    expect(deps.listAssignments).not.toHaveBeenCalled()
    expect(deps.listCollections).not.toHaveBeenCalled()
  })

  it("fails closed for a cross-channel assignment response", async () => {
    const deps = dependencies({
      listAssignments: vi.fn().mockResolvedValue({
        count: 1,
        items: [assignment("pcol_1", { salesChannelId: "sc_cz" })],
        limit: 100,
        offset: 0,
      }),
    })

    await expect(
      readCollectionIndexSource(
        { market: "sk", routeSourceIds: ["pcol_1"] },
        deps
      )
    ).resolves.toEqual({
      causeCode: "INVALID_COLLECTION_ASSIGNMENT_LIST_RESPONSE",
      kind: "invalid-response",
    })
    expect(deps.listCollections).not.toHaveBeenCalled()
  })

  it("fails closed when assignment pagination contradicts its count", async () => {
    const deps = dependencies({
      listAssignments: vi.fn().mockResolvedValue({
        count: 1,
        items: [assignment("pcol_1"), assignment("pcol_2")],
        limit: 100,
        offset: 0,
      }),
    })

    await expect(
      readCollectionIndexSource(
        { market: "sk", routeSourceIds: ["pcol_1"] },
        deps
      )
    ).resolves.toEqual({
      causeCode: "INVALID_COLLECTION_ASSIGNMENT_LIST_RESPONSE",
      kind: "invalid-response",
    })
    expect(deps.listCollections).not.toHaveBeenCalled()
  })

  it("fails closed for duplicate assignment source identities", async () => {
    const deps = dependencies({
      listAssignments: vi.fn().mockResolvedValue({
        count: 2,
        items: [assignment("pcol_1"), assignment("pcol_1")],
        limit: 100,
        offset: 0,
      }),
    })

    await expect(
      readCollectionIndexSource(
        { market: "sk", routeSourceIds: ["pcol_1"] },
        deps
      )
    ).resolves.toEqual({
      causeCode: "INVALID_COLLECTION_ASSIGNMENT_LIST_RESPONSE",
      kind: "invalid-response",
    })
    expect(deps.listCollections).not.toHaveBeenCalled()
  })

  it("omits assignments which do not have an active URLR route", async () => {
    const deps = dependencies()

    const result = await readCollectionIndexSource(
      { market: "sk", routeSourceIds: ["pcol_2"] },
      deps
    )

    expect(result).toEqual({
      kind: "found",
      value: [{ id: "pcol_2", title: "Title pcol_2" }],
    })
    expect(deps.listCollections).toHaveBeenCalledWith({
      binding,
      ids: ["pcol_2"],
    })
  })

  it("rejects a published assignment whose Medusa collection disappeared", async () => {
    const deps = dependencies({
      listCollections: vi.fn().mockResolvedValue({ collections: [] }),
    })

    await expect(
      readCollectionIndexSource(
        { market: "sk", routeSourceIds: ["pcol_1"] },
        deps
      )
    ).resolves.toEqual({
      causeCode: "MISSING_ASSIGNED_COLLECTION_SOURCE",
      kind: "invalid-response",
    })
  })

  it("maps assignment dependency failure to unavailable", async () => {
    const deps = dependencies({
      listAssignments: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("down"), { status: 503 })),
    })

    await expect(
      readCollectionIndexSource(
        { market: "sk", routeSourceIds: ["pcol_1"] },
        deps
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })
})
