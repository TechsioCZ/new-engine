import { companiesCheckRoutesMiddlewares } from "../middlewares"
import { VatIdentificationNumberSchema } from "../validators"
import { AdminCompaniesCheckCzAddressCountSchema } from "../../../admin/companies/check/cz/address-count/validators"
import { AdminCompaniesCheckCzTaxReliabilitySchema } from "../../../admin/companies/check/cz/tax-reliability/validators"
import { StoreCompaniesCheckCzInfoSchema } from "../../../store/companies/check/cz/info/validators"
import { StoreCompaniesCheckViesSchema } from "../../../store/companies/check/vies/validators"

describe("company-check validators", () => {
  it("validates VAT identification numbers", () => {
    expect(VatIdentificationNumberSchema.safeParse("CZ12345678").success).toBe(
      true
    )
    expect(VatIdentificationNumberSchema.safeParse("C").success).toBe(false)
  })

  it("requires exactly one filter in store CZ info schema", () => {
    expect(
      StoreCompaniesCheckCzInfoSchema.safeParse({
        vat_identification_number: "CZ12345678",
      }).success
    ).toBe(true)

    expect(
      StoreCompaniesCheckCzInfoSchema.safeParse({
        vat_identification_number: "CZ12345678",
        company_name: "ACME",
      }).success
    ).toBe(false)

    expect(StoreCompaniesCheckCzInfoSchema.safeParse({}).success).toBe(false)
  })

  it("validates store VIES schema", () => {
    expect(
      StoreCompaniesCheckViesSchema.safeParse({
        vat_identification_number: "CZ12345678",
      }).success
    ).toBe(true)
    expect(StoreCompaniesCheckViesSchema.safeParse({}).success).toBe(false)
  })

  it("validates admin schemas", () => {
    expect(
      AdminCompaniesCheckCzTaxReliabilitySchema.safeParse({
        vat_identification_number: "CZ12345678",
      }).success
    ).toBe(true)
    expect(
      AdminCompaniesCheckCzAddressCountSchema.safeParse({
        street: "Main 10",
        city: "Prague",
      }).success
    ).toBe(true)
    expect(
      AdminCompaniesCheckCzAddressCountSchema.safeParse({
        street: "",
        city: "Prague",
      }).success
    ).toBe(false)
  })
})

describe("companiesCheckRoutesMiddlewares", () => {
  const originalEnv = process.env

  afterAll(() => {
    process.env = originalEnv
  })

  it("registers all company-check routes", () => {
    expect(companiesCheckRoutesMiddlewares).toHaveLength(6)
    expect(companiesCheckRoutesMiddlewares.map((route) => route.matcher)).toEqual(
      [
        "/admin/companies/check/cz/info",
        "/store/companies/check/cz/info",
        "/admin/companies/check/vies",
        "/store/companies/check/vies",
        "/admin/companies/check/cz/tax-reliability",
        "/admin/companies/check/cz/address-count",
      ]
    )
  })

  it("returns 503 when feature flag is disabled", () => {
    process.env = { ...originalEnv, FEATURE_COMPANY_ENABLED: "0" }
    const requireFeatureMiddleware = companiesCheckRoutesMiddlewares[0]
      ?.middlewares?.[0] as (
      req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } },
      next: () => void
    ) => void

    const json = jest.fn()
    const status = jest.fn().mockReturnValue({ json })
    const next = jest.fn()

    requireFeatureMiddleware({} as never, { status } as never, next)

    expect(status).toHaveBeenCalledWith(503)
    expect(json).toHaveBeenCalledWith({
      error: "Company check service is not enabled",
    })
    expect(next).not.toHaveBeenCalled()
  })

  it("calls next when feature flag is enabled", () => {
    process.env = { ...originalEnv, FEATURE_COMPANY_ENABLED: "1" }
    const requireFeatureMiddleware = companiesCheckRoutesMiddlewares[0]
      ?.middlewares?.[0] as (
      req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } },
      next: () => void
    ) => void

    const status = jest.fn().mockReturnValue({ json: jest.fn() })
    const next = jest.fn()

    requireFeatureMiddleware({} as never, { status } as never, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(status).not.toHaveBeenCalled()
  })
})
