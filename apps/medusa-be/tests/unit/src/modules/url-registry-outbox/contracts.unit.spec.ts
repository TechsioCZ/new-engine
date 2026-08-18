import { describe, expect, it } from "vitest"
import {
  normalizeProductLifecycleEventInput,
  UrlRegistryOutboxInputError,
} from "../../../../../src/modules/url-registry-outbox/types"

const URLR_OWNED_FIELD_PATTERN = /slug|routeId|expectedVersion/

describe("URL registry product lifecycle event contract", () => {
  it("normalizes a market-scoped reconcile event without URLR-owned state", () => {
    const result = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["sk", "cz", "sk"],
      eventId: "workflow-42:products-updated:prod_1",
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
      payload: {
        changeType: "reconcile",
        productId: "prod_1",
        reason: "updated",
        schemaVersion: 1,
        trace: {
          stepIdempotencyKey: "step-42",
          transactionId: "transaction-42",
          workflowId: "update-products",
        },
      },
      productId: "prod_1",
      source: "medusa",
    })
    expect(JSON.stringify(result.payload)).not.toMatch(URLR_OWNED_FIELD_PATTERN)
  })

  it("classifies permanent deletion separately from temporary availability", () => {
    const deleted = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["hu"],
      eventId: "delete:prod_2",
      occurredAt: "2026-08-18T08:15:30.000Z",
      productId: "prod_2",
      reason: "deleted",
    })
    const unlinked = normalizeProductLifecycleEventInput({
      affectedMarketCodes: ["hu"],
      eventId: "unlink:prod_2:sc_hu",
      occurredAt: "2026-08-18T08:15:31.000Z",
      productId: "prod_2",
      reason: "channel-unlinked",
    })

    expect(deleted.payload.changeType).toBe("delete")
    expect(unlinked.payload.changeType).toBe("reconcile")
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
        occurredAt: "2026-08-18T08:15:30.000Z",
        productId: "prod_1",
        reason: "created",
        ...override,
      })
    ).toThrow(UrlRegistryOutboxInputError)
  })
})
