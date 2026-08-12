import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockCreateFulfillmentRun } = vi.hoisted(() => ({
  mockCreateFulfillmentRun: vi.fn(),
}))

vi.mock("@medusajs/medusa/core-flows", () => ({
  createOrderFulfillmentWorkflow: vi.fn(() => ({
    run: mockCreateFulfillmentRun,
  })),
}))

const createResponse = () => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
})

const createOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "order_1",
  items: [
    {
      detail: { fulfilled_quantity: 1 },
      id: "item_1",
      quantity: 3,
      requires_shipping: true,
      title: "Product",
      variant: { product: { shipping_profile: { id: "sp_1" } } },
    },
  ],
  shipping_methods: [{ shipping_option_id: "so_1" }],
  status: "pending",
  ...overrides,
})

const createShippingOption = (overrides: Record<string, unknown> = {}) => ({
  id: "so_1",
  provider_id: "manual_manual",
  service_zone: { fulfillment_set: { location: { id: "loc_1" } } },
  shipping_profile_id: "sp_1",
  ...overrides,
})

const createRequest = (graph: ReturnType<typeof vi.fn>) => ({
  params: { id: "order_1" },
  scope: { resolve: vi.fn(() => ({ graph })) },
  validatedBody: { location_id: "loc_1", no_notification: true },
})

describe("POST /admin/order-expedition/orders/:id/fulfillments", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateFulfillmentRun.mockResolvedValue({ result: { id: "ful_1" } })
  })

  it("derives the remaining quantity and original Medusa shipping option on the backend", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/[id]/fulfillments/route"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [createOrder()] })
      .mockResolvedValueOnce({ data: [createShippingOption()] })
    const request = createRequest(graph)
    const response = createResponse()

    await POST(request as never, response as never)

    expect(mockCreateFulfillmentRun).toHaveBeenCalledWith({
      input: {
        items: [{ id: "item_1", quantity: 2 }],
        location_id: "loc_1",
        no_notification: true,
        order_id: "order_1",
        shipping_option_id: "so_1",
      },
    })
    expect(response.status).toHaveBeenCalledWith(200)
    expect(response.json).toHaveBeenCalledWith({ fulfillment: { id: "ful_1" } })
  })

  it("rejects an order without remaining shippable quantity before mutation", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/[id]/fulfillments/route"
    )
    const fulfilledItem = {
      detail: { fulfilled_quantity: 3 },
      id: "item_1",
      quantity: 3,
      requires_shipping: true,
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [createOrder({ items: [fulfilledItem] })],
      })
      .mockResolvedValueOnce({ data: [createShippingOption()] })

    await expect(
      POST(createRequest(graph) as never, createResponse() as never)
    ).rejects.toThrow(
      "Order order_1 has no remaining shippable quantity to fulfill"
    )
    expect(mockCreateFulfillmentRun).not.toHaveBeenCalled()
  })

  it("rejects a shipping option that is not available at the selected location", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/[id]/fulfillments/route"
    )
    const unavailableShippingOption = createShippingOption({
      service_zone: { fulfillment_set: { location: { id: "loc_2" } } },
    })
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [createOrder()] })
      .mockResolvedValueOnce({ data: [unavailableShippingOption] })
    const fulfillmentRequest = POST(
      createRequest(graph) as never,
      createResponse() as never
    )

    await expect(fulfillmentRequest).rejects.toThrow(
      "The order shipping option is not available at stock location loc_1"
    )
    expect(mockCreateFulfillmentRun).not.toHaveBeenCalled()
  })

  it("propagates the native Medusa fulfillment reason unchanged", async () => {
    const { POST } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/[id]/fulfillments/route"
    )
    const graph = vi
      .fn()
      .mockResolvedValueOnce({ data: [createOrder()] })
      .mockResolvedValueOnce({ data: [createShippingOption()] })

    mockCreateFulfillmentRun.mockRejectedValueOnce(
      new Error("No stock reservation found for item item_1")
    )

    await expect(
      POST(createRequest(graph) as never, createResponse() as never)
    ).rejects.toThrow("No stock reservation found for item item_1")
  })
})
