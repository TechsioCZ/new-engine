import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureRole } from "../ensure-role"

describe("ensureRole middleware", () => {
  const createContext = () => {
    const graph = jest.fn()
    const req = {
      params: { id: "comp_1" },
      auth_context: { auth_identity_id: "auth_1" },
      scope: {
        resolve: (key: unknown) => {
          if (key === ContainerRegistrationKeys.QUERY) {
            return { graph }
          }
          throw new Error(`Unexpected key: ${String(key)}`)
        },
      },
    } as any
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any
    const next = jest.fn()

    return { req, res, next, graph }
  }

  it("allows request when company has no employees", async () => {
    const { req, res, next, graph } = createContext()
    graph.mockResolvedValueOnce({
      data: [{ employees: [] }],
    })

    await ensureRole("company_admin")(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("allows request when provider identity role matches required role", async () => {
    const { req, res, next, graph } = createContext()
    graph
      .mockResolvedValueOnce({
        data: [{ employees: [{ id: "empl_1" }] }],
      })
      .mockResolvedValueOnce({
        data: [{ user_metadata: { role: "company_admin" } }],
      })

    await ensureRole("company_admin")(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("returns 403 when provider identity role does not match", async () => {
    const { req, res, next, graph } = createContext()
    graph
      .mockResolvedValueOnce({
        data: [{ employees: [{ id: "empl_1" }] }],
      })
      .mockResolvedValueOnce({
        data: [{ user_metadata: { role: "employee" } }],
      })

    await ensureRole("company_admin")(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" })
  })
})
