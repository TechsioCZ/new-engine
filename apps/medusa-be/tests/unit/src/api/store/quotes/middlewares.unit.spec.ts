import { beforeEach, describe, expect, it, vi } from "vitest"

const createResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

const createRequest = ({
  actorId = "cus_1",
  graph,
  params = { id: "quote_1" },
}: {
  actorId?: string
  graph: ReturnType<typeof vi.fn>
  params?: Record<string, string>
}) =>
  ({
    auth_context: {
      actor_id: actorId,
    },
    params,
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === "query") {
          return { graph }
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }) as any

describe("store quote middlewares", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers quote ownership checks on customer quote detail and action routes", async () => {
    const { ensureQuoteCustomer, storeQuotesMiddlewares } = await import(
      "../../../../../../src/api/store/quotes/middlewares"
    )

    const ownerScopedRoutes = [
      { matcher: "/store/quotes/:id", method: "GET" },
      { matcher: "/store/quotes/:id/accept", method: "POST" },
      { matcher: "/store/quotes/:id/reject", method: "POST" },
      { matcher: "/store/quotes/:id/preview", method: "GET" },
      { matcher: "/store/quotes/:id/messages", method: "POST" },
    ]

    for (const { matcher, method } of ownerScopedRoutes) {
      const route = storeQuotesMiddlewares.find(
        (middlewareRoute) =>
          middlewareRoute.method?.includes(method) &&
          middlewareRoute.matcher === matcher
      )

      expect(route).toBeDefined()
      expect(route?.middlewares).toContain(ensureQuoteCustomer)
    }
  })

  it("allows the customer that owns the route quote", async () => {
    const { ensureQuoteCustomer } = await import(
      "../../../../../../src/api/store/quotes/middlewares"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ customer_id: "cus_1", id: "quote_1" }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn()

    await ensureQuoteCustomer(req, res, next)

    expect(graph).toHaveBeenCalledWith({
      entity: "quote",
      fields: ["id", "customer_id"],
      filters: { id: "quote_1" },
    })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("rejects customers that do not own the route quote", async () => {
    const { ensureQuoteCustomer } = await import(
      "../../../../../../src/api/store/quotes/middlewares"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ customer_id: "cus_2", id: "quote_1" }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn()

    await ensureQuoteCustomer(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("returns not found when the route quote does not exist", async () => {
    const { ensureQuoteCustomer } = await import(
      "../../../../../../src/api/store/quotes/middlewares"
    )
    const graph = vi.fn().mockResolvedValue({ data: [] })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn()

    await ensureQuoteCustomer(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Quote not found" })
  })
})
