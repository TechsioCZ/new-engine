import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../modules/storefront-url-assignment"
import type { AdminUpsertCollectionUrlAssignment } from "../../../../modules/storefront-url-assignment/contracts"
import type { StorefrontUrlAssignmentRecord } from "../../../../modules/storefront-url-assignment/models/storefront-url-assignment"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../../../modules/url-registry-outbox"
import {
  type AdminAssignmentMutationResponse,
  handleAdminAssignmentPOST,
} from "../utils"

const persisted = (
  overrides: Partial<StorefrontUrlAssignmentRecord> = {}
): StorefrontUrlAssignmentRecord =>
  ({
    id: "sfuasn_1",
    schema_version: 1,
    entity_kind: "collection",
    entity_id: "pcol_1",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    public_slug: "old-slug",
    publication_status: "draft",
    source_version: 4,
    updated_at: new Date("2026-08-20T10:00:00.000Z"),
    ...overrides,
  }) as StorefrontUrlAssignmentRecord

const response = () => {
  const value = {
    status: vi.fn(),
    json: vi.fn((body: unknown) => body),
  }
  value.status.mockReturnValue(value)
  return value
}

type RequestDependencies = Readonly<{
  entityExists?: boolean[]
  outboxService?: Record<string, unknown>
  salesChannels?: unknown[]
  translationService?: { listTranslations: ReturnType<typeof vi.fn> }
}>

const defaultSalesChannels = [
  {
    id: "sc_sk",
    metadata: {
      storefront_notification_markets: {
        sk: {
          country_code: "sk",
          locale: "sk-SK",
          market_code: "sk",
          store_name: "Herbatica",
          storefront_domain: "herbatica.sk",
        },
      },
    },
  },
]

const request = (
  assignmentService: Record<string, unknown>,
  body: AdminUpsertCollectionUrlAssignment,
  translations: unknown[] = [
    {
      deleted_at: null,
      id: "trans_1",
      locale_code: "sk-SK",
      reference: "product_collection",
      reference_id: "pcol_1",
      translations: { title: "Zbierka" },
    },
  ],
  dependencies: RequestDependencies = {}
) => {
  if (!("lockCatalogEntityAssignments" in assignmentService)) {
    assignmentService.lockCatalogEntityAssignments = vi.fn(() =>
      Promise.resolve()
    )
  }
  const outboxService = dependencies.outboxService ?? {
    enqueueCatalogLifecycleEvent: vi.fn(() => Promise.resolve()),
  }
  const salesChannels = dependencies.salesChannels ?? defaultSalesChannels
  const translationService = dependencies.translationService ?? {
    listTranslations: vi.fn(async () => translations),
  }
  const entityExists = [...(dependencies.entityExists ?? [true])]
  const listSourceEntities = vi.fn(async () =>
    (entityExists.shift() ?? true) ? [{ id: "pcol_1" }] : []
  )
  return {
    body,
    params: { id: "pcol_1" },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return assignmentService
        }
        if (key === URL_REGISTRY_OUTBOX_MODULE) {
          return outboxService
        }
        if (key === Modules.TRANSLATION) {
          return translationService
        }
        if (key === Modules.PRODUCT) {
          return {
            listProductCategories: listSourceEntities,
            listProductCollections: listSourceEntities,
          }
        }
        return {
          listSalesChannels: vi.fn(async () => salesChannels),
        }
      }),
    },
  } as unknown as AuthenticatedMedusaRequest<AdminUpsertCollectionUrlAssignment>
}

