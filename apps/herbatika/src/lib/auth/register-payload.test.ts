import { describe, expect, it } from "vitest"
import { buildAuthRegisterInput } from "./register-payload"
import { REGISTRATION_TERMS_VERSION } from "./registration-policy"

describe("registration request payload", () => {
  it("carries explicit terms acceptance and the exact current version", () => {
    expect(
      buildAuthRegisterInput(
        {
          accept_terms: true,
          account_type: "retail",
          billing_address_1: "",
          billing_address_2: "",
          billing_city: "",
          billing_country_code: "",
          billing_postal_code: "",
          company_identifier: "",
          company_name: "",
          confirm_password: "password1",
          email: "customer@example.test",
          first_name: "Test",
          last_name: "Customer",
          password: "password1",
        },
        { currencyCode: "eur" }
      )
    ).toMatchObject({
      accept_terms: true,
      terms_version: REGISTRATION_TERMS_VERSION,
    })
  })
})
