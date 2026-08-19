import { describe, expect, it } from "vitest"
import {
  normalizeProductLifecycleEventInput,
  UrlRegistryOutboxInputError,
} from "../../../../../src/modules/url-registry-outbox/types"

const URLR_OWNED_FIELD_PATTERN = /routeId|expectedVersion/
const marketAssignments = (
  markets: readonly ("sk" | "cz" | "hu" | "ro")[],
  assignment: null | Readonly<{
    publicationStatus: "draft" | "published"
    publicSlug: string
    salesChannelId: string
  }> = null
) =>
  markets.map((marketCode) => ({
    assignment,
    marketCode,
    sourceVersion: "2026-08-18T08:00:00.000Z",
  }))

describe("URL registry product lifecycle event contract", () => {
  it("normalizes a market-scoped reconcile event without URLR-owned state", () => {
    const result = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["sk", "cz", "sk"],
      eventId: "workflow-42:products-updated:prod_1",
      marketAssignments: marketAssignments(["sk", "cz"], {
        publicationStatus: "published",
        publicSlug: "product-1",
        salesChannelId: "sc_product_1",
      }),
      occurredAt: "2026-08-18T10:15:30+02:00",
      productId: "prod_1",
      reason: "updated",
      trace: {
        stepIdempotencyKey: "step-42",
        transactionId: "transaction-42",
        workflowId: "update-products",
      },
    })

    expect(result).toEqual({
      affectedMarketCodes: ["cz", "sk"],
      eventId: "workflow-42:products-updated:prod_1",
      occurredAt: "2026-08-18T08:15:30.000Z",
      payloadByMarket: {
        cz: {
          assignment: {
            publicationStatus: "published",
            publicSlug: "product-1",
            salesChannelId: "sc_product_1",
          },
          changeType: "reconcile",
          productId: "prod_1",
          reason: "updated",
          schemaVersion: 1,
          sourceVersion: "2026-08-18T08:00:00.000Z",
          trace: {
            stepIdempotencyKey: "step-42",
            transactionId: "transaction-42",
            workflowId: "update-products",
          },
        },
        sk: expect.any(Object),
      },
      productId: "prod_1",
      source: "medusa",
    })
    expect(JSON.stringify(result.payloadByMarket)).not.toMatch(
      URLR_OWNED_FIELD_PATTERN
    )
  })

  it("classifies permanent deletion separately from temporary availability", () => {
    const deleted = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["hu"],
      eventId: "delete:prod_2",
      marketAssignments: marketAssignments(["hu"]),
      occurredAt: "2026-08-18T08:15:30.000Z",
      productId: "prod_2",
      reason: "deleted",
    })
    const unlinked = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["hu"],
      eventId: "unlink:prod_2:sc_hu",
      marketAssignments: marketAssignments(["hu"]),
      occurredAt: "2026-08-18T08:15:31.000Z",
      productId: "prod_2",
      reason: "channel-unlinked",
    })

    expect(deleted.payloadByMarket.hu.changeType).toBe("delete")
    expect(unlinked.payloadByMarket.hu.changeType).toBe("reconcile")
  })

  it.each([
    ["empty event ID", { eventId: "" }],
    ["unknown market", { affectedMarketCodes: ["de"] }],
    ["empty market set", { affectedMarketCodes: [] }],
    ["invalid timestamp", { occurredAt: "tomorrow" }],
    ["unknown reason", { reason: "renamed" }],
    ["unexpected field", { routeId: "route_1" }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      normalizeProductLifecycleEventInput({
        affectedMarketCodes: ["ro"],
        eventId: "event-1",
        marketAssignments: marketAssignments(["ro"]),
        occurredAt: "2026-08-18T08:15:30.000Z",
        productId: "prod_1",
        reason: "created",
        ...override,
      })
    ).toThrow(UrlRegistryOutboxInputError)
  })
})
