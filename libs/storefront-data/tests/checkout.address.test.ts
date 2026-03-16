import {
  buildCheckoutCartAddressInput,
  createCheckoutCartAddressAdapter,
  createCheckoutCustomerAddressAdapter,
  getCheckoutAddressValidationIssues,
  mapCheckoutAddressToMedusaCartAddress,
  mapMedusaAddressToCheckoutAddress,
  type CheckoutAddressInput,
} from "../src/checkout/address"

describe("checkout address defaults", () => {
  it("returns validation issues for missing shipping, billing, and email", () => {
    const issues = getCheckoutAddressValidationIssues({
      shipping: {
        firstName: "Jan",
      },
      billing: {
        firstName: "Jan",
      },
      useSameAddress: false,
      email: "",
    })

    expect(issues).toEqual([
      {
        scope: "shipping",
        field: "lastName",
        code: "required",
        message: "Missing shipping field: lastName",
      },
      {
        scope: "shipping",
        field: "street",
        code: "required",
        message: "Missing shipping field: street",
      },
      {
        scope: "shipping",
        field: "city",
        code: "required",
        message: "Missing shipping field: city",
      },
      {
        scope: "shipping",
        field: "postalCode",
        code: "required",
        message: "Missing shipping field: postalCode",
      },
      {
        scope: "shipping",
        field: "country",
        code: "required",
        message: "Missing shipping field: country",
      },
      {
        scope: "billing",
        field: "lastName",
        code: "required",
        message: "Missing billing field: lastName",
      },
      {
        scope: "billing",
        field: "street",
        code: "required",
        message: "Missing billing field: street",
      },
      {
        scope: "billing",
        field: "city",
        code: "required",
        message: "Missing billing field: city",
      },
      {
        scope: "billing",
        field: "postalCode",
        code: "required",
        message: "Missing billing field: postalCode",
      },
      {
        scope: "billing",
        field: "country",
        code: "required",
        message: "Missing billing field: country",
      },
      {
        scope: "root",
        field: "email",
        code: "required",
        message: "Missing checkout email",
      },
    ])
  })

  it("skips billing validation when same-address mode omits billing input", () => {
    const issues = getCheckoutAddressValidationIssues({
      shipping: {
        firstName: "Jan",
        lastName: "Novak",
        street: "Main 1",
        city: "Prague",
        postalCode: "11000",
        country: "CZ",
      },
      billing: undefined as never,
      useSameAddress: true,
      email: "jan@example.com",
    })

    expect(issues).toEqual([])
  })

  it("maps checkout addresses to cart payloads with sane defaults", () => {
    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          firstName: " Jan ",
          lastName: " Novak ",
          street: " Main 1 ",
          street2: " Floor 2 ",
          city: " Prague ",
          postalCode: " 11000 ",
          country: " CZ ",
          province: " Prague ",
          company: " ACME ",
          phone: " +420123456789 ",
        },
        {
          countryCodeTransform: (countryCode) => ` ${countryCode} `,
        }
      )
    ).toEqual({
      first_name: "Jan",
      last_name: "Novak",
      address_1: "Main 1",
      address_2: "Floor 2",
      city: "Prague",
      postal_code: "11000",
      country_code: "cz",
      province: "Prague",
      company: "ACME",
      phone: "+420123456789",
    })

    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          city: "Prague",
          postalCode: "11000",
        },
        { defaultCountryCode: "CZ" }
      )
    ).toMatchObject({
      country_code: "cz",
    })
  })

  it("builds cart address input for separate and same-address checkout flows", () => {
    expect(
      buildCheckoutCartAddressInput(
        {
          shipping: {
            firstName: "Jan",
            lastName: "Novak",
            street: "Main 1",
            city: "Prague",
            postalCode: "11000",
            country: "CZ",
            company: "ACME",
          },
          billing: {
            firstName: "Bill",
            lastName: "Buyer",
            street: "Billing 2",
            city: "Brno",
            postalCode: "60200",
            country: "SK",
          },
          useSameAddress: false,
          email: " jan@example.com ",
        },
        {
          defaultCountryCode: "CZ",
        }
      )
    ).toEqual({
      email: "jan@example.com",
      shippingAddress: {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        postal_code: "11000",
        country_code: "cz",
        province: undefined,
        company: "ACME",
        phone: undefined,
      },
      billingAddress: {
        first_name: "Bill",
        last_name: "Buyer",
        address_1: "Billing 2",
        address_2: undefined,
        city: "Brno",
        postal_code: "60200",
        country_code: "sk",
        province: undefined,
        company: undefined,
        phone: undefined,
      },
      useSameAddress: false,
    })

    expect(
      buildCheckoutCartAddressInput({
        shipping: {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          city: "Prague",
          postalCode: "11000",
          country: "CZ",
        },
        useSameAddress: true,
        email: "jan@example.com",
      })
    ).toEqual({
      email: "jan@example.com",
      shippingAddress: {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        postal_code: "11000",
        country_code: "cz",
        province: undefined,
        company: undefined,
        phone: undefined,
      },
      billingAddress: {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
        address_2: undefined,
        city: "Prague",
        postal_code: "11000",
        country_code: "cz",
        province: undefined,
        company: undefined,
        phone: undefined,
      },
      useSameAddress: true,
    })
  })

  it("maps Medusa addresses back to the checkout shape", () => {
    expect(
      mapMedusaAddressToCheckoutAddress({
        first_name: " Jan ",
        last_name: " Novak ",
        address_1: " Main 1 ",
        address_2: " Floor 2 ",
        city: " Prague ",
        postal_code: " 11000 ",
        country_code: " cz ",
        is_default_shipping: true,
        metadata: { source: "test" },
      })
    ).toEqual({
      firstName: "Jan",
      lastName: "Novak",
      street: "Main 1",
      street2: "Floor 2",
      city: "Prague",
      postalCode: "11000",
      country: "cz",
      province: undefined,
      company: undefined,
      phone: undefined,
      isDefaultShipping: true,
      isDefaultBilling: undefined,
      metadata: { source: "test" },
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
        }
      )
    ).toEqual([
      {
        scope: "shipping",
        field: "lastName",
        code: "required",
        message: "Missing shipping field: lastName",
      },
      {
        scope: "shipping",
        field: "street",
        code: "required",
        message: "Missing shipping field: street",
      },
      {
        scope: "shipping",
        field: "city",
        code: "required",
        message: "Missing shipping field: city",
      },
      {
        scope: "shipping",
        field: "postalCode",
        code: "required",
        message: "Missing shipping field: postalCode",
      },
      {
        scope: "shipping",
        field: "country",
        code: "required",
        message: "Missing shipping field: country",
      },
    ])

    expect(
      cartAdapter.toPayload?.(
        {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          city: "Prague",
          postalCode: "11000",
          country: "CZ",
        },
        {
          scope: "shipping",
        }
      )
    ).toEqual({
      first_name: "Jan",
      last_name: "Novak",
      address_1: "Main 1",
      address_2: undefined,
      city: "Prague",
      postal_code: "11000",
      country_code: "cz",
      province: undefined,
      company: undefined,
      phone: undefined,
    })

    expect(
      customerAdapter.toCreateParams?.(
        {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          street2: "Floor 2",
          city: "Prague",
          postalCode: "11000",
          country: "CZ",
          isDefaultShipping: true,
          isDefaultBilling: false,
          metadata: { source: "test" },
        },
        {
          mode: "create",
        }
      )
    ).toEqual({
      first_name: "Jan",
      last_name: "Novak",
      address_1: "Main 1",
      address_2: "Floor 2",
      city: "Prague",
      postal_code: "11000",
      country_code: "cz",
      province: undefined,
      company: undefined,
      phone: undefined,
      is_default_shipping: true,
      is_default_billing: false,
      metadata: { source: "test" },
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
        }
      )
    ).toEqual([
      {
        scope: "customer",
        field: "country",
        code: "required",
        message: "Missing customer field: country",
      },
    ])

    expect(
      customerAdapter.toUpdateParams?.(
        {
          addressId: "addr_1",
          phone: " +420123456789 ",
          company: "   ",
          street2: null,
          country: " CZ ",
          isDefaultShipping: true,
        },
        {
          mode: "update",
        }
      )
    ).toEqual({
      phone: "+420123456789",
      company: "",
      address_2: "",
      country_code: "cz",
      is_default_shipping: true,
    })
  })
})