describe("admin storefront assignment upsert", () => {
  it("creates a kind-scoped assignment with a server-owned initial version", async () => {
    const created = persisted({ public_slug: "new-slug", source_version: 1 })
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(async () => created),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "tx-1" })
      ),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(assignmentService, {
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "new-slug",
        publicationStatus: "draft",
      }),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(
      assignmentService.createStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_kind: "collection",
        entity_id: "pcol_1",
        source_version: 1,
      }),
      { transactionManager: "tx-1" }
    )
    expect(res.json).toHaveBeenCalledWith({
      assignment: expect.objectContaining({
        id: "pcol_1",
        entityId: "pcol_1",
        sourceVersion: "1",
      }),
      translation: { kind: "unchecked" },
    })
  })

  it("increments the persisted source version only when admin state changes", async () => {
    const existing = persisted()
    const updated = persisted({
      public_slug: "new-slug",
      publication_status: "published",
      source_version: 5,
    })
    const assignmentService = {
      listStorefrontUrlAssignments: vi
        .fn()
        .mockResolvedValueOnce([existing])
        .mockResolvedValueOnce([]),
      updateStorefrontUrlAssignments: vi.fn(async () => updated),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "tx-2" })
      ),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(assignmentService, {
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicSlug: "new-slug",
        publicationStatus: "published",
      }),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(
      assignmentService.updateStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sfuasn_1", source_version: 5 }),
      { transactionManager: "tx-2" }
    )
    expect(res.json).toHaveBeenCalledWith({
      assignment: expect.objectContaining({ sourceVersion: "5" }),
      translation: {
        kind: "found",
        proof: {
          localeCode: "sk-SK",
          reference: "product_collection",
          translationId: "trans_1",
        },
      },
    })
  })

  it("rejects publication when the exact market Translation record is missing", async () => {
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "missing-translation-tx" })
      ),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "sk",
          salesChannelId: "sc_sk",
          publicSlug: "new-slug",
          publicationStatus: "published",
        },
        []
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(res.status).toHaveBeenCalledWith(409)
    expect(
      assignmentService.createStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
  })

  it("rejects initial category publication when a runtime content key is absent", async () => {
    const assignmentService = {
      createStorefrontUrlAssignments: vi.fn(),
      listStorefrontUrlAssignments: vi.fn(),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "incomplete-translation-tx" })
      ),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "sk",
          publicationStatus: "published",
          publicSlug: "byliny",
          salesChannelId: "sc_sk",
        },
        [
          {
            deleted_at: null,
            id: "trans_category_incomplete",
            locale_code: "sk-SK",
            reference: "product_category",
            reference_id: "pcol_1",
            translations: {
              bottom_description_html: null,
              description: "Popis",
              meta_title: "Byliny",
              name: "Byliny",
              top_description_html: null,
            },
          },
        ]
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "category"
    )

    expect(res.status).toHaveBeenCalledWith(503)
    expect(assignmentService.runInTransaction).toHaveBeenCalledOnce()
    expect(
      assignmentService.createStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
  })

  it("persists and enqueues with one transaction context", async () => {
    const context = { transactionManager: "shared-tx" }
    const created = persisted({
      entity_kind: "category",
      entity_id: "pcol_1",
      market_code: "ro",
      public_slug: "suplimente",
      publication_status: "published",
      sales_channel_id: "sc_ro",
      source_version: 1,
    })
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(async () => created),
      lockCatalogEntityAssignments: vi.fn(() => Promise.resolve()),
      runInTransaction: vi.fn(async (task) => task(context)),
    }
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(() => Promise.resolve()),
    }
    const translationService = {
      listTranslations: vi.fn(async () => [
        {
          deleted_at: null,
          id: "trans_ro",
          locale_code: "ro-RO",
          reference: "product_category",
          reference_id: "pcol_1",
          translations: {
            bottom_description_html: null,
            description: "Descriere",
            meta_description: "Meta",
            meta_title: "Suplimente",
            name: "Suplimente",
            top_description_html: null,
          },
        },
      ]),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "ro",
          publicationStatus: "published",
          publicSlug: "suplimente",
          salesChannelId: "sc_ro",
        },
        undefined,
        {
          outboxService,
          salesChannels: [
            {
              id: "sc_ro",
              metadata: {
                storefront_notification_markets: {
                  ro: {
                    country_code: "ro",
                    locale: "ro-RO",
                    market_code: "ro",
                    store_name: "Herbatica România",
                    storefront_domain: "herbatica.ro",
                  },
                },
              },
            },
          ],
          translationService,
        }
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "category"
    )

    expect(outboxService.enqueueCatalogLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        affectedMarketCodes: ["ro"],
        entityId: "pcol_1",
        entityKind: "category",
        reason: "assignment-upsert",
      }),
      context
    )
    expect(
      assignmentService.lockCatalogEntityAssignments.mock.invocationCallOrder[0]
    ).toBeLessThan(
      translationService.listTranslations.mock.invocationCallOrder[0]
    )
  })

  it("rejects a cross-market sales channel before opening a transaction", async () => {
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(),
      createStorefrontUrlAssignments: vi.fn(),
      updateStorefrontUrlAssignments: vi.fn(),
      runInTransaction: vi.fn(),
    }
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "ro",
          publicationStatus: "draft",
          publicSlug: "suplimente",
          salesChannelId: "sc_sk",
        },
        undefined,
        { outboxService }
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "category"
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(assignmentService.runInTransaction).not.toHaveBeenCalled()
    expect(
      assignmentService.createStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
    expect(
      assignmentService.updateStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
    expect(outboxService.enqueueCatalogLifecycleEvent).not.toHaveBeenCalled()
  })

  it("does not report success when transactional enqueue fails", async () => {
    const created = persisted({ source_version: 1 })
    const assignmentService = {
      listStorefrontUrlAssignments: vi.fn(async () => []),
      createStorefrontUrlAssignments: vi.fn(async () => created),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "rollback-tx" })
      ),
    }
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(async () => {
        throw new Error("enqueue failed")
      }),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "sk",
          publicationStatus: "draft",
          publicSlug: "new-slug",
          salesChannelId: "sc_sk",
        },
        undefined,
        { outboxService }
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).not.toHaveBeenCalledWith(
      expect.objectContaining({ assignment: expect.anything() })
    )
  })

  it("rejects a stale admin publication after deletion wins the entity lock", async () => {
    const assignmentService = {
      createStorefrontUrlAssignments: vi.fn(),
      listStorefrontUrlAssignments: vi.fn(),
      lockCatalogEntityAssignments: vi.fn(() => Promise.resolve()),
      runInTransaction: vi.fn(async (task) =>
        task({ transactionManager: "delete-race-tx" })
      ),
      updateStorefrontUrlAssignments: vi.fn(),
    }
    const outboxService = {
      enqueueCatalogLifecycleEvent: vi.fn(),
    }
    const res = response()

    await handleAdminAssignmentPOST(
      request(
        assignmentService,
        {
          marketCode: "sk",
          publicationStatus: "draft",
          publicSlug: "stale-admin-slug",
          salesChannelId: "sc_sk",
        },
        undefined,
        { entityExists: [true, false], outboxService }
      ),
      res as unknown as MedusaResponse<
        AdminAssignmentMutationResponse | { message: string }
      >,
      "collection"
    )

    expect(assignmentService.lockCatalogEntityAssignments).toHaveBeenCalledWith(
      "collection",
      "pcol_1",
      {
        transactionManager: "delete-race-tx",
      }
    )
    expect(res.status).toHaveBeenCalledWith(404)
    expect(
      assignmentService.listStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
    expect(
      assignmentService.updateStorefrontUrlAssignments
    ).not.toHaveBeenCalled()
    expect(outboxService.enqueueCatalogLifecycleEvent).not.toHaveBeenCalled()
  })
})
