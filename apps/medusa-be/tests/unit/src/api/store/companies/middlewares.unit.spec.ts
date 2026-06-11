import { describe, expect, it } from "vitest"

describe("store company middlewares", () => {
  it("requires route company membership for company and employee read routes", async () => {
    const { ensureCompanyMember } = await import(
      "../../../../../../src/api/middlewares/ensure-role"
    )
    const { storeCompaniesMiddlewares } = await import(
      "../../../../../../src/api/store/companies/middlewares"
    )

    const memberScopedRoutes = [
      "/store/companies/:id",
      "/store/companies/:id/employees",
      "/store/companies/:id/employees/:employee_id",
    ]

    for (const matcher of memberScopedRoutes) {
      const route = storeCompaniesMiddlewares.find(
        (middlewareRoute) =>
          middlewareRoute.method?.includes("GET") &&
          middlewareRoute.matcher === matcher
      )

      expect(route).toBeDefined()
      expect(route?.middlewares).toContain(ensureCompanyMember)
    }
  })

  it("requires company admin authorization for employee delete routes", async () => {
    const { storeCompaniesMiddlewares } = await import(
      "../../../../../../src/api/store/companies/middlewares"
    )

    const deleteEmployeeRoute = storeCompaniesMiddlewares.find(
      (route) =>
        route.method?.includes("DELETE") &&
        route.matcher === "/store/companies/:id/employees/:employee_id"
    )

    expect(deleteEmployeeRoute).toBeDefined()
    expect(deleteEmployeeRoute?.middlewares).toHaveLength(1)
    expect(deleteEmployeeRoute?.middlewares[0]).toBeTypeOf("function")
  })
})
