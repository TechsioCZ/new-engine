import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"
import {
  buildProductLifecycleOutboxInputs,
  clearProductLifecycleEvents,
  emitProductLifecycleEvents,
  loadProductPublicationSnapshots,
  PRODUCT_LIFECYCLE_RETRY_OPTIONS,
  ProductLifecycleProducerInputError,
  URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
} from "../../../src/workflows/url-registry-outbox/product-lifecycle-event"

const GROUP_ID = "01ARZ3NDEKTSV4RRFFQ69G5FAV"
const SHA256_FINGERPRINT = /^sha256:[a-f0-9]{64}$/
const emptyAssignments = {
  sk: null,
  cz: null,
  hu: null,
  ro: null,
} as const
const productSnapshots = ["prod_1", "prod_2"].map((productId) => ({
  assignments: {
    ...emptyAssignments,
    sk: {
      publicationStatus: "published" as const,
      publicSlug: `${productId.replace("_", "-")}-slug`,
      salesChannelId: "sc_sk",
    },
  },
  productId,
  sourceVersion: "2026-08-18T09:00:00.000Z",
}))

const eventBusContext = (
  listTranslations: (filters: {
    locale_code: string
    reference: string
    reference_id: string[]
  }) => Promise<unknown[]> = async (filters) =>
    filters.reference_id.map((referenceId, index) => ({
      deleted_at: null,
      id: `trans_${filters.locale_code}_${index}`,
      locale_code: filters.locale_code,
      reference: filters.reference,
      reference_id: referenceId,
      translations: { title: "Localized" },
    }))
) => {
  const clearGroupedEvents = vi.fn().mockResolvedValue(undefined)
  const emit = vi.fn().mockResolvedValue(undefined)
  const graph = vi.fn().mockResolvedValue({
    data: ["prod_1", "prod_2"].map((id) => ({
      id,
      metadata: {
        url_registry_publication: {
          schemaVersion: 1,
          markets: {
            sk: {
              publicationStatus: "published",
              publicSlug: `${id.replace("_", "-")}-slug`,
              salesChannelId: "sc_sk",
            },
          },
        },
      },
      sales_channels: [{ id: "sc_sk" }],
      updated_at: "2026-08-18T09:00:00.000Z",
    })),
  })
  const resolve = vi.fn((key: string) => {
    if (key === Modules.EVENT_BUS) {
      return { clearGroupedEvents, emit }
    }
    if (key === ContainerRegistrationKeys.QUERY) {
      return { graph }
    }
    if (key === Modules.TRANSLATION) {
      return {
        listTranslations: vi.fn(listTranslations),
      }
    }
    throw new Error(`Unexpected container resolution: ${key}`)
  })

  return {
    clearGroupedEvents,
    context: {
      container: { resolve },
      eventGroupId: GROUP_ID,
    } as never,
    emit,
    resolve,
  }
}

