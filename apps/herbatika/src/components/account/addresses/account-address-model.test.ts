import { describe, expect, it } from "vitest"
import {
  type CustomerAddress,
  createEmptyAccountAddressValues,
  resolveAddressCountryCode,
  toAccountAddressFormValues,
  toCustomerAddressCreateInput,
  toCustomerAddressUpdateInput,
} from "./account-address-model"

const SAVED_ADDRESS: CustomerAddress = {
  id: "addr_1",
  first_name: " Ana ",
  last_name: " Popescu ",
  company: " Herbatica RO ",
  address_1: " Strada Florilor 10 ",
  city: " București ",
  postal_code: " 010101 ",
  country_code: "RO",
  phone: "+40722111222",
  is_default_shipping: true,
  is_default_billing: false,
}

describe("account address model", () => {
  it("hydrates an existing address and preserves its supported market", () => {
    expect(toAccountAddressFormValues(SAVED_ADDRESS, "sk")).toEqual({
      first_name: " Ana ",
      last_name: " Popescu ",
      company: " Herbatica RO ",
      address_1: " Strada Florilor 10 ",
      city: " București ",
      postal_code: " 010101 ",
      country_code: "ro",
      phone: "+40722111222",
      is_default_shipping: true,
      is_default_billing: false,
    })
  })

  it("falls back to the active market for unsupported or absent countries", () => {
    expect(resolveAddressCountryCode("DE", "cz")).toBe("cz")
    expect(resolveAddressCountryCode(null, "hu")).toBe("hu")
    expect(createEmptyAccountAddressValues("ro").country_code).toBe("ro")
  })

  it("trims submitted values and omits blank optional values", () => {
    const values = {
      ...createEmptyAccountAddressValues("ro"),
      first_name: " Ana ",
      last_name: " Popescu ",
      address_1: " Strada Florilor 10 ",
      city: " București ",
      postal_code: " 010101 ",
      company: "  ",
      is_default_shipping: true,
    }

    expect(toCustomerAddressCreateInput(values, undefined)).toEqual({
      first_name: "Ana",
      last_name: "Popescu",
      company: undefined,
      address_1: "Strada Florilor 10",
      city: "București",
      postal_code: "010101",
      country_code: "ro",
      phone: undefined,
      is_default_shipping: true,
      is_default_billing: false,
    })
  })

  it("adds only the required address id to an update payload", () => {
    const values = {
      ...createEmptyAccountAddressValues("sk"),
      first_name: "Ján",
      last_name: "Novák",
      address_1: "Hlavná 1",
      city: "Bratislava",
      postal_code: "811 01",
      phone: "+421900111222",
    }

    expect(
      toCustomerAddressUpdateInput("addr_2", values, values.phone)
    ).toEqual({
      addressId: "addr_2",
      first_name: "Ján",
      last_name: "Novák",
      company: undefined,
      address_1: "Hlavná 1",
      city: "Bratislava",
      postal_code: "811 01",
      country_code: "sk",
      phone: "+421900111222",
      is_default_shipping: false,
      is_default_billing: false,
    })
  })
})
