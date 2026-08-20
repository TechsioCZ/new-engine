import {
  ProductCategoryWorkflowEvents,
  ProductCollectionWorkflowEvents,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BRAND_MODULE } from "../../../src/modules/brand"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../src/modules/storefront-url-assignment"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../../src/modules/url-registry-outbox"
import { BRAND_SEARCH_PROJECTION_CHANGED } from "../../../src/workflows/meilisearch/events"

const { unpublishCatalogEntityAssignments } = vi.hoisted(() => ({
  unpublishCatalogEntityAssignments: vi.fn(),
}))

vi.mock(
  "../../../src/modules/storefront-url-assignment/catalog-lifecycle",
  () => ({ unpublishCatalogEntityAssignments })
)

import brandHandler, {
  config as brandConfig,
} from "../../../src/subscribers/brand-deleted-url-registry"
import catalogHandler, {
  config as catalogConfig,
} from "../../../src/subscribers/catalog-entity-deleted-url-registry"

const assignmentService = { name: "assignments" }
const outboxService = { name: "outbox" }
const event = (name: string, data: unknown) => ({ data, name }) as never

describe("catalog delete URL registry subscribers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    unpublishCatalogEntityAssignments.mockResolvedValue([])
  })

  it("subscribes to the exact category and collection delete topics", () => {
    expect(catalogConfig.event).toEqual([
      ProductCategoryWorkflowEvents.DELETED,
      ProductCollectionWorkflowEvents.DELETED,
    ])
    expect(brandConfig.event).toBe(BRAND_SEARCH_PROJECTION_CHANGED)
  })

  it.each([
    [ProductCategoryWorkflowEvents.DELETED, "category"],
    [ProductCollectionWorkflowEvents.DELETED, "collection"],
  ] as const)("unpublishes the exact %s identity", async (name, entityKind) => {
    const container = {
      resolve: vi.fn((key: string) =>
        key === STOREFRONT_URL_ASSIGNMENT_MODULE
          ? assignmentService
          : outboxService
      ),
    }

    await catalogHandler({
      container,
      event: event(name, { id: "entity_1" }),
    })

    expect(unpublishCatalogEntityAssignments).toHaveBeenCalledWith({
      assignmentService,
      entityId: "entity_1",
      entityKind,
      outboxService,
    })
  })

  it("propagates catalog unpublish failures for event-bus retry", async () => {
    const failure = new Error("outbox unavailable")
    unpublishCatalogEntityAssignments.mockRejectedValue(failure)
    const container = { resolve: vi.fn(() => assignmentService) }

    await expect(
      catalogHandler({
        container,
        event: event(ProductCategoryWorkflowEvents.DELETED, { id: "pcat_1" }),
      })
    ).rejects.toBe(failure)
  })

  it("unpublishes only brands confirmed soft-deleted", async () => {
    const brandService = {
      listBrands: vi.fn(async () => [
        { deleted_at: new Date(), id: "brand_deleted" },
        { deleted_at: null, id: "brand_active" },
      ]),
    }
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === BRAND_MODULE) {
          return brandService
        }
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return assignmentService
        }
        if (key === URL_REGISTRY_OUTBOX_MODULE) {
          return outboxService
        }
        throw new Error(`unexpected dependency: ${key}`)
      }),
    }

    await brandHandler({
      container,
      event: event(BRAND_SEARCH_PROJECTION_CHANGED, {
        brand_ids: ["brand_active", "brand_deleted"],
        product_ids: [],
      }),
    })

    expect(unpublishCatalogEntityAssignments).toHaveBeenCalledOnce()
    expect(unpublishCatalogEntityAssignments).toHaveBeenCalledWith({
      assignmentService,
      entityId: "brand_deleted",
      entityKind: "brand",
      outboxService,
    })
  })

  it("ignores active-brand projection events", async () => {
    const container = {
      resolve: vi.fn((key: string) => ({
        listBrands: vi.fn(async () =>
          key === BRAND_MODULE ? [{ deleted_at: null, id: "brand_1" }] : []
        ),
      })),
    }

    await brandHandler({
      container,
      event: event(BRAND_SEARCH_PROJECTION_CHANGED, {
        brand_ids: ["brand_1"],
        product_ids: [],
      }),
    })

    expect(unpublishCatalogEntityAssignments).not.toHaveBeenCalled()
  })

  it("unpublishes a missing brand so a hard deletion cannot leave a route", async () => {
    const container = {
      resolve: vi.fn((key: string) => {
        if (key === BRAND_MODULE) {
          return { listBrands: vi.fn(async () => []) }
        }
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return assignmentService
        }
        return outboxService
      }),
    }

    await brandHandler({
      container,
      event: event(BRAND_SEARCH_PROJECTION_CHANGED, {
        brand_ids: ["brand_missing"],
        product_ids: [],
      }),
    })

    expect(unpublishCatalogEntityAssignments).toHaveBeenCalledWith({
      assignmentService,
      entityId: "brand_missing",
      entityKind: "brand",
      outboxService,
    })
  })
})
