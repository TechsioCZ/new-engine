import { ContainerRegistrationKeys } from "@medusajs/utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

const createMockRequest = ({
  graph,
  validatedQuery = {},
}: {
  graph: ReturnType<typeof vi.fn>
  validatedQuery?: Record<string, unknown>
}) =>
  ({
    auth_context: {
      app_metadata: {
        customer_id: "cus_1",
      },
    },
    queryConfig: {},
    scope: {
      resolve: vi.fn((key: string) => {
        if (key === ContainerRegistrationKeys.QUERY) {
          return { graph }
        }
      }),
    },
    validatedQuery,
  }) as any

const createMockResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
  }) as any

describe("GET /store/approvals", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the standard empty carts_with_approvals contract when the customer has no company", async () => {
    const { GET } = await import(
      "../../../../../../src/api/store/approvals/route"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ id: "cus_1", employee: null }],
    })
    const req = createMockRequest({ graph })
    const res = createMockResponse()

    await GET(req, res)

    expect(res.json).toHaveBeenCalledWith({
      carts_with_approvals: [],
      count: 0,
    })
    expect(graph).toHaveBeenCalledTimes(1)
    expect(graph).toHaveBeenCalledWith({
      entity: "customer",
      fields: ["employee.company.id"],
      filters: { id: "cus_1" },
    })
  })
})
