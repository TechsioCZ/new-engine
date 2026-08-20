import type { MedusaStoreRequest } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import { BRAND_MODULE } from "../../../../../modules/brand"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../../../modules/storefront-url-assignment"
import type { StorefrontUrlAssignmentRecord } from "../../../../../modules/storefront-url-assignment/models/storefront-url-assignment"
import {
  readPublishedStorefrontAssignment,
  readPublishedStorefrontAssignmentPage,
  readPublishedStorefrontAssignmentSources,
} from "../../utils"

const assignment = (
  overrides: Partial<StorefrontUrlAssignmentRecord> = {}
): StorefrontUrlAssignmentRecord =>
  ({
    id: "sfuasn_1",
    schema_version: 1,
    entity_kind: "collection",
    entity_id: "pcol_1",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    public_slug: "zimna-kolekcia",
    publication_status: "published",
    source_version: 1,
    ...overrides,
  }) as StorefrontUrlAssignmentRecord

const request = ({
  records = [assignment()],
  count = records.length,
  collections = [{ id: "pcol_1" }],
  categories = [{ id: "pcat_1" }],
  brands = [{ id: "brand_1" }],
  salesChannelIds = ["sc_sk"],
  serviceError = false,
  translations,
}: {
  records?: StorefrontUrlAssignmentRecord[]
  count?: number
  collections?: Array<{ id: string }>
  categories?: Array<{ id: string }>
  brands?: Array<{ id: string }>
  salesChannelIds?: string[]
  serviceError?: boolean
  translations?: Error | unknown[]
} = {}) => {
  const assignmentService = {
    listStorefrontUrlAssignments: vi.fn(async () => {
      if (serviceError) {
        throw new Error("database unavailable")
      }
      return records
    }),
    listAndCountStorefrontUrlAssignments: vi.fn(async () => {
      if (serviceError) {
        throw new Error("database unavailable")
      }
      return [records, count] as const
    }),
  }
  const productService = {
    listProductCollections: vi.fn(async () => collections),
    listProductCategories: vi.fn(async () => categories),
  }
  const brandService = {
    listBrands: vi.fn(async () => brands),
  }
  const translationService = {
    listTranslations: vi.fn(
      async (filters: {
        locale_code: string
        reference: string
        reference_id: string[]
      }) => {
        if (translations instanceof Error) {
          throw translations
        }
        return (
          translations ??
          filters.reference_id.map((referenceId, index) => ({
            deleted_at: null,
            id: `trans_${index + 1}`,
            locale_code: filters.locale_code,
            reference: filters.reference,
            reference_id: referenceId,
            translations: { title: "Localized" },
          }))
        )
      }
    ),
  }
  const value = {
    publishable_key_context: { sales_channel_ids: salesChannelIds },
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
          return assignmentService
        }
        if (key === Modules.TRANSLATION) {
          return translationService
        }
        return key === BRAND_MODULE ? brandService : productService
      }),
    },
  } as unknown as MedusaStoreRequest

  return {
    assignmentService,
    brandService,
    productService,
    translationService,
    value,
  }
}

