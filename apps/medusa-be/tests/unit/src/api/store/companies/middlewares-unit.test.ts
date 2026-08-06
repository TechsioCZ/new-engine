import type { MiddlewareRoute, MiddlewareVerb } from "@medusajs/framework"
import { describe, expect, it } from "vitest"

const supportsMethod = (route: MiddlewareRoute, method: MiddlewareVerb) =>
  route.methods?.includes(method) ?? false

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
      expect(route?.methods).toStrictEqual(["GET"])
      expect(route?.middlewares?.[0]).toBe(ensureCompanyMember)
    }
  })

  it("requires company admin authorization for the employee delete route", async () => {
    const { ensureCompanyAdmin, storeCompaniesMiddlewares } =
      await import("../../../../../../src/api/store/companies/middlewares")

    const deleteEmployeeRoute = storeCompaniesMiddlewares.find(
      (route) =>
        supportsMethod(route, "DELETE") &&
        route.matcher === "/store/companies/:id/employees/:employee_id",
    )

    expect(deleteEmployeeRoute).toStrictEqual({
      matcher: "/store/companies/:id/employees/:employee_id",
      methods: ["DELETE"],
      middlewares: [ensureCompanyAdmin],
    })
  })
})
