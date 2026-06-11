import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@medusajs/framework/utils", () => ({
  ContainerRegistrationKeys: {
    QUERY: "query",
  },
}))

const createResponse = () =>
  ({
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  }) as any

const createRequest = ({
  customerId = "cus_1",
  graph,
  params = {},
}: {
  customerId?: string
  graph: ReturnType<typeof vi.fn>
  params?: Record<string, string>
}) =>
  ({
    auth_context: {
      app_metadata: {
        customer_id: customerId,
      },
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

describe("ensureRole", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("allows the current company's admin employee", async () => {
    const { ensureRole } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
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
    const next = vi.fn()

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
    const { ensureRole } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
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
    const next = vi.fn()

    await ensureRole("company_admin")(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("rejects empty route companies instead of treating them as implicitly admin-manageable", async () => {
    const { ensureRole } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [
        {
          employees: [],
          id: "comp_1",
        },
      ],
    })
    const req = createRequest({ graph, params: { id: "comp_1" } })
    const res = createResponse()
    const next = vi.fn()

    await ensureRole("company_admin")(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("allows route company members for member-scoped store reads", async () => {
    const { ensureCompanyMember } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
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
    const next = vi.fn()

    await ensureCompanyMember(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("rejects non-members for route company member-scoped store reads", async () => {
    const { ensureCompanyMember } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
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
    const next = vi.fn()

    await ensureCompanyMember(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })

  it("uses current customer employee admin state when no company id is in the route", async () => {
    const { ensureRole } = await import(
      "../../../../../src/api/middlewares/ensure-role"
    )
    const graph = vi.fn().mockResolvedValue({
      data: [{ employee: { is_admin: true } }],
    })
    const req = createRequest({ graph })
    const res = createResponse()
    const next = vi.fn()

    await ensureRole("company_admin")(req, res, next)

    expect(graph).toHaveBeenCalledWith({
      entity: "customer",
      fields: ["employee.is_admin"],
      filters: { id: "cus_1" },
    })
    expect(next).toHaveBeenCalledOnce()
  })
})