describe("Store collection assignment reads", () => {
  it("returns one published assignment for the key-bound channel", async () => {
    const context = request()
    await expect(
      readPublishedStorefrontAssignment(context.value, "collection", "pcol_1")
    ).resolves.toMatchObject({
      kind: "found",
      assignment: {
        entityId: "pcol_1",
        marketCode: "sk",
        salesChannelId: "sc_sk",
        publicationStatus: "published",
        translation: {
          localeCode: "sk-SK",
          reference: "product_collection",
        },
      },
    })
    expect(
      context.assignmentService.listStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      {
        entity_kind: "collection",
        entity_id: "pcol_1",
        publication_status: "published",
        sales_channel_id: "sc_sk",
      },
      expect.objectContaining({ take: 2 })
    )
  })

  it.each([
    ["category", "pcat_1"],
    ["brand", "brand_1"],
  ] as const)("uses the owning %s source adapter", async (entityKind, entityId) => {
    const context = request({
      records: [
        assignment({
          entity_id: entityId,
          entity_kind: entityKind,
          public_slug: `${entityKind}-slug`,
        }),
      ],
    })
    await expect(
      readPublishedStorefrontAssignment(context.value, entityKind, entityId)
    ).resolves.toMatchObject({
      kind: "found",
      assignment: { entityId },
    })
  })

  it("returns missing for absent, draft, wrong-channel, or deleted collections", async () => {
    await expect(
      readPublishedStorefrontAssignment(
        request({ records: [] }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "missing" })
    await expect(
      readPublishedStorefrontAssignment(
        request({ records: [], collections: [] }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("returns unavailable for ambiguous key scope or invalid persisted state", async () => {
    await expect(
      readPublishedStorefrontAssignment(
        request({ salesChannelIds: ["sc_sk", "sc_cz"] }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readPublishedStorefrontAssignment(
        request({ records: [assignment(), assignment({ id: "sfuasn_2" })] })
          .value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readPublishedStorefrontAssignment(
        request({ serviceError: true }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("treats a missing exact-locale Translation record as unpublished", async () => {
    await expect(
      readPublishedStorefrontAssignment(
        request({ translations: [] }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "missing" })
  })

  it("fails closed for malformed or unavailable Translation state", async () => {
    await expect(
      readPublishedStorefrontAssignment(
        request({
          translations: [
            {
              deleted_at: null,
              id: "trans_1",
              locale_code: "cs-CZ",
              reference: "product_collection",
              reference_id: "pcol_1",
              translations: { title: "Fallback" },
            },
          ],
        }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "unavailable" })
    await expect(
      readPublishedStorefrontAssignment(
        request({ translations: new Error("database unavailable") }).value,
        "collection",
        "pcol_1"
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("returns a bounded page and preserves the total", async () => {
    const context = request({ count: 75 })
    await expect(
      readPublishedStorefrontAssignmentPage(context.value, "collection", {
        limit: 25,
        offset: 50,
      })
    ).resolves.toMatchObject({
      kind: "found",
      page: { count: 75, limit: 25, offset: 50 },
    })
    expect(
      context.assignmentService.listAndCountStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      {
        entity_kind: "collection",
        publication_status: "published",
        sales_channel_id: "sc_sk",
      },
      expect.objectContaining({ skip: 50, take: 25 })
    )
  })

  it.each([
    ["category", "pcat_1", "category-slug", "product_category"],
    ["brand", "brand_1", "brand-slug", "brand"],
    ["collection", "pcol_1", "zimna-kolekcia", "product_collection"],
  ] as const)("reads only exact %s sitemap candidates with one bounded assignment query", async (entityKind, entityId, publicSlug, translationReference) => {
    const context = request({
      records: [
        assignment({
          entity_id: entityId,
          entity_kind: entityKind,
          public_slug: publicSlug,
        }),
      ],
    })
    await expect(
      readPublishedStorefrontAssignmentSources(
        context.value,
        entityKind,
        "sk",
        [
          { entityId, publicSlug },
          { entityId: "pcol_stale", publicSlug: "new-slug" },
        ]
      )
    ).resolves.toEqual({
      assignments: [
        {
          entityId,
          id: entityId,
          marketCode: "sk",
          publicationStatus: "published",
          publicSlug,
          salesChannelId: "sc_sk",
          schemaVersion: 1,
          sourceVersion: "1",
          translation: {
            localeCode: "sk-SK",
            reference: translationReference,
            translationId: "trans_1",
          },
        },
      ],
      kind: "found",
    })
    expect(
      context.assignmentService.listStorefrontUrlAssignments
    ).toHaveBeenCalledTimes(1)
    expect(
      context.assignmentService.listStorefrontUrlAssignments
    ).toHaveBeenCalledWith(
      {
        entity_id: [entityId, "pcol_stale"],
        entity_kind: entityKind,
        market_code: "sk",
        publication_status: "published",
        sales_channel_id: "sc_sk",
      },
      {
        order: { entity_id: "ASC" },
        take: 3,
      }
    )
  })

  it("fails the page closed when one channel contains multiple markets", async () => {
    await expect(
      readPublishedStorefrontAssignmentPage(
        request({
          records: [
            assignment(),
            assignment({ id: "sfuasn_2", market_code: "cz" }),
          ],
        }).value,
        "collection",
        { limit: 50, offset: 0 }
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("fails the page closed when an assignment references a deleted source", async () => {
    await expect(
      readPublishedStorefrontAssignmentPage(
        request({ collections: [] }).value,
        "collection",
        { limit: 50, offset: 0 }
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })

  it("fails the Store page closed when a published assignment is untranslated", async () => {
    await expect(
      readPublishedStorefrontAssignmentPage(
        request({ translations: [] }).value,
        "collection",
        { limit: 50, offset: 0 }
      )
    ).resolves.toEqual({ kind: "unavailable" })
  })
})
