import type { Query } from "@medusajs/framework/types"
import { describe, expect, it, vi } from "vitest"
import { resolveOrderExpeditionCustomerSignals } from "../../../../src/utils/order-expedition-customer-signals"

describe("order expedition customer signals", () => {
  it("marks another canceled order as customer history", async () => {
    const query = createQuery([
      { customer_id: "cus_1", status: "pending" },
      { customer_id: "cus_1", status: "canceled" },
    ])

    const { counts, signalsByOrderId } =
      await resolveOrderExpeditionCustomerSignals(query, [
        {
          customer_id: "cus_1",
          id: "order_current",
          status: "pending",
        },
      ])

    expect(signalsByOrderId.get("order_current")).toEqual({
      note: false,
      returning_customer: true,
      storn_orders: true,
      wholesale_company_name: null,
    })
    expect(counts).toEqual({
      note: 0,
      returning_customer: 1,
      storn_orders: 1,
    })
  })

  it("does not count the current canceled order as previous history", async () => {
    const query = createQuery([{ customer_id: "cus_1", status: "canceled" }])

    const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
      query,
      [
        {
          customer_id: "cus_1",
          id: "order_canceled",
          status: "canceled",
        },
      ]
    )

    expect(signalsByOrderId.get("order_canceled")).toEqual({
      note: false,
      returning_customer: false,
      storn_orders: false,
      wholesale_company_name: null,
    })
  })

  it("marks a canceled order when another cancellation exists", async () => {
    const query = createQuery([
      { customer_id: "cus_1", status: "canceled" },
      { customer_id: "cus_1", status: "canceled" },
    ])

    const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
      query,
      [
        {
          customer_id: "cus_1",
          id: "order_canceled",
          status: "canceled",
        },
      ]
    )

    expect(signalsByOrderId.get("order_canceled")).toEqual({
      note: false,
      returning_customer: true,
      storn_orders: true,
      wholesale_company_name: null,
    })
  })

  it("marks customers linked to an active wholesale company", async () => {
    const query = createQuery([{ customer_id: "cus_1", status: "pending" }])

    const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
      query,
      [
        {
          customer: {
            employee: {
              company: {
                id: "comp_1",
                name: "Wholesale Demo s.r.o.",
              },
            },
          },
          customer_id: "cus_1",
          id: "order_current",
          status: "pending",
        },
      ]
    )

    expect(signalsByOrderId.get("order_current")).toEqual({
      note: false,
      returning_customer: false,
      storn_orders: false,
      wholesale_company_name: "Wholesale Demo s.r.o.",
    })
  })

  it("ignores a deleted wholesale membership", async () => {
    const query = createQuery([{ customer_id: "cus_1", status: "pending" }])

    const { signalsByOrderId } = await resolveOrderExpeditionCustomerSignals(
      query,
      [
        {
          customer: {
            employee: {
              deleted_at: "2026-08-11T00:00:00.000Z",
              company: {
                id: "comp_1",
                name: "Wholesale Demo s.r.o.",
              },
            },
          },
          customer_id: "cus_1",
          id: "order_current",
          status: "pending",
        },
      ]
    )

    expect(
      signalsByOrderId.get("order_current")?.wholesale_company_name
    ).toBeNull()
  })
})

function createQuery(orders: unknown[]) {
  return {
    graph: vi.fn().mockResolvedValue({ data: orders }),
  } as unknown as Query
}
