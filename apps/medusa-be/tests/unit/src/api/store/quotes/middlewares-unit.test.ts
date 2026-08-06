import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
  MiddlewareVerb,
} from "@medusajs/framework"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Mock } from "vitest"

type Graph = (input: unknown) => Promise<{
  data: { customer_id: string; id: string }[]
}>
type Json = (body: unknown) => unknown
type SetStatus = (status: number) => unknown
type MockResponse = MedusaResponse & {
  json: Mock<Json>
  status: Mock<SetStatus>
}

const isAuthenticatedRequest = (
  candidate: unknown,
): candidate is AuthenticatedMedusaRequest => {
  if (!isRecord(candidate)) {
    return false
  }
  const { auth_context: authContext, params, scope } = candidate
  if (!(isRecord(authContext) && typeof authContext.actor_id === "string")) {
    return false
  }
  if (!(isRecord(params) && isRecord(scope))) {
    return false
  }
  return typeof scope.resolve === "function"
}

const createResponse = (): MockResponse => {
  const candidate: unknown = {
    json: vi.fn<Json>().mockReturnThis(),
    status: vi.fn<SetStatus>().mockReturnThis(),
  }
  if (
    !(
      isRecord(candidate) &&
      typeof candidate["json"] === "function" &&
      typeof candidate["status"] === "function"
    )
  ) {
    throw new TypeError("Expected a response with json and status functions")
  }
  return candidate
}

const createRequest = ({
  actorId = "cus_1",
  graph,
  params = { id: "quote_1" },
}: {
  actorId?: string
  graph: Mock<Graph>
  params?: Record<string, string>
}): AuthenticatedMedusaRequest => {
  const candidate: unknown = {
    auth_context: { actor_id: actorId },
    params,
    scope: {
      resolve: vi.fn<(key: string) => { graph: Mock<Graph> }>((key) => {
        if (key === "query") {
          return { graph }
        }
        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }
  if (!isAuthenticatedRequest(candidate)) {
    throw new TypeError("Expected an authenticated request")
  }
  return candidate
}
describe("store quote middlewares", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("registers quote ownership checks on customer quote detail and action routes", async () => {
    const { ensureQuoteCustomer, storeQuotesMiddlewares } =
      await import("../../../../../../src/api/store/quotes/middlewares")

    const ownerScopedRoutes: {
      matcher: string
      method: MiddlewareVerb
    }[] = [
      { matcher: "/store/quotes/:id", method: "GET" },
      { matcher: "/store/quotes/:id/accept", method: "POST" },
      { matcher: "/store/quotes/:id/reject", method: "POST" },
      { matcher: "/store/quotes/:id/preview", method: "GET" },
      { matcher: "/store/quotes/:id/messages", method: "POST" },
    ]

    for (const { matcher, method } of ownerScopedRoutes) {
      const route = storeQuotesMiddlewares.find((middlewareRoute) => {
        const candidate: unknown = middlewareRoute
        if (!isRecord(candidate)) {
          return false
        }
        const routeMethods = candidate.method
        return (
          Array.isArray(routeMethods) &&
          routeMethods.includes(method) &&
          candidate.matcher === matcher
        )
      })

      expect(route).toBeDefined()
      expect(route?.middlewares).toContain(ensureQuoteCustomer)
    }
  })

  it("allows the customer that owns the route quote", async () => {
    const { ensureQuoteCustomer } =
      await import("../../../../../../src/api/store/quotes/middlewares")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ customer_id: "cus_1", id: "quote_1" }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn<() => void>()

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
    const { ensureQuoteCustomer } =
      await import("../../../../../../src/api/store/quotes/middlewares")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ customer_id: "cus_2", id: "quote_1" }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn<() => void>()

    await ensureQuoteCustomer(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("returns not found when the route quote does not exist", async () => {
    const { ensureQuoteCustomer } =
      await import("../../../../../../src/api/store/quotes/middlewares")
    const graph = vi.fn<Graph>().mockResolvedValue({ data: [] })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn<() => void>()

    await ensureQuoteCustomer(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: "Quote not found" })
  })
})
