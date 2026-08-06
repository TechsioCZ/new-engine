import { ContainerRegistrationKeys } from "@medusajs/utils"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { GET } from "../../../../../../src/api/store/approvals/route"

type GetRequest = Parameters<typeof GET>[0]
type GetResponse = Parameters<typeof GET>[1]
type Graph = (input: unknown) => Promise<unknown>

const isGetRequest = (candidate: unknown): candidate is GetRequest => {
  if (!isRecord(candidate)) {
    return false
  }
  const { auth_context: authContext, scope } = candidate
  if (!isRecord(authContext) || !isRecord(authContext["app_metadata"])) {
    return false
  }
  if (authContext["app_metadata"]["customer_id"] !== "cus_1") {
    return false
  }

  return isRecord(scope) && typeof scope["resolve"] === "function"
}

const createMockRequest = ({
  graph,
  validatedQuery = {},
}: {
  graph: ReturnType<typeof vi.fn<Graph>>
  validatedQuery?: Record<string, unknown>
}): GetRequest => {
  const candidate: unknown = {
    auth_context: {
      app_metadata: {
        customer_id: "cus_1",
      },
    },
    queryConfig: {},
    scope: {
      resolve: vi.fn<(key: string) => unknown>((key) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }

        throw new Error(`Unexpected container key: ${key}`)
      }),
    },
    validatedQuery,
  }
  if (!isGetRequest(candidate)) {
    throw new TypeError("Invalid mocked approvals request")
  }

  return candidate
}

const isGetResponse = (candidate: unknown): candidate is GetResponse =>
  isRecord(candidate) && typeof candidate["json"] === "function"

const createMockResponse = (): GetResponse => {
  const candidate: unknown = {
    json: vi.fn<(body: unknown) => void>(),
  }
  if (!isGetResponse(candidate)) {
    throw new TypeError("Invalid mocked approvals response")
  }

  return candidate
}

describe("GET /store/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the standard empty carts_with_approvals contract when the customer has no company", async () => {
    const graph = vi.fn<Graph>().mockResolvedValue({
      data: [{ employee: null, id: "cus_1" }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith({
      carts_with_approvals: [],
      count: 0,
    })
    expect(graph).toHaveBeenCalledExactlyOnceWith({
      entity: "customer",
      fields: ["employee.company.id"],
      filters: { id: "cus_1" },
    })
  })
})
