import type { MiddlewareRoute } from "@medusajs/framework"
import { describe, expect, it } from "vitest"

const supportsMethod = (route: MiddlewareRoute, method: string) => {
  const configuredMethods: unknown = Reflect.get(route, "method")
  return (
    configuredMethods === "ALL" ||
    (Array.isArray(configuredMethods) && configuredMethods.includes(method))
  )
}

describe("store company middlewares", () => {
  it("requires route company membership for company and employee read routes", async () => {
    const { ensureCompanyMember } =
      await import("../../../../../../src/api/middlewares/ensure-role")
    const { storeCompaniesMiddlewares } =
      await import("../../../../../../src/api/store/companies/middlewares")

    const memberScopedRoutes = [
      "/store/companies/:id",
      "/store/companies/:id/employees",
      "/store/companies/:id/employees/:employee_id",
    ]

    for (const matcher of memberScopedRoutes) {
      const route = storeCompaniesMiddlewares.find(
        (middlewareRoute) =>
          supportsMethod(middlewareRoute, "GET") &&
          middlewareRoute.matcher === matcher,
      )

      expect(route).toBeDefined()
      expect(route?.middlewares).toContain(ensureCompanyMember)
    }
  })

  it("requires company admin authorization for employee delete routes", async () => {
    const { storeCompaniesMiddlewares } =
      await import("../../../../../../src/api/store/companies/middlewares")

    const deleteEmployeeRoute = storeCompaniesMiddlewares.find(
      (route) =>
        supportsMethod(route, "DELETE") &&
        route.matcher === "/store/companies/:id/employees/:employee_id",
    )

    expect(deleteEmployeeRoute).toBeDefined()
    expect(deleteEmployeeRoute?.middlewares).toHaveLength(1)
    expect(deleteEmployeeRoute?.middlewares?.[0]).toBeTypeOf("function")
  })
})
