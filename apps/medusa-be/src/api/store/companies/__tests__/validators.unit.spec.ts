import { StoreCreateCompany, StoreUpdateCompany } from "../validators"

describe("store company validators", () => {
  it("accepts valid company and VAT identification numbers", () => {
    const result = StoreCreateCompany.safeParse({
      name: "Acme",
      email: "info@acme.test",
      currency_code: "czk",
      company_identification_number: "12345678",
      vat_identification_number: "CZ12345678",
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid company and VAT identification numbers", () => {
    const invalidIcoResult = StoreCreateCompany.safeParse({
      name: "Acme",
      email: "info@acme.test",
      currency_code: "czk",
      company_identification_number: "123",
    })

    const invalidVatResult = StoreCreateCompany.safeParse({
      name: "Acme",
      email: "info@acme.test",
      currency_code: "czk",
      vat_identification_number: "bad",
    })

    expect(invalidIcoResult.success).toBe(false)
    expect(invalidVatResult.success).toBe(false)
  })

  it("allows clearing identification fields in update payload", () => {
    const result = StoreUpdateCompany.safeParse({
      company_identification_number: null,
      vat_identification_number: null,
    })

    expect(result.success).toBe(true)
  })
})
