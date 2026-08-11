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
    const req = createMockRequest(
      { limit: 50, offset: 0, order: "-display_id" },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        pagination: {
          order: {
            display_id: "DESC",
            id: "DESC",
          },
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
        order: "-display_id",
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

  it("passes order search and created date filters to the native query", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [],
      metadata: {
        count: 0,
      },
    })
    const createdAt = {
      $gte: "2026-08-01T00:00:00.000Z",
      $lte: "2026-08-31T23:59:59.999Z",
    }
    const req = createMockRequest(
      {
        created_at: createdAt,
        limit: 50,
        offset: 0,
        q: "#1001",
      },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        filters: {
          created_at: createdAt,
          q: "1001",
        },
      })
    )
  })

  it("applies native search filters before derived carrier filtering", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const matchingOrder = {
      id: "order_2",
      display_id: 1002,
      shipping_methods: [{ name: "Packeta" }],
      status: "pending",
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [matchingOrder],
        metadata: {
          count: 1,
        },
      })
      .mockResolvedValueOnce({ data: [matchingOrder] })
    const createdAt = {
      $gte: "2026-08-01T00:00:00.000Z",
      $lte: "2026-08-31T23:59:59.999Z",
    }
    const req = createMockRequest(
      {
        carrier: "packeta",
        created_at: createdAt,
        limit: 50,
        offset: 0,
        q: "John Doe",
      },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "order",
        filters: {
          created_at: createdAt,
          q: "John Doe",
        },
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "packeta",
        count: 1,
        orders: [expect.objectContaining({ id: "order_2" })],
      })
    )
  })

  it("carrier filtering only narrows visible rows", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const matchingOrder = {
      id: "order_2",
      display_id: 1002,
      items: [{ id: "item_2", quantity: 2, title: "Demo item" }],
      shipping_methods: [{ name: "Packeta" }],
      status: "pending",
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_1",
            shipping_methods: [{ name: "PPL" }],
          },
          matchingOrder,
        ],
        metadata: {
          count: 2,
        },
      })
      .mockResolvedValueOnce({ data: [matchingOrder] })
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
          "customer.first_name",
          "shipping_methods.name",
        ]),
        pagination: {
          order: {
            created_at: "DESC",
            id: "DESC",
          },
          skip: 0,
          take: 100,
        },
      })
    )
    expect(graph.mock.calls[0]?.[0]?.fields).not.toContain("items.quantity")
    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fields: expect.arrayContaining([
          "items.quantity",
          "shipping_address.city",
        ]),
        filters: {
          id: ["order_2"],
        },
      })
    )
    expect(graph).toHaveBeenCalledTimes(2)
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
    const matchingOrder = {
      id: "order_1",
      payment_status: "captured",
      shipping_methods: [{ name: "Packeta" }],
      status: "pending",
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          matchingOrder,
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
      .mockResolvedValueOnce({ data: [matchingOrder] })
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

  it("uses the sidebar badge predicate for the pending unpaid queue", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const matchingOrder = {
      id: "order_pending_unpaid",
      display_id: 1001,
      payment_status: "awaiting",
      status: "pending",
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          matchingOrder,
          {
            id: "order_partially_paid",
            payment_status: "partially_captured",
            status: "pending",
          },
          {
            id: "order_completed_unpaid",
            payment_status: "awaiting",
            status: "completed",
          },
        ],
        metadata: {
          count: 3,
        },
      })
      .mockResolvedValueOnce({ data: [matchingOrder] })
    const req = createMockRequest(
      { limit: 50, offset: 0, pending_unpaid: true },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        filters: {
          status: "pending",
        },
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 1,
        count_exact: true,
        orders: [expect.objectContaining({ id: "order_pending_unpaid" })],
        pending_unpaid: true,
        scanned_count: 3,
      })
    )
  })

  it("finishes filtered scans so count and pagination stay exact", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const firstBatch = Array.from({ length: 100 }, (_, index) => ({
      id: `order_${index + 1}`,
      display_id: 1001 + index,
      shipping_methods: [{ name: index < 2 ? "Packeta" : "PPL" }],
      status: "pending",
    }))
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: firstBatch,
        metadata: {
          count: 101,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "order_101",
            display_id: 1101,
            shipping_methods: [{ name: "PPL" }],
            status: "pending",
          },
        ],
        metadata: {
          count: 101,
        },
      })
      .mockResolvedValueOnce({
        data: [firstBatch[1], firstBatch[0]],
      })
    const req = createMockRequest(
      { carrier: "packeta", limit: 1, offset: 0 },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledTimes(3)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 2,
        count_exact: true,
        has_next: true,
        limit: 1,
        orders: [
          expect.objectContaining({
            id: "order_2",
          }),
        ],
        scanned_count: 101,
      })
    )
  })

  it("scans beyond the previous 1000-order cap", async () => {
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
          count: 1001,
        },
      })
    }

    graph.mockResolvedValueOnce({
      data: [
        {
          id: "order_match_after_1000",
          display_id: 2001,
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
      ],
      metadata: {
        count: 1001,
      },
    })
    graph.mockResolvedValueOnce({
      data: [
        {
          id: "order_match_after_1000",
          display_id: 2001,
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
      ],
    })

    const req = createMockRequest(
      { carrier: "packeta", limit: 50, offset: 0 },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledTimes(12)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "packeta",
        carrier_filter_limit_reached: false,
        count: 1,
        count_exact: true,
        has_next: false,
        orders: [expect.objectContaining({ id: "order_match_after_1000" })],
        scanned_count: 1001,
      })
    )
  })

  it("sorts derived customer values before applying pagination", async () => {
    const { GET } = await import(
      "../../../../../../../src/api/admin/order-expedition/orders/route"
    )
    const alphaOrder = {
      id: "order_alpha",
      customer: { first_name: "Alpha", last_name: "Customer" },
      display_id: 1002,
      status: "pending",
    }
    const betaOrder = {
      id: "order_beta",
      customer: { first_name: "Beta", last_name: "Customer" },
      display_id: 1001,
      status: "pending",
    }
    const gammaOrder = {
      id: "order_gamma",
      customer: { first_name: "Gamma", last_name: "Customer" },
      display_id: 1003,
      status: "pending",
    }
    const graph = vi
      .fn()
      .mockResolvedValueOnce({
        data: [gammaOrder, betaOrder, alphaOrder],
        metadata: { count: 3 },
      })
      .mockResolvedValueOnce({
        data: [betaOrder, alphaOrder],
      })
    const req = createMockRequest(
      { limit: 2, offset: 0, order: "customer" },
      graph
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        filters: {
          id: ["order_alpha", "order_beta"],
        },
      })
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 3,
        has_next: true,
        order: "customer",
        orders: [
          expect.objectContaining({ id: "order_alpha" }),
          expect.objectContaining({ id: "order_beta" }),
        ],
      })
    )
  })
})