describe("URL registry product lifecycle workflow event", () => {
  it.each([
    "created",
    "updated",
    "deleted",
  ] as const)("builds deterministic %s payloads for every market", (reason) => {
    const first = buildProductLifecycleOutboxInputs({
      eventGroupId: GROUP_ID,
      productIds: ["prod_2", "prod_1", "prod_1"],
      ...(reason === "deleted" ? {} : { productSnapshots }),
      reason,
    })
    const replay = buildProductLifecycleOutboxInputs({
      eventGroupId: GROUP_ID,
      productIds: ["prod_1", "prod_2"],
      ...(reason === "deleted" ? {} : { productSnapshots }),
      reason,
    })

    expect(replay).toEqual(first)
    expect(first).toEqual([
      {
        affectedMarketCodes: ["sk", "cz", "hu", "ro"],
        eventId: expect.stringMatching(SHA256_FINGERPRINT),
        marketAssignments: expect.any(Array),
        occurredAt: "2016-07-30T23:54:10.259Z",
        productId: "prod_1",
        reason,
      },
      {
        affectedMarketCodes: ["sk", "cz", "hu", "ro"],
        eventId: expect.stringMatching(SHA256_FINGERPRINT),
        marketAssignments: expect.any(Array),
        occurredAt: "2016-07-30T23:54:10.259Z",
        productId: "prod_2",
        reason,
      },
    ])
    expect(first[0]?.eventId).not.toBe(first[1]?.eventId)
  })

  it.each([
    ["missing", undefined],
    ["lowercase", GROUP_ID.toLowerCase()],
    ["short", GROUP_ID.slice(1)],
    ["overflow", `8${GROUP_ID.slice(1)}`],
    ["invalid alphabet", `${GROUP_ID.slice(0, -1)}I`],
  ])("fails closed for a %s workflow event group", (_label, eventGroupId) => {
    try {
      buildProductLifecycleOutboxInputs({
        eventGroupId,
        productIds: ["prod_1"],
        reason: "created",
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProductLifecycleProducerInputError)
      expect(error).toBeInstanceOf(MedusaError)
      expect((error as MedusaError).type).toBe(MedusaError.Types.INVALID_DATA)
      return
    }
    throw new Error("Expected invalid workflow event group to be rejected")
  })

  it("emits grouped messages with retry options and compensation metadata", async () => {
    const { context, emit, resolve } = eventBusContext()

    const response = await emitProductLifecycleEvents(
      { productIds: ["prod_2", "prod_1"], reason: "updated" },
      context
    )

    expect(resolve).toHaveBeenCalledWith(Modules.EVENT_BUS)
    expect(emit).toHaveBeenCalledOnce()
    expect(emit).toHaveBeenCalledWith([
      expect.objectContaining({
        data: expect.objectContaining({ productId: "prod_1" }),
        metadata: { eventGroupId: GROUP_ID },
        name: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
        options: PRODUCT_LIFECYCLE_RETRY_OPTIONS,
      }),
      expect.objectContaining({
        data: expect.objectContaining({ productId: "prod_2" }),
        metadata: { eventGroupId: GROUP_ID },
        name: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
        options: PRODUCT_LIFECYCLE_RETRY_OPTIONS,
      }),
    ])
    expect(response.compensateInput).toEqual({
      eventGroupId: GROUP_ID,
      eventName: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
    })
  })

  it("propagates an event-bus failure so the product workflow cannot succeed", async () => {
    const failure = new Error("redis unavailable")
    const { context, emit } = eventBusContext()
    emit.mockRejectedValue(failure)

    await expect(
      emitProductLifecycleEvents(
        { productIds: ["prod_1"], reason: "deleted" },
        context
      )
    ).rejects.toBe(failure)
  })

  it("turns a published assignment into unpublished when its exact locale Translation is missing", async () => {
    const { context } = eventBusContext(async () => [])

    const snapshots = await loadProductPublicationSnapshots(["prod_1"], context)

    expect(snapshots[0]?.assignments.sk).toBeNull()
  })

  it("classifies an unavailable Translation dependency as retryable server state", async () => {
    const { context } = eventBusContext(async () => {
      throw new Error("translation transport unavailable")
    })

    try {
      await loadProductPublicationSnapshots(["prod_1"], context)
    } catch (error) {
      expect(error).toBeInstanceOf(MedusaError)
      expect((error as MedusaError).type).toBe(
        MedusaError.Types.UNEXPECTED_STATE
      )
      expect((error as Error).message).not.toContain("transport unavailable")
      return
    }
    throw new Error("Expected unavailable Translation dependency to fail")
  })

  it("compensates only the custom lifecycle topic in the workflow group", async () => {
    const { clearGroupedEvents, context } = eventBusContext()

    await clearProductLifecycleEvents(
      {
        eventGroupId: GROUP_ID,
        eventName: URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT,
      },
      context
    )

    expect(clearGroupedEvents).toHaveBeenCalledOnce()
    expect(clearGroupedEvents).toHaveBeenCalledWith(GROUP_ID, {
      eventNames: [URL_REGISTRY_PRODUCT_LIFECYCLE_EVENT],
    })
  })
})
