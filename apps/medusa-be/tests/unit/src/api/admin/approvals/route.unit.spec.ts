import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AdminGetApprovalsType } from "../../../../../../src/api/admin/approvals/validators"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
}))

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge Node
 * request/response interfaces while still validating the shape the route
 * handler actually reads from at runtime.
 */
function assertMockShape<T>(
  candidate: unknown,
  requiredKeys: readonly string[]
): asserts candidate is T {
  if (typeof candidate !== "object" || candidate === null) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${key}`)
    }
  }
}

type MockJsonResponse = MedusaResponse & { json: ReturnType<typeof vi.fn> }

const createMockResponse = (): MockJsonResponse => {
  const candidate: unknown = { json: vi.fn().mockReturnThis() }
  assertMockShape<MockJsonResponse>(candidate, ["json"])
  return candidate
}

const createMockRequest = (
  graph: ReturnType<typeof vi.fn>,
  validatedQuery: Record<string, unknown> = {}
): AuthenticatedMedusaRequest<AdminGetApprovalsType> => {
  const candidate: unknown = {
    queryConfig: {},
    scope: {
      resolve: vi.fn(() => ({ graph })),
    },
    validatedQuery,
  }
  assertMockShape<AuthenticatedMedusaRequest<AdminGetApprovalsType>>(
    candidate,
    ["queryConfig", "scope", "validatedQuery"]
  )
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
      id: "appr_1",
      cart_id: "cart_1",
      created_by: "user_1",
      handled_by: null,
      status: "pending",
      type: "sales_manager",
    }
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          cart: {
            id: "cart_1",
            approval_status: {
              id: "apprstat_1",
              cart_id: "cart_1",
              status: "pending",
            },
            approvals: [approval],
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

    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "approval_status",
        fields: expect.arrayContaining(["cart.approvals.*"]),
        filters: {
          status: "pending",
        },
      })
    )
    expect(res.json).toHaveBeenCalledWith({
      carts_with_approvals: [
        {
          id: "cart_1",
          approval_status: {
            id: "apprstat_1",
            cart_id: "cart_1",
            status: "pending",
          },
          approval_requests: [approval],
        },
      ],
      count: 1,
      skip: 0,
      take: 20,
    })
  })
})
