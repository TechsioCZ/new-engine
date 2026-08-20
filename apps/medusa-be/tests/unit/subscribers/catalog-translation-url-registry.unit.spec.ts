import { createHash } from "node:crypto"
import {
  ContainerRegistrationKeys,
  Modules,
  TranslationWorkflowEvents,
} from "@medusajs/framework/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PRODUCT_CONTENT_MODULE } from "../../../src/modules/product-content"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../../src/modules/storefront-url-assignment"
import { URL_REGISTRY_OUTBOX_MODULE } from "../../../src/modules/url-registry-outbox"
import { PRODUCT_CONTENT_TRANSLATABLE_FIELDS } from "../../../src/utils/product-content"
import {
  createRoDemoOmissionAuthority,
  RO_DEMO_OMISSION_AUTHORITY_KEY,
  RO_DEMO_OMISSION_AUTHORITY_SECRET_ENV,
} from "../../../src/utils/ro-demo-omission-authority"

const { unpublishCatalogEntityAssignments } = vi.hoisted(() => ({
  unpublishCatalogEntityAssignments: vi.fn(),
}))

vi.mock(
  "../../../src/modules/storefront-url-assignment/catalog-lifecycle",
  () => ({ unpublishCatalogEntityAssignments })
)

import handler, {
  config,
} from "../../../src/subscribers/catalog-translation-url-registry"

const SHA256_EVENT_ID = /^sha256:[0-9a-f]{64}$/
const OMISSION_SECRET = "test-only-demo-omission-secret-32-bytes"

const translation = (overrides: Record<string, unknown> = {}) => ({
  created_at: new Date("2026-08-20T09:00:00.000Z"),
  deleted_at: null,
  id: "trans_ro_1",
  locale_code: "ro-RO",
  reference: "product",
  reference_id: "prod_1",
  translations: { title: "Produs" },
  updated_at: new Date("2026-08-20T10:00:00.000Z"),
  ...overrides,
})

const event = (name: string) => ({ data: { id: "trans_ro_1" }, name }) as never

const dependencies = (
  translationReads: unknown[][],
  productContents: unknown[] = [],
  productPublicationStatus: "draft" | "published" = "published"
) => {
  const assignmentService = { name: "assignments" }
  const enqueueProductLifecycleEvent = vi.fn()
  const outboxService = { enqueueProductLifecycleEvent }
  const translationService = {
    listTranslations: vi.fn(async () => translationReads.shift() ?? []),
  }
  const container = {
    resolve: vi.fn((key: string) => {
      if (key === Modules.TRANSLATION) {
        return translationService
      }
      if (key === Modules.PRODUCT) {
        return {
          listProducts: vi.fn(async ({ id }: { id: string[] }) =>
            id.map((productId) => ({
              description: "",
              id: productId,
              subtitle: "",
            }))
          ),
        }
      }
      if (key === STOREFRONT_URL_ASSIGNMENT_MODULE) {
        return assignmentService
      }
      if (key === URL_REGISTRY_OUTBOX_MODULE) {
        return outboxService
      }
      if (key === PRODUCT_CONTENT_MODULE) {
        return { listProductContents: vi.fn(async () => productContents) }
      }
      if (key === ContainerRegistrationKeys.QUERY) {
        return {
          graph: vi.fn(async (input: { filters: { id: string } }) => ({
            data: [
              {
                id: input.filters.id,
                metadata: {
                  url_registry_publication: {
                    markets: {
                      ro: {
                        publicationStatus: productPublicationStatus,
                        publicSlug: "produs",
                        salesChannelId: "sc_ro",
                      },
                    },
                    schemaVersion: 1,
                  },
                },
                sales_channels: [{ id: "sc_ro" }],
                updated_at: "2026-08-20T10:00:00.000Z",
              },
            ],
          })),
        }
      }
      throw new Error(`unexpected dependency: ${key}`)
    }),
  }
  return {
    assignmentService,
    container,
    enqueueProductLifecycleEvent,
    outboxService,
  }
}

