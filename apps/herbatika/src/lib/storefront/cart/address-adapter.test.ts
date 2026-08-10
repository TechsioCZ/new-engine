import { describe, expect, it } from "vitest"

import {
  herbatikaCheckoutCartAddressAdapter,
  mapHerbatikaAddressFormStateFromMedusaAddress,
} from "./address-adapter"

describe("Herbatika checkout address adapter", () => {
  it("preserves schema-owned JSON metadata and replaces address fields", () => {
    const { toPayload } = herbatikaCheckoutCartAddressAdapter
    if (toPayload === undefined) {
      throw new TypeError("Herbatika address payload adapter is incomplete")
    }

    const payload = toPayload(
      {
        companyId: "  12345678  ",
        customerNote: "  Leave at reception  ",
        metadata: {
          company_id: "stale",
          nested: { flags: [true, null, 3] },
          source: "saved-address",
          tax_id: "remove-me",
        },
        taxId: " ",
      },
      { scope: "shipping" },
    )

    expect(payload.metadata).toStrictEqual({
      company_id: "12345678",
      customer_note: "Leave at reception",
      nested: { flags: [true, null, 3] },
      source: "saved-address",
    })
  })

  it("decodes address metadata before hydrating form values", () => {
    expect(
      mapHerbatikaAddressFormStateFromMedusaAddress({
        address_1: "Main street",
        country_code: "cz",
        metadata: {
          company_id: "  12345678 ",
          customer_note: " Reception ",
        },
      }),
    ).toStrictEqual({
      address1: "Main street",
      companyId: "12345678",
      countryCode: "CZ",
      customerNote: "Reception",
    })
  })

  it("ignores malformed metadata from external addresses", () => {
    expect(
      mapHerbatikaAddressFormStateFromMedusaAddress({
        address_1: "Main street",
        metadata: { invalid: () => "not JSON" },
      }),
    ).toStrictEqual({ address1: "Main street" })
  })
})
