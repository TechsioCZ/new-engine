import { describe, expect, it } from "vitest"
import {
  isManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
  ORDER_BUSINESS_STATUSES,
  type OrderBusinessStatusInput,
  resolveOrderBusinessStatus,
} from "../order-business-status"

const createOrder = (
  overrides: Partial<OrderBusinessStatusInput> = {}
): OrderBusinessStatusInput => ({
  fulfillment_status: undefined,
  fulfillments: undefined,
  metadata: undefined,
  payment_collections: undefined,
  payment_status: undefined,
  status: undefined,
  ...overrides,
})

describe("order business status", () => {
  it("exposes the approved Czech labels", () => {
    expect(
      Object.values(ORDER_BUSINESS_STATUSES).map((status) => status.label)
    ).toEqual([
      "Storno",
      "Doručená",
      "Expedovaná",
      "Čeká na dodavatele",
      "Zpracovává se",
      "Zaplacená",
      "Čeká na platbu",
      "Nová",
    ])
  })

  it("accepts only the approved manual statuses", () => {
    expect(isManualOrderBusinessStatusId("processing")).toBe(true)
    expect(isManualOrderBusinessStatusId("waiting_for_supplier")).toBe(true)
    expect(isManualOrderBusinessStatusId("canceled")).toBe(true)
    expect(isManualOrderBusinessStatusId("paid")).toBe(false)
    expect(isManualOrderBusinessStatusId("delivered")).toBe(false)
  })

  it("falls back to Nová when there is no reliable signal", () => {
    expect(resolveOrderBusinessStatus(createOrder()).id).toBe("new")
  })

  it("shows Čeká na platbu for orders without confirmed payment", () => {
    expect(
      resolveOrderBusinessStatus(createOrder({ payment_collections: [] })).id
    ).toBe("awaiting_payment")
    expect(
      resolveOrderBusinessStatus(
        createOrder({ payment_status: "requires_action" })
      ).id
    ).toBe("awaiting_payment")
    expect(
      resolveOrderBusinessStatus(createOrder({ payment_status: "authorized" }))
        .id
    ).toBe("awaiting_payment")
    expect(
      resolveOrderBusinessStatus(
        createOrder({ payment_status: "partially_captured" })
      ).id
    ).toBe("awaiting_payment")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          payment_collections: [{ status: "completed" }],
          payment_status: "partially_captured",
        })
      ).id
    ).toBe("awaiting_payment")
  })

  it("shows Zaplacená only for completed payment signals", () => {
    expect(
      resolveOrderBusinessStatus(createOrder({ payment_status: "captured" })).id
    ).toBe("paid")
    expect(
      resolveOrderBusinessStatus(createOrder({ payment_status: "completed" }))
        .id
    ).toBe("paid")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          payment_collections: [{ status: "completed" }],
        })
      ).id
    ).toBe("paid")
    expect(
      resolveOrderBusinessStatus(
        createOrder({ payment_status: "partially_captured" })
      ).id
    ).not.toBe("paid")
  })

  it("lets manual processing states override paid orders", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
          payment_status: "captured",
        })
      ).id
    ).toBe("processing")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "waiting_for_supplier",
          },
          payment_status: "captured",
        })
      ).id
    ).toBe("waiting_for_supplier")
  })

  it("gives shipped and delivered signals priority over processing states", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "shipped",
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
          payment_status: "captured",
        })
      ).id
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "delivered",
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
          payment_status: "captured",
        })
      ).id
    ).toBe("delivered")
  })

  it("uses fulfillment timestamps when status fields are unavailable", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillments: [{ shipped_at: "2026-05-07T12:00:00.000Z" }],
        })
      ).id
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillments: [{ delivered_at: "2026-05-07T12:00:00.000Z" }],
        })
      ).id
    ).toBe("delivered")
  })

  it("does not mark partially delivered fulfillment sets as Doručená", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillments: [
            { delivered_at: "2026-05-07T12:00:00.000Z" },
            { shipped_at: "2026-05-07T12:00:00.000Z" },
          ],
        })
      ).id
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "partially_delivered",
          fulfillments: [{ delivered_at: "2026-05-07T12:00:00.000Z" }],
        })
      ).id
    ).toBe("shipped")
  })

  it("gives Storno priority over payment and fulfillment signals", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "delivered",
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "canceled",
          },
          payment_status: "captured",
        })
      ).id
    ).toBe("canceled")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          payment_status: "captured",
          status: "canceled",
        })
      ).id
    ).toBe("canceled")
  })
})
