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
  graph: ReturnType<typeof vi.fn>,
  validatedQuery: Record<string, unknown> = {}
) => ({
  queryConfig: {},
  scope: {
    resolve: vi.fn(() => ({ graph })),
  },
  validatedQuery,
})

describe("GET /admin/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes graph cart approvals to approval_requests", async () => {
    const { GET } = await import(
      "../../../../../../src/api/admin/approvals/route"
    )
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
