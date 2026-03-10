import {
  buildCheckoutCartAddressInput,
  getCheckoutAddressValidationIssues,
  hasCartShippingAddress,
  hasCheckoutAddressData,
  type CheckoutAddressInput,
  mapCheckoutAddressToMedusaCartAddress,
  normalizeCheckoutAddressInput,
} from "../src/checkout/address"

describe("checkout address helpers", () => {
  it("normalizes checkout address fields", () => {
    const normalized = normalizeCheckoutAddressInput({
      firstName: " Jan ",
      lastName: " Novak ",
      street: " Main 1 ",
      city: " Prague ",
      postalCode: " 11000 ",
      country: " CZ ",
      province: " Prague ",
      company: "  ACME ",
      phone: " +420123456789 ",
    })

    expect(normalized).toEqual({
      firstName: "Jan",
      lastName: "Novak",
      street: "Main 1",
      city: "Prague",
      postalCode: "11000",
      country: "CZ",
      province: "Prague",
      company: "ACME",
      phone: "+420123456789",
    })
  })

  it("widens normalized address fields at type level", () => {
    type StrictAddress = CheckoutAddressInput & {
      firstName: string
      lastName: string
      loyaltyCode: string
    }

    const normalized = normalizeCheckoutAddressInput<StrictAddress>({
      firstName: " Jan ",
      lastName: " Novak ",
      loyaltyCode: "vip-123",
    })

    const loyaltyCode: string = normalized.loyaltyCode
    const firstName: string | undefined = normalized.firstName
    void loyaltyCode
    void firstName

    // @ts-expect-error normalized firstName may be undefined
    const invalidRequiredName: string = normalized.firstName
    void invalidRequiredName

    expect(normalized.firstName).toBe("Jan")
    expect(normalized.loyaltyCode).toBe("vip-123")
  })

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
        message: "Missing shipping field: lastName",
      },
      {
        scope: "shipping",
        field: "street",
        message: "Missing shipping field: street",
      },
      {
        scope: "shipping",
        field: "city",
        message: "Missing shipping field: city",
      },
      {
        scope: "shipping",
        field: "postalCode",
        message: "Missing shipping field: postalCode",
      },
      {
        scope: "shipping",
        field: "country",
        message: "Missing shipping field: country",
      },
      {
        scope: "billing",
        field: "lastName",
        message: "Missing billing field: lastName",
      },
      {
        scope: "billing",
        field: "street",
        message: "Missing billing field: street",
      },
      {
        scope: "billing",
        field: "city",
        message: "Missing billing field: city",
      },
      {
        scope: "billing",
        field: "postalCode",
        message: "Missing billing field: postalCode",
      },
      {
        scope: "billing",
        field: "country",
        message: "Missing billing field: country",
      },
      {
        scope: "root",
        field: "email",
        message: "Missing checkout email",
      },
    ])
  })

  it("skips billing validation in same-address mode when billing input is missing", () => {
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

  it("maps checkout address data to cart update payload", () => {
    const payload = buildCheckoutCartAddressInput(
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
        email: "jan@example.com",
      },
      {
        defaultCountryCode: "CZ",
      }
    )

    expect(payload).toEqual({
      email: "jan@example.com",
      shippingAddress: {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
        city: "Prague",
        postal_code: "11000",
        country_code: "cz",
        company: "ACME",
        province: undefined,
        phone: undefined,
      },
      billingAddress: {
        first_name: "Bill",
        last_name: "Buyer",
        address_1: "Billing 2",
        city: "Brno",
        postal_code: "60200",
        country_code: "sk",
        province: undefined,
        company: undefined,
        phone: undefined,
      },
      useSameAddress: false,
    })
  })

  it("detects complete checkout/cart address data", () => {
    const validCheckoutData = hasCheckoutAddressData({
      shipping: {
        firstName: "Jan",
        lastName: "Novak",
        street: "Main 1",
        city: "Prague",
        postalCode: "11000",
        country: "CZ",
      },
      billing: {
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

    const completeCartAddress = hasCartShippingAddress(
      {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
        city: "Prague",
        postal_code: "11000",
        country_code: "cz",
      },
      "jan@example.com"
    )

    expect(validCheckoutData).toBe(true)
    expect(completeCartAddress).toBe(true)
  })

  it("builds same-address checkout payload without billing input", () => {
    const payload = buildCheckoutCartAddressInput({
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

    expect(payload).toEqual({
      email: "jan@example.com",
      shippingAddress: {
        first_name: "Jan",
        last_name: "Novak",
        address_1: "Main 1",
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

  it("applies fallback country when mapping single address", () => {
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
    ).toEqual({
      first_name: "Jan",
      last_name: "Novak",
      address_1: "Main 1",
      city: "Prague",
      postal_code: "11000",
      country_code: "cz",
      province: undefined,
      company: undefined,
      phone: undefined,
    })
  })

  it("trims transformed country code and falls back to default for whitespace values", () => {
    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          city: "Prague",
          postalCode: "11000",
          country: " CZ ",
        },
        {
          countryCodeTransform: (countryCode) => ` ${countryCode} `,
          defaultCountryCode: " SK ",
        }
      )
    ).toMatchObject({
      country_code: "cz",
    })

    expect(
      mapCheckoutAddressToMedusaCartAddress(
        {
          firstName: "Jan",
          lastName: "Novak",
          street: "Main 1",
          city: "Prague",
          postalCode: "11000",
          country: "   ",
        },
        {
          defaultCountryCode: " SK ",
        }
      )
    ).toMatchObject({
      country_code: "sk",
    })
  })
})
