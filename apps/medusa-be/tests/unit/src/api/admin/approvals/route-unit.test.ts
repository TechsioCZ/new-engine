import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { isRecord } from "@techsio/std/object"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AdminGetApprovalsType } from "../../../../../../src/api/admin/approvals/validators"

const { overrideModule } = vi.hoisted(() => ({
  overrideModule: <Module extends object>(
    original: Module,
    replacements: Record<PropertyKey, unknown>,
  ): Module =>
    Object.defineProperties(
      { ...original },
      Object.getOwnPropertyDescriptors(replacements),
    ),
}))

vi.mock(import("@medusajs/framework/utils"), async (importOriginal) =>
  overrideModule(await importOriginal(), {
    ContainerRegistrationKeys: {
      QUERY: "query",
    },
  }),
)

type JsonMock = ReturnType<typeof vi.fn<(body: unknown) => unknown>>
type GraphMock = ReturnType<typeof vi.fn<(input: unknown) => Promise<unknown>>>
type MockJsonResponse = MedusaResponse & { json: JsonMock }

const assertMockJsonResponse: (
  candidate: unknown,
) => asserts candidate is MockJsonResponse = (candidate) => {
  if (!isRecord(candidate) || typeof candidate["json"] !== "function") {
    throw new TypeError("Expected a mock response with a json method")
  }
}

const assertMockRequest: (
  candidate: unknown,
) => asserts candidate is AuthenticatedMedusaRequest<AdminGetApprovalsType> = (
  candidate,
) => {
  if (
    !isRecord(candidate) ||
    !isRecord(candidate["queryConfig"]) ||
    !isRecord(candidate["scope"])
  ) {
    throw new TypeError("Expected a route request mock")
  }
  if (
    typeof candidate["scope"]["resolve"] !== "function" ||
    !isRecord(candidate["validatedQuery"])
  ) {
    throw new TypeError("Expected a route request mock")
  }
}

const createMockResponse = (): MockJsonResponse => {
  const candidate: unknown = {
    json: vi.fn<(body: unknown) => unknown>().mockReturnThis(),
  }
  assertMockJsonResponse(candidate)
  return candidate
}

const createMockRequest = (
  graph: GraphMock,
  validatedQuery: Record<string, unknown> = {},
): AuthenticatedMedusaRequest<AdminGetApprovalsType> => {
  const candidate: unknown = {
    queryConfig: {},
    scope: {
      resolve: vi.fn<(key: string) => { graph: GraphMock }>(() => ({ graph })),
    },
    validatedQuery,
  }
  assertMockRequest(candidate)
  return candidate
}

describe("GET /admin/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes graph cart approvals to approval_requests", async () => {
    const { GET } =
      await import("../../../../../../src/api/admin/approvals/route")
    const approval = {
      cart_id: "cart_1",
      created_by: "user_1",
      handled_by: null,
      id: "appr_1",
      status: "pending",
      type: "sales_manager",
    }
    const graph = vi.fn<(input: unknown) => Promise<unknown>>()
    graph.mockResolvedValue({
      data: [
        {
          cart: {
            approval_status: {
              cart_id: "cart_1",
              id: "apprstat_1",
              status: "pending",
            },
            approvals: [approval],
            id: "cart_1",
          },
        },
        {
          cart: null,
        },
      ],
      metadata: {
        count: 1,
        skip: 0,
        take: 20,
      },
    })
    const req = createMockRequest(graph, { status: "pending" })
    const res = createMockResponse()

    await GET(req, res)

    const graphInput = graph.mock.calls[0]?.[0]
    expect(isRecord(graphInput)).toBeTruthy()
    if (!isRecord(graphInput)) {
      throw new TypeError("Expected graph input")
    }
    expect(graphInput["entity"]).toBe("approval_status")
    expect(graphInput["fields"]).toStrictEqual(
      expect.arrayContaining(["cart.approvals.*"]),
    )
    expect(graphInput["filters"]).toStrictEqual({ status: "pending" })
    expect(res.json).toHaveBeenCalledWith({
      carts_with_approvals: [
        {
          approval_requests: [approval],
          approval_status: {
            cart_id: "cart_1",
            id: "apprstat_1",
            status: "pending",
          },
          id: "cart_1",
        },
      ],
      count: 1,
      skip: 0,
      take: 20,
    })
  })
})
