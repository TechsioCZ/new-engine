import { describe, expect, it } from "vitest"

describe("store company middlewares", () => {
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
