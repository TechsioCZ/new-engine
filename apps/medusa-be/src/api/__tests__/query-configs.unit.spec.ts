import {
  approvalFields as adminApprovalFields,
  approvalTransformQueryConfig as adminApprovalTransformQueryConfig,
} from "../admin/approvals/query-config"
import {
  adminApprovalSettingsFields,
  adminApprovalSettingsQueryConfig,
  adminCompanyFields,
  adminCompanyQueryConfig,
  adminEmployeeFields,
  adminEmployeeQueryConfig,
} from "../admin/companies/query-config"
import {
  approvalFields as storeApprovalFields,
  approvalTransformQueryConfig as storeApprovalTransformQueryConfig,
} from "../store/approvals/query-config"
import {
  cartFields,
  retrieveCartTransformQueryConfig,
} from "../store/carts/query-config"
import {
  storeApprovalSettingsFields,
  storeApprovalSettingsQueryConfig,
  storeCompanyFields,
  storeCompanyQueryConfig,
  storeEmployeeFields,
  storeEmployeeQueryConfig,
} from "../store/companies/query-config"

describe("api query config files", () => {
  it("defines admin approval query config defaults", () => {
    expect(adminApprovalFields.length).toBeGreaterThan(0)
    expect(adminApprovalTransformQueryConfig).toEqual({
      defaults: adminApprovalFields,
      isList: true,
    })
  })

  it("defines admin company/employee/approval-settings query configs", () => {
    expect(adminCompanyFields.length).toBeGreaterThan(0)
    expect(adminEmployeeFields.length).toBeGreaterThan(0)
    expect(adminApprovalSettingsFields.length).toBeGreaterThan(0)

    expect(adminCompanyQueryConfig.list.isList).toBe(true)
    expect(adminCompanyQueryConfig.retrieve.isList).toBe(false)
    expect(adminEmployeeQueryConfig.list.isList).toBe(true)
    expect(adminEmployeeQueryConfig.retrieve.isList).toBe(false)
    expect(adminApprovalSettingsQueryConfig.list.isList).toBe(true)
    expect(adminApprovalSettingsQueryConfig.retrieve.isList).toBe(false)
  })

  it("defines store approval and cart query configs", () => {
    expect(storeApprovalFields.length).toBeGreaterThan(0)
    expect(storeApprovalTransformQueryConfig).toEqual({
      defaults: storeApprovalFields,
      isList: true,
    })

    expect(cartFields.length).toBeGreaterThan(0)
    expect(retrieveCartTransformQueryConfig).toEqual({
      defaults: cartFields,
      isList: false,
    })
  })

  it("defines store company/employee/approval-settings query configs", () => {
    expect(storeCompanyFields.length).toBeGreaterThan(0)
    expect(storeEmployeeFields.length).toBeGreaterThan(0)
    expect(storeApprovalSettingsFields.length).toBeGreaterThan(0)

    expect(storeCompanyQueryConfig.list.isList).toBe(true)
    expect(storeCompanyQueryConfig.retrieve.isList).toBe(false)
    expect(storeEmployeeQueryConfig.list.isList).toBe(true)
    expect(storeEmployeeQueryConfig.retrieve.isList).toBe(false)
    expect(storeApprovalSettingsQueryConfig.retrieve.isList).toBe(false)
  })
})
