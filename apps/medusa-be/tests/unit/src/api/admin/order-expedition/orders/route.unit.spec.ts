import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@medusajs/framework/utils")>()

  return {
    ...actual,
    ContainerRegistrationKeys: {
      ...actual.ContainerRegistrationKeys,
      QUERY: "query",
    },
  }
})

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

const createMockRequest = (
  validatedQuery: Record<string, unknown>,
  graph: ReturnType<typeof vi.fn>
) => {
  const orderNoteService = {
    listOrderNotes: vi.fn().mockResolvedValue([]),
  }

  return {
    scope: {
      resolve: vi.fn((token: string) =>
        token === "query" ? { graph } : orderNoteService
      ),
    },
    validatedQuery,
  }
}

describe("GET /admin/order-expedition/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an unfiltered page of orders", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          status: "pending",
          shipping_methods: [{ name: "PPL ParcelShop" }],
        },
      ],
      metadata: {
        count: 1,
      },
    })
    const req = createMockRequest({ limit: 50, offset: 0 }, graph)
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        pagination: {
          skip: 0,
          take: 50,
        },
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: null,
        carrier_filter_limit_reached: false,
        count: 1,
        count_exact: true,
        has_next: false,
        limit: 50,
        offset: 0,
        orders: [
          expect.objectContaining({
            carrier: expect.objectContaining({ value: "ppl" }),
            id: "order_1",
            order_display_id: "#1001",
          }),
        ],
        scanned_count: null,
      })
    )
  })

  it("carrier filtering only narrows visible rows", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: "order_1",
          shipping_methods: [{ name: "PPL" }],
        },
        {
          id: "order_2",
          display_id: 1002,
          items: [{ id: "item_2", quantity: 2, title: "Demo item" }],
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
      ],
      metadata: {
        count: 2,
      },
    })
    const req = createMockRequest(
      { carrier: "packeta", limit: 50, offset: 0 },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "order",
        fields: expect.arrayContaining([
          "items.quantity",
          "shipping_address.city",
          "shipping_methods.name",
        ]),
        pagination: {
          skip: 0,
          take: 100,
        },
      })
    )
    expect(graph).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "packeta",
        carrier_filter_limit_reached: false,
        count: 1,
        count_exact: true,
        has_next: false,
        orders: [
          expect.objectContaining({
            id: "order_2",
            items: [expect.objectContaining({ quantity: 2 })],
            order_display_id: "#1002",
          }),
        ],
        scanned_count: 2,
      })
    )
  })

  it("combines carrier and business status filters with AND semantics", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: "order_1",
          payment_status: "captured",
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
        {
          id: "order_2",
          payment_status: "awaiting",
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
        {
          id: "order_3",
          payment_status: "captured",
          shipping_methods: [{ name: "PPL" }],
          status: "pending",
        },
      ],
      metadata: {
        count: 3,
      },
    })
    const req = createMockRequest(
      {
        business_status: "paid",
        carrier: "packeta",
        limit: 50,
        offset: 0,
      },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        business_status: "paid",
        carrier: "packeta",
        count: 1,
        orders: [
          expect.objectContaining({
            id: "order_1",
            business_status: expect.objectContaining({ id: "paid" }),
            carrier: expect.objectContaining({ value: "packeta" }),
          }),
        ],
      })
    )
  })

  it("stops carrier scans after the requested page and a next-page lookahead", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
        {
          id: "order_2",
          display_id: 1002,
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
        {
          id: "order_3",
          shipping_methods: [{ name: "PPL" }],
        },
      ],
      metadata: {
        count: 1000,
      },
    })
    const req = createMockRequest(
      { carrier: "packeta", limit: 1, offset: 0 },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        count_exact: false,
        has_next: true,
        limit: 1,
        orders: [
          expect.objectContaining({
            id: "order_1",
          }),
        ],
        scanned_count: 3,
      })
    )
  })

  it("caps carrier scans and exposes truncated metadata", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn()

    for (let batchIndex = 0; batchIndex < 10; batchIndex += 1) {
      graph.mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, index) => ({
          id: `order_${batchIndex}_${index}`,
          shipping_methods: [{ name: "PPL" }],
        })),
        metadata: {
          count: 5000,
        },
      })
    }

    const req = createMockRequest(
      { carrier: "packeta", limit: 50, offset: 0 },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledTimes(10)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "packeta",
        carrier_filter_limit_reached: true,
        count: 0,
        count_exact: false,
        has_next: false,
        orders: [],
        scanned_count: 1000,
      })
    )
  })
})
