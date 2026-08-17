import { beforeEach, describe, expect, it, vi } from "vitest"

const createRequest = (
  customer: {
    deleted_at?: string | null
    has_account?: boolean | null
    id: string
  } | null
) => {
  const graph = vi.fn().mockResolvedValue({
    data: customer ? [customer] : [],
  })

  return {
    graph,
    request: {
      auth_context: {
        actor_id: "cus_1",
      },
      scope: {
        resolve: vi.fn(() => ({ graph })),
      },
    } as any,
  }
}

const createResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

describe("store customer middlewares", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows an authenticated customer with an active account", async () => {
    const { ensureActiveCustomerAccount } = await import(
      "../../../../../../src/api/store/customers/middlewares"
    )
    const { graph, request } = createRequest({
      deleted_at: null,
      has_account: true,
      id: "cus_1",
    })
    const response = createResponse()
    const next = vi.fn()

    await ensureActiveCustomerAccount(request, response, next)

    expect(graph).toHaveBeenCalledWith({
      entity: "customer",
      fields: ["id", "has_account", "deleted_at"],
      filters: { id: "cus_1" },
      withDeleted: true,
    })
    expect(next).toHaveBeenCalledOnce()
    expect(response.status).not.toHaveBeenCalled()
  })

  it.each([
    {
      customer: {
        deleted_at: null,
        has_account: false,
        id: "cus_1",
      },
      scenario: "inactive",
    },
    {
      customer: {
        deleted_at: "2026-08-16T10:00:00.000Z",
        has_account: true,
        id: "cus_1",
      },
      scenario: "soft-deleted",
    },
    {
      customer: null,
      scenario: "missing",
    },
  ])("rejects a $scenario customer account", async ({ customer }) => {
    const { ensureActiveCustomerAccount } = await import(
      "../../../../../../src/api/store/customers/middlewares"
    )
    const { request } = createRequest(customer)
    const response = createResponse()
    const next = vi.fn()

    await ensureActiveCustomerAccount(request, response, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({ message: "Unauthorized" })
  })

  it("checks account state on all customer profile routes", async () => {
    const { ensureActiveCustomerAccount, storeCustomersMiddlewares } =
      await import("../../../../../../src/api/store/customers/middlewares")

    const customerProfileRoute = storeCustomersMiddlewares.find(
      (route) =>
        route.method === "ALL" && route.matcher === "/store/customers/me*"
    )

    expect(customerProfileRoute).toBeDefined()
    expect(customerProfileRoute?.middlewares).toContain(
      ensureActiveCustomerAccount
    )
  })
})