describe("catalog Translation URL registry lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv(RO_DEMO_OMISSION_AUTHORITY_SECRET_ENV, OMISSION_SECRET)
    unpublishCatalogEntityAssignments.mockResolvedValue([])
  })

  it("subscribes to exact create, update, and delete events", () => {
    expect(config.event).toEqual([
      TranslationWorkflowEvents.CREATED,
      TranslationWorkflowEvents.UPDATED,
      TranslationWorkflowEvents.DELETED,
    ])
  })

  it("emits one RO product retirement fact after exact Translation deletion", async () => {
    const deleted = translation({
      deleted_at: new Date("2026-08-20T11:00:00.000Z"),
    })
    const { container, enqueueProductLifecycleEvent } = dependencies([
      [deleted],
      [],
    ])

    await handler({
      container,
      event: event(TranslationWorkflowEvents.DELETED),
    })

    expect(enqueueProductLifecycleEvent).toHaveBeenCalledOnce()
    expect(enqueueProductLifecycleEvent).toHaveBeenCalledWith({
      affectedMarketCodes: ["ro"],
      eventId: expect.stringMatching(SHA256_EVENT_ID),
      marketAssignments: [
        {
          assignment: null,
          marketCode: "ro",
          sourceVersion: "translation:trans_ro_1:2026-08-20T11:00:00.000Z",
        },
      ],
      occurredAt: "2026-08-20T11:00:00.000Z",
      productId: "prod_1",
      reason: "translation-invalidated",
    })
    expect(unpublishCatalogEntityAssignments).not.toHaveBeenCalled()
  })

  it("does not enqueue retirement for an already unpublished product", async () => {
    const deleted = translation({
      deleted_at: new Date("2026-08-20T11:00:00.000Z"),
    })
    const { container, enqueueProductLifecycleEvent } = dependencies(
      [[deleted], []],
      [],
      "draft"
    )

    await handler({
      container,
      event: event(TranslationWorkflowEvents.DELETED),
    })

    expect(enqueueProductLifecycleEvent).not.toHaveBeenCalled()
    expect(unpublishCatalogEntityAssignments).not.toHaveBeenCalled()
  })

  it("drafts only RO taxonomy assignment after an incomplete update", async () => {
    const incomplete = translation({
      reference: "product_category",
      reference_id: "pcat_1",
      translations: { name: "" },
    })
    const { assignmentService, container, outboxService } = dependencies([
      [incomplete],
      [incomplete],
    ])

    await handler({
      container,
      event: event(TranslationWorkflowEvents.UPDATED),
    })

    expect(unpublishCatalogEntityAssignments).toHaveBeenCalledWith({
      assignmentService,
      entityId: "pcat_1",
      entityKind: "category",
      marketCode: "ro",
      outboxService,
    })
  })

  it("keeps a valid SK Translation and assignment unchanged", async () => {
    const valid = translation({ locale_code: "sk-SK" })
    const { container, enqueueProductLifecycleEvent } = dependencies([
      [valid],
      [valid],
    ])

    await handler({
      container,
      event: event(TranslationWorkflowEvents.UPDATED),
    })

    expect(enqueueProductLifecycleEvent).not.toHaveBeenCalled()
    expect(unpublishCatalogEntityAssignments).not.toHaveBeenCalled()
  })

  it("retires the owning RO product after an incomplete product_content update", async () => {
    const incomplete = translation({
      reference: "product_content",
      reference_id: "pcont_1",
      translations: { composition: "" },
    })
    const { container, enqueueProductLifecycleEvent } = dependencies(
      [[incomplete], [incomplete]],
      [
        {
          composition: "Aktívna zložka",
          deleted_at: null,
          id: "pcont_1",
          other: "",
          product_id: "prod_owner",
          usage: "",
          warning: "",
        },
      ]
    )

    await handler({
      container,
      event: event(TranslationWorkflowEvents.UPDATED),
    })

    expect(enqueueProductLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        affectedMarketCodes: ["ro"],
        productId: "prod_owner",
        reason: "translation-invalidated",
      })
    )
  })

  it("retires the owning RO product after product_content Translation deletion", async () => {
    const deleted = translation({
      deleted_at: new Date("2026-08-20T12:00:00.000Z"),
      reference: "product_content",
      reference_id: "pcont_1",
    })
    const { container, enqueueProductLifecycleEvent } = dependencies(
      [[deleted], []],
      [
        {
          composition: "Aktívna zložka",
          deleted_at: null,
          id: "pcont_1",
          other: "",
          product_id: "prod_owner",
          usage: "",
          warning: "",
        },
      ]
    )

    await handler({
      container,
      event: event(TranslationWorkflowEvents.DELETED),
    })

    expect(enqueueProductLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        affectedMarketCodes: ["ro"],
        occurredAt: "2026-08-20T12:00:00.000Z",
        productId: "prod_owner",
        reason: "translation-invalidated",
      })
    )
  })

  it("keeps RO published for an exact signed description-only omission", async () => {
    const description = "<p>Descriere română vizibilă</p>"
    const authority = createRoDemoOmissionAuthority(
      {
        ledgerSha256: "a".repeat(64),
        mode: "official-ro-description-only",
        omittedFields: [...PRODUCT_CONTENT_TRANSLATABLE_FIELDS],
        productContentId: "pcont_1",
        productId: "prod_owner",
        roDescriptionSha256: createHash("sha256")
          .update(description)
          .digest("hex"),
        schemaVersion: 1,
        sourceContentSha256: "b".repeat(64),
        sourceUrl: "https://herbatica.ro/produs",
      },
      OMISSION_SECRET
    )
    const contentTranslation = translation({
      reference: "product_content",
      reference_id: "pcont_1",
      translations: {
        composition: "",
        other: "",
        [RO_DEMO_OMISSION_AUTHORITY_KEY]: authority,
        usage: "",
        warning: "",
      },
    })
    const productTranslation = translation({
      id: "trans_product_ro",
      reference_id: "prod_owner",
      translations: { description, title: "Produs" },
    })
    const content = {
      composition: "Zloženie",
      deleted_at: null,
      id: "pcont_1",
      other: "Iné",
      product_id: "prod_owner",
      usage: "Použitie",
      warning: "Pozor",
    }
    const { container, enqueueProductLifecycleEvent } = dependencies(
      [[contentTranslation], [productTranslation], [contentTranslation]],
      [content]
    )

    await handler({
      container,
      event: event(TranslationWorkflowEvents.UPDATED),
    })

    expect(enqueueProductLifecycleEvent).not.toHaveBeenCalled()
  })
})
