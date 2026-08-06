import { describe, expect, it } from "vitest"

import {
  getOrderBusinessManualStatusUpdateBlockReason,
  isManualOrderBusinessStatusId,
  isPendingUnpaidOrder,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
  ORDER_BUSINESS_STATUSES,
  resolveOrderBusinessStatus,
} from "../../../../src/utils/order-business-status"
import type { OrderBusinessStatusInput } from "../../../../src/utils/order-business-status"

const createOrder = (
  overrides: Partial<OrderBusinessStatusInput> = {},
): OrderBusinessStatusInput => ({
  ...overrides,
})

describe("order business status", () => {
  it("exposes the approved statuses with admin translation keys", () => {
    expect(
      Object.values(ORDER_BUSINESS_STATUSES)
        .map((status): [string, string] => [status.id, status.translation_key])
        .toSorted(([left], [right]) => left.localeCompare(right)),
    ).toStrictEqual([
      ["awaiting_payment", "statuses.awaiting_payment"],
      ["canceled", "statuses.canceled"],
      ["delivered", "statuses.delivered"],
      ["new", "statuses.new"],
      ["paid", "statuses.paid"],
      ["processing", "statuses.processing"],
      ["shipped", "statuses.shipped"],
      ["waiting_for_supplier", "statuses.waiting_for_supplier"],
    ])
  })

  it("accepts only the approved manual statuses", () => {
    expect(isManualOrderBusinessStatusId("processing")).toBeTruthy()
    expect(isManualOrderBusinessStatusId("waiting_for_supplier")).toBeTruthy()
    expect(isManualOrderBusinessStatusId("canceled")).toBeTruthy()
    expect(isManualOrderBusinessStatusId("paid")).toBeFalsy()
    expect(isManualOrderBusinessStatusId("delivered")).toBeFalsy()
  })

  it("falls back to Nová when there is no reliable signal", () => {
    expect(resolveOrderBusinessStatus(createOrder()).id).toBe("new")
  })

  it.each([
    {
      name: "there are no payment collections",
      overrides: { payment_collections: [] },
    },
    {
      name: "payment requires action",
      overrides: { payment_status: "requires_action" },
    },
    {
      name: "payment is only authorized",
      overrides: { payment_status: "authorized" },
    },
    {
      name: "payment is partially captured",
      overrides: { payment_status: "partially_captured" },
    },
    {
      name: "payment collection failed",
      overrides: { payment_collections: [{ status: "failed" }] },
    },
    {
      name: "order-level payment status overrides completed collection",
      overrides: {
        payment_collections: [{ status: "completed" }],
        payment_status: "partially_captured",
      },
    },
  ] satisfies {
    name: string
    overrides: Partial<OrderBusinessStatusInput>
  }[])("shows Čeká na platbu when $name", ({ overrides }) => {
    expect(resolveOrderBusinessStatus(createOrder(overrides)).id).toBe(
      "awaiting_payment",
    )
  })

  it.each([
    {
      name: "payment status is captured",
      overrides: { payment_status: "captured" },
    },
    {
      name: "payment status is completed",
      overrides: { payment_status: "completed" },
    },
    {
      name: "payment collection is completed",
      overrides: { payment_collections: [{ status: "completed" }] },
    },
  ] satisfies {
    name: string
    overrides: Partial<OrderBusinessStatusInput>
  }[])("shows Zaplacená when $name", ({ overrides }) => {
    expect(resolveOrderBusinessStatus(createOrder(overrides)).id).toBe("paid")
  })

  it("does not show Zaplacená for partially captured payment", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({ payment_status: "partially_captured" }),
      ).id,
    ).not.toBe("paid")
  })

  it.each([
    {
      name: "there are no payment collections",
      overrides: { payment_collections: [] },
    },
    {
      name: "payment requires action",
      overrides: { payment_status: "requires_action" },
    },
    {
      name: "payment is only authorized",
      overrides: { payment_status: "authorized" },
    },
    {
      name: "payment is awaiting",
      overrides: { payment_status: "awaiting" },
    },
    {
      name: "payment is partially authorized",
      overrides: { payment_status: "partially_authorized" },
    },
  ] satisfies {
    name: string
    overrides: Partial<OrderBusinessStatusInput>
  }[])("counts pending unpaid orders when $name", ({ overrides }) => {
    expect(
      isPendingUnpaidOrder(createOrder({ status: "pending", ...overrides })),
    ).toBeTruthy()
  })

  it.each([
    {
      name: "the order is not pending",
      overrides: { payment_status: "authorized", status: "completed" },
    },
    {
      name: "payment is captured",
      overrides: { payment_status: "captured", status: "pending" },
    },
    {
      name: "payment is completed",
      overrides: { payment_status: "completed", status: "pending" },
    },
    {
      name: "payment is partially captured",
      overrides: { payment_status: "partially_captured", status: "pending" },
    },
  ] satisfies {
    name: string
    overrides: Partial<OrderBusinessStatusInput>
  }[])("does not count pending unpaid orders when $name", ({ overrides }) => {
    expect(isPendingUnpaidOrder(createOrder(overrides))).toBeFalsy()
  })

  it("lets manual processing states override paid orders", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
          payment_status: "captured",
        }),
      ).id,
    ).toBe("processing")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "waiting_for_supplier",
          },
          payment_status: "captured",
        }),
      ).id,
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
        }),
      ).id,
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "delivered",
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
          payment_status: "captured",
        }),
      ).id,
    ).toBe("delivered")
  })

  it("uses fulfillment timestamps when status fields are unavailable", () => {
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillments: [{ shipped_at: "2026-05-07T12:00:00.000Z" }],
        }),
      ).id,
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillments: [{ delivered_at: "2026-05-07T12:00:00.000Z" }],
        }),
      ).id,
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
        }),
      ).id,
    ).toBe("shipped")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          fulfillment_status: "partially_delivered",
          fulfillments: [{ delivered_at: "2026-05-07T12:00:00.000Z" }],
        }),
      ).id,
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
        }),
      ).id,
    ).toBe("canceled")
    expect(
      resolveOrderBusinessStatus(
        createOrder({
          payment_status: "captured",
          status: "canceled",
        }),
      ).id,
    ).toBe("canceled")
  })

  it("explains manual status bulk update blockers", () => {
    expect([
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({
          fulfillment_status: "delivered",
          payment_status: "captured",
        }),
        "processing",
      ),
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "processing",
          },
        }),
        "processing",
      ),
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({ payment_status: "captured" }),
        "waiting_for_supplier",
      ),
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({ status: "canceled" }),
        "processing",
      ),
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({ status: "canceled" }),
        "canceled",
      ),
      getOrderBusinessManualStatusUpdateBlockReason(
        createOrder({
          metadata: {
            [ORDER_BUSINESS_STATUS_METADATA_KEY]: "canceled",
          },
        }),
        "processing",
      ),
    ]).toStrictEqual([
      "delivered status has higher priority",
      "Manual status is already processing",
      undefined,
      "canceled status has higher priority",
      undefined,
      undefined,
    ])
  })
})
