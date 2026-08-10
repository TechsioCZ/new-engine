import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) => {
  const original = await importOriginal()

  return {
    ...original,
    ContainerRegistrationKeys: {
      ...original.ContainerRegistrationKeys,
      QUERY: "query" as const,
    },
  }
})

interface GraphResult {
  data: unknown[]
}

type Graph = (query: unknown) => Promise<GraphResult>

const assertAuthenticatedRequest: (
  candidate: unknown,
) => asserts candidate is AuthenticatedMedusaRequest = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock request object")
  }

  if (!("auth_context" in candidate) || !("scope" in candidate)) {
    throw new TypeError("Mock request is missing required properties")
  }
}

interface ResponseMethods {
  json: (...args: unknown[]) => unknown
  status: (...args: unknown[]) => unknown
}

const assertMedusaResponse: <T extends ResponseMethods>(
  candidate: T,
) => asserts candidate is T & MedusaResponse = (candidate) => {
  if (
    typeof candidate.json !== "function" ||
    typeof candidate.status !== "function"
  ) {
    throw new TypeError("Mock response requires json and status functions")
  }
}

const createResponse = () => {
  const response = {
    json: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
    status: vi.fn<(...args: unknown[]) => unknown>().mockReturnThis(),
  }

  assertMedusaResponse(response)
  return response
}

const createRequest = ({
  customerId = "cus_1",
  graph,
  params = {},
}: {
  customerId?: string
  graph: Graph
  params?: Record<string, string>
}) => {
  const request: unknown = {
    auth_context: {
      app_metadata: {
        customer_id: customerId,
      },
    },
    params,
    scope: {
      resolve: vi.fn<(key: string) => { graph: Graph }>((key) => {
        if (key === "query") {
          return { graph }
        }

        throw new Error(`Unexpected dependency: ${key}`)
      }),
    },
  }

  assertAuthenticatedRequest(request)
  return request
}

const createNext = () => vi.fn<() => void>(() => {})

describe("ensureRole", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows the current company's admin employee", async () => {
    const { ensureRole } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          employees: [
            {
              customer: { id: "cus_1" },
              is_admin: true,
            },
          ],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = createNext()

    await ensureRole("company_admin")(req, res, next)

    expect(graph).toHaveBeenCalledWith({
      entity: "companies",
      fields: [
        "id",
        "employees.id",
        "employees.is_admin",
        "employees.customer.id",
      ],
      filters: { id: "comp_1" },
    })
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("rejects a customer that is not an admin employee of the route company", async () => {
    const { ensureRole } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          employees: [
            {
              customer: { id: "cus_2" },
              is_admin: true,
            },
          ],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = createNext()

    await ensureRole("company_admin")(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("rejects empty route companies instead of treating them as implicitly admin-manageable", async () => {
    const { ensureRole } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          employees: [],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = createNext()

    await ensureRole("company_admin")(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("allows route company members for member-scoped store reads", async () => {
    const { ensureCompanyMember } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          employees: [
            {
              customer: { id: "cus_1" },
              is_admin: false,
            },
          ],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = createNext()

    await ensureCompanyMember(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("rejects non-members for route company member-scoped store reads", async () => {
    const { ensureCompanyMember } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [
        {
          employees: [
            {
              customer: { id: "cus_2" },
              is_admin: true,
            },
          ],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = createNext()

    await ensureCompanyMember(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("uses current customer employee admin state when no company id is in the route", async () => {
    const { ensureRole } =
      await import("../../../../../src/api/middlewares/ensure-role")
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ employee: { is_admin: true } }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = createNext()

    await ensureRole("company_admin")(req, res, next)

    expect(graph).toHaveBeenCalledWith({
      entity: "customer",
      fields: ["employee.is_admin"],
      filters: { id: "cus_1" },
    })
    expect(next).toHaveBeenCalledOnce()
  })
})
