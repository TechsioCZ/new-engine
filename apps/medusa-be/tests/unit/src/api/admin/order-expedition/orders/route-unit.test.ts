import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

type Graph = (input: unknown) => Promise<{
  data: unknown[]
  metadata: { count: number }
}>
type Json = (body: unknown) => unknown

type MockJsonResponse = MedusaResponse & { json: Mock<Json> }

const isMockJsonResponse = (
  candidate: unknown,
): candidate is MockJsonResponse =>
  isRecord(candidate) && typeof candidate["json"] === "function"

const createMockResponse = (): MockJsonResponse => {
  const candidate: unknown = { json: vi.fn<Json>() }
  if (!isMockJsonResponse(candidate)) {
    throw new TypeError("Expected a mock response with a json function")
  }
  return candidate
}

const isMockRequest = (candidate: unknown): candidate is MedusaRequest =>
  isRecord(candidate) &&
  isRecord(candidate["scope"]) &&
  typeof candidate["scope"]["resolve"] === "function" &&
  isRecord(candidate["validatedQuery"])

const createMockRequest = (
  validatedQuery: Record<string, unknown>,
  graph: Graph,
): MedusaRequest => {
  const orderNoteService = {
    listOrderNotes: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  }

  const candidate: unknown = {
    scope: {
      resolve: vi.fn<(token: string) => unknown>((token) =>
        token === "query" ? { graph } : orderNoteService,
      ),
    },
    validatedQuery,
  }
  if (!isMockRequest(candidate)) {
    throw new TypeError("Expected a request with scope and validated query")
  }
  return candidate
}

const getJsonBody = (response: MockJsonResponse): Record<string, unknown> => {
  const [call] = response.json.mock.calls
  const [body] = call ?? []
  if (!isRecord(body)) {
    throw new TypeError("Expected the route to return an object")
  }
  return body
}

const getFirstRecord = (
  container: Record<string, unknown>,
  key: string,
): Record<string, unknown> => {
  const value = container[key]
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected ${key} to be an array`)
  }
  const first: unknown = value[0]
  if (!isRecord(first)) {
    throw new TypeError(`Expected ${key} to contain an object`)
  }
  return first
}

describe("GET /admin/order-expedition/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an unfiltered page of orders", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/orders/route")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          display_id: 1001,
          id: "order_1",
          shipping_methods: [{ name: "PPL ParcelShop" }],
          status: "pending",
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
      }),
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
        scanned_count: null,
      }),
    )
    const firstOrder = getFirstRecord(getJsonBody(res), "orders")
    expect(firstOrder["id"]).toBe("order_1")
    expect(firstOrder["order_display_id"]).toBe("#1001")
    const { carrier } = firstOrder
    if (!isRecord(carrier)) {
      throw new TypeError("Expected an order carrier")
    }
    expect(carrier["value"]).toBe("ppl")
  })

  it("carrier filtering only narrows visible rows", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/orders/route")
    const graph = vi.fn<Graph>().mockResolvedValueOnce({
      data: [
        {
          id: "order_1",
          shipping_methods: [{ name: "PPL" }],
        },
        {
          display_id: 1002,
          id: "order_2",
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
      graph,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "order",
        pagination: {
          skip: 0,
          take: 100,
        },
      }),
    )
    const [[graphInput]] = graph.mock.calls
    if (!isRecord(graphInput) || !Array.isArray(graphInput["fields"])) {
      throw new TypeError("Expected graph fields")
    }
    expect(graphInput["fields"]).toStrictEqual(
      expect.arrayContaining([
        "items.quantity",
        "shipping_address.city",
        "shipping_methods.name",
      ]),
    )
    expect(graph).toHaveBeenCalledOnce()
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
      }),
    )
  })

  it("combines carrier and business status filters with AND semantics", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/orders/route")
    const graph = vi.fn<Graph>().mockResolvedValueOnce({
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
      graph,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        business_status: "paid",
        carrier: "packeta",
        count: 1,
      }),
    )
    const firstOrder = getFirstRecord(getJsonBody(res), "orders")
    expect(firstOrder["id"]).toBe("order_1")
    const { business_status: businessStatus, carrier } = firstOrder
    if (!isRecord(businessStatus) || !isRecord(carrier)) {
      throw new TypeError("Expected business status and carrier records")
    }
    expect(businessStatus["id"]).toBe("paid")
    expect(carrier["value"]).toBe("packeta")
  })

  it("stops carrier scans after the requested page and a next-page lookahead", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/orders/route")
    const graph = vi.fn<Graph>().mockResolvedValueOnce({
      data: [
        {
          display_id: 1001,
          id: "order_1",
          shipping_methods: [{ name: "Packeta" }],
          status: "pending",
        },
        {
          display_id: 1002,
          id: "order_2",
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
      graph,
    )
    const res = createMockResponse()

    await GET(req, res)

    expect(graph).toHaveBeenCalledOnce()
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
      }),
    )
  })

  it("caps carrier scans and exposes truncated metadata", async () => {
    const { GET } =
      await import("../../../../../../../src/api/admin/order-expedition/orders/route")
    const graph = vi.fn<Graph>()

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
      graph,
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
      }),
    )
  })
})
