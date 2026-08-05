import { describe, expect, it } from "vitest"

import {
  type CheckoutAddressInput,
  buildCheckoutCartAddressInput,
  createCheckoutCartAddressAdapter,
  createCheckoutCustomerAddressAdapter,
  getCheckoutAddressValidationIssues,
  mapCheckoutAddressToMedusaCartAddress,
  mapMedusaAddressToCheckoutAddress,
} from "../src/checkout/address"

describe("checkout address defaults", () => {
  it("returns validation issues for missing shipping, billing, and email", () => {
    const issues = getCheckoutAddressValidationIssues({
      billing: {
        firstName: "Jan",
      },
      email: "",
      shipping: {
        firstName: "Jan",
      },
      useSameAddress: false,
    })

    expect(issues).toStrictEqual([
      {
        code: "required",
        field: "lastName",
        message: "Missing shipping field: lastName",
        scope: "shipping",
      },
      {
        code: "required",
        field: "street",
        message: "Missing shipping field: street",
        scope: "shipping",
      },
      {
        code: "required",
        field: "city",
        message: "Missing shipping field: city",
        scope: "shipping",
      },
      {
        code: "required",
        field: "postalCode",
        message: "Missing shipping field: postalCode",
        scope: "shipping",
      },
      {
        code: "required",
        field: "country",
        message: "Missing shipping field: country",
        scope: "shipping",
      },
      {
        code: "required",
        field: "lastName",
        message: "Missing billing field: lastName",
        scope: "billing",
      },
      {
        code: "required",
        field: "street",
        message: "Missing billing field: street",
        scope: "billing",
      },
      {
        code: "required",
        field: "city",
        message: "Missing billing field: city",
        scope: "billing",
      },
      {
        code: "required",
        field: "postalCode",
        message: "Missing billing field: postalCode",
        scope: "billing",
      },
      {
        code: "required",
        field: "country",
        message: "Missing billing field: country",
        scope: "billing",
      },
      {
        code: "required",
        field: "email",
        message: "Missing checkout email",
        scope: "root",
      },
    ])
  })

  it("skips billing validation when same-address mode omits billing input", () => {
    const issues = getCheckoutAddressValidationIssues({
      billing: undefined as never,
      email: "jan@example.com",
      shipping: {
        city: "Prague",
        country: "CZ",
        firstName: "Jan",
        lastName: "Novak",
        postalCode: "11000",
        street: "Main 1",
      },
      useSameAddress: true,
    })

    expect(issues).toStrictEqual([])
  })

  it("maps checkout addresses to cart payloads with sane defaults", () => {
    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          city: " Prague ",
          company: " ACME ",
          country: " CZ ",
          firstName: " Jan ",
          lastName: " Novak ",
          phone: " +420123456789 ",
          postalCode: " 11000 ",
          province: " Prague ",
          street: " Main 1 ",
          street2: " Floor 2 ",
        },
        {
          countryCodeTransform: (countryCode) => ` ${countryCode} `,
        },
      ),
    ).toStrictEqual({
      address_1: "Main 1",
      address_2: "Floor 2",
      city: "Prague",
      company: "ACME",
      country_code: "cz",
      first_name: "Jan",
      last_name: "Novak",
      phone: "+420123456789",
      postal_code: "11000",
      province: "Prague",
    })

    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          city: "Prague",
          firstName: "Jan",
          lastName: "Novak",
          postalCode: "11000",
          street: "Main 1",
        },
        { defaultCountryCode: "CZ" },
      ),
    ).toMatchObject({
      country_code: "cz",
    })
  })

  it("omits blank and null optional fields from cart address payloads", () => {
    expect(
      mapCheckoutAddressToMedusaCartAddress({
        city: "Prague",
        country: "CZ",
        firstName: "Jan",
        lastName: "Novak",
        phone: null,
        postalCode: "11000",
        street: "Main 1",
        street2: "   ",
      }),
    ).toStrictEqual({
      address_1: "Main 1",
      city: "Prague",
      country_code: "cz",
      first_name: "Jan",
      last_name: "Novak",
      postal_code: "11000",
    })
  })

  it("builds cart address input for separate and same-address checkout flows", () => {
    expect(
      buildCheckoutCartAddressInput(
        {
          billing: {
            city: "Brno",
            country: "SK",
            firstName: "Bill",
            lastName: "Buyer",
            postalCode: "60200",
            street: "Billing 2",
          },
          email: " jan@example.com ",
          shipping: {
            city: "Prague",
            company: "ACME",
            country: "CZ",
            firstName: "Jan",
            lastName: "Novak",
            postalCode: "11000",
            street: "Main 1",
          },
          useSameAddress: false,
        },
        {
          defaultCountryCode: "CZ",
        },
      ),
    ).toStrictEqual({
      billingAddress: {
        address_1: "Billing 2",
        address_2: undefined,
        city: "Brno",
        company: undefined,
        country_code: "sk",
        first_name: "Bill",
        last_name: "Buyer",
        phone: undefined,
        postal_code: "60200",
        province: undefined,
      },
      email: "jan@example.com",
      shippingAddress: {
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        company: "ACME",
        country_code: "cz",
        first_name: "Jan",
        last_name: "Novak",
        phone: undefined,
        postal_code: "11000",
        province: undefined,
      },
      useSameAddress: false,
    })

    expect(
      buildCheckoutCartAddressInput({
        email: "jan@example.com",
        shipping: {
          city: "Prague",
          country: "CZ",
          firstName: "Jan",
          lastName: "Novak",
          postalCode: "11000",
          street: "Main 1",
        },
        useSameAddress: true,
      }),
    ).toStrictEqual({
      billingAddress: {
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        company: undefined,
        country_code: "cz",
        first_name: "Jan",
        last_name: "Novak",
        phone: undefined,
        postal_code: "11000",
        province: undefined,
      },
      email: "jan@example.com",
      shippingAddress: {
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        company: undefined,
        country_code: "cz",
        first_name: "Jan",
        last_name: "Novak",
        phone: undefined,
        postal_code: "11000",
        province: undefined,
      },
      useSameAddress: true,
    })
  })

  it("maps Medusa addresses back to the checkout shape", () => {
    expect(
      mapMedusaAddressToCheckoutAddress({
        address_1: " Main 1 ",
        address_2: " Floor 2 ",
        city: " Prague ",
        country_code: " cz ",
        first_name: " Jan ",
        is_default_shipping: true,
        last_name: " Novak ",
        metadata: { source: "test" },
        postal_code: " 11000 ",
      }),
    ).toStrictEqual({
      city: "Prague",
      company: undefined,
      country: "cz",
      firstName: "Jan",
      isDefaultBilling: undefined,
      isDefaultShipping: true,
      lastName: "Novak",
      metadata: { source: "test" },
      phone: undefined,
      postalCode: "11000",
      province: undefined,
      street: "Main 1",
      street2: "Floor 2",
    })
  })

  it("builds sane default cart and customer adapters", () => {
    const cartAdapter = createCheckoutCartAddressAdapter({
      defaultCountryCode: "CZ",
    })
    const customerAdapter = createCheckoutCustomerAddressAdapter({
      defaultCountryCode: "CZ",
    })

    expect(
      cartAdapter.validate?.(
        {
          firstName: "Jan",
        },
        {
          scope: "shipping",
        },
      ),
    ).toStrictEqual([
      {
        code: "required",
        field: "lastName",
        message: "Missing shipping field: lastName",
        scope: "shipping",
      },
      {
        code: "required",
        field: "street",
        message: "Missing shipping field: street",
        scope: "shipping",
      },
      {
        code: "required",
        field: "city",
        message: "Missing shipping field: city",
        scope: "shipping",
      },
      {
        code: "required",
        field: "postalCode",
        message: "Missing shipping field: postalCode",
        scope: "shipping",
      },
      {
        code: "required",
        field: "country",
        message: "Missing shipping field: country",
        scope: "shipping",
      },
    ])

    expect(
      cartAdapter.toPayload?.(
        {
          city: "Prague",
          country: "CZ",
          firstName: "Jan",
          lastName: "Novak",
          postalCode: "11000",
          street: "Main 1",
        },
        {
          scope: "shipping",
        },
      ),
    ).toStrictEqual({
      address_1: "Main 1",
      address_2: undefined,
      city: "Prague",
      company: undefined,
      country_code: "cz",
      first_name: "Jan",
      last_name: "Novak",
      phone: undefined,
      postal_code: "11000",
      province: undefined,
    })

    expect(
      customerAdapter.toCreateParams?.(
        {
          city: "Prague",
          country: "CZ",
          firstName: "Jan",
          isDefaultBilling: false,
          isDefaultShipping: true,
          lastName: "Novak",
          metadata: { source: "test" },
          postalCode: "11000",
          street: "Main 1",
          street2: "Floor 2",
        },
        {
          mode: "create",
        },
      ),
    ).toStrictEqual({
      address_1: "Main 1",
      address_2: "Floor 2",
      city: "Prague",
      company: undefined,
      country_code: "cz",
      first_name: "Jan",
      is_default_billing: false,
      is_default_shipping: true,
      last_name: "Novak",
      metadata: { source: "test" },
      phone: undefined,
      postal_code: "11000",
      province: undefined,
    })
  })

  it("preserves explicit clears in customer address patch payloads", () => {
    type CheckoutAddress = CheckoutAddressInput & {
      loyaltyCode?: string
    }

    const customerAdapter = createCheckoutCustomerAddressAdapter<
      CheckoutAddress,
      CheckoutAddress & { addressId?: string }
    >({
      defaultCountryCode: "CZ",
    })

    expect(
      customerAdapter.validateUpdate?.(
        {
          addressId: "addr_1",
          country: "   ",
        },
        {
          mode: "update",
        },
      ),
    ).toStrictEqual([
      {
        code: "required",
        field: "country",
        message: "Missing customer field: country",
        scope: "customer",
      },
    ])

    expect(
      customerAdapter.toUpdateParams?.(
        {
          addressId: "addr_1",
          company: "   ",
          country: " CZ ",
          isDefaultShipping: true,
          phone: " +420123456789 ",
          street2: null,
        },
        {
          mode: "update",
        },
      ),
    ).toStrictEqual({
      address_2: "",
      company: "",
      country_code: "cz",
      is_default_shipping: true,
      phone: "+420123456789",
    })
  })
})
