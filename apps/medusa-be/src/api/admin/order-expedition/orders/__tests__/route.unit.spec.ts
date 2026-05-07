import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
}))

const createMockResponse = () => ({
  json: vi.fn().mockReturnThis(),
})

const createMockRequest = (
  validatedQuery: Record<string, unknown>,
  graph: ReturnType<typeof vi.fn>
) => ({
  scope: {
    resolve: vi.fn(() => ({ graph })),
  },
  validatedQuery,
})

describe("GET /admin/order-expedition/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an unfiltered page of orders", async () => {
    const { GET } = await import("../route")
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
        count: 1,
        limit: 50,
        offset: 0,
        orders: [
          expect.objectContaining({
            carrier: expect.objectContaining({ value: "ppl" }),
            id: "order_1",
            order_display_id: "#1001",
          }),
        ],
      })
    )
  })

  it("carrier filtering only narrows visible rows", async () => {
    const { GET } = await import("../route")
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          id: "order_1",
          display_id: 1001,
          shipping_methods: [{ name: "PPL" }],
          status: "pending",
        },
        {
          id: "order_2",
          display_id: 1002,
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

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        carrier: "packeta",
        count: 1,
        orders: [
          expect.objectContaining({
            id: "order_2",
            order_display_id: "#1002",
          }),
        ],
      })
    )
  })
})
