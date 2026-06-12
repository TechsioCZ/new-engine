import { describe, expect, it } from "vitest"
import { adminCompanyQueryConfig } from "../../../../../../src/api/admin/companies/query-config"
import {
  adminCompanyDisplayFields,
  adminCompanyDisplayFieldsQuery,
} from "../../../../../../src/types/company/admin-fields"

describe("admin company query config", () => {
  it("uses the rich display field contract for list and retrieve defaults", () => {
    expect(adminCompanyDisplayFieldsQuery).toBe(
      adminCompanyDisplayFields.join(",")
    )

    expect(adminCompanyQueryConfig.list.defaults).toEqual(
      adminCompanyDisplayFields
    )
    expect(adminCompanyQueryConfig.retrieve.defaults).toEqual(
      adminCompanyDisplayFields
    )
  })

  it("includes relations required by the B2B admin company UI", () => {
    expect(adminCompanyDisplayFields).toEqual(
      expect.arrayContaining([
        "*employees",
        "*employees.customer",
        "*employees.company",
        "*customer_group",
        "*approval_settings",
        "deleted_at",
      ])
    )
  })
})
