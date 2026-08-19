import { describe, expect, it } from "vitest"
import { buildCustomerProfile } from "./register-flow"
import { parseWholesaleRegistration } from "./wholesale"

const wholesaleInput = {
  company_name: "Example Company",
  company_identifier: "12345678",
  currency_code: "USD",
  billing_address: {
    address_1: "Main Street 1",
    city: "Bratislava",
    postal_code: "81101",
    country_code: "SK",
  },
}

describe("registration market context", () => {
  it("uses the server currency instead of the client wholesale currency", () => {
    const parsed = parseWholesaleRegistration(wholesaleInput, {
      currencyCode: "EUR",
    })

    expect(parsed.error).toBeNull()
    expect(parsed.value?.currencyCode).toBe("EUR")
  })

  it("persists canonical market context through customer metadata", () => {
    const parsed = parseWholesaleRegistration(wholesaleInput, {
      currencyCode: "EUR",
    })

    expect(parsed.value).not.toBeNull()

    const customer = buildCustomerProfile({
      email: "customer@example.com",
      firstName: "Example",
      lastName: "Customer",
      marketContext: {
        marketCode: "sk",
        regionId: "reg_sk",
        salesChannelId: "sc_sk",
        storefrontNamespace: "herbatica",
      },
      wholesale: parsed.value,
    })

    expect(customer.metadata).toMatchObject({
      storefront_shop_namespace: "herbatica",
      storefront_market_code: "sk",
      storefront_region_id: "reg_sk",
      storefront_sales_channel_id: "sc_sk",
    })
  })
})
