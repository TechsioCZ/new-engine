import { describe, expect, it } from "vitest"

import { StoreCreateCustomerAccountSchema } from "../../../../../../src/api/store/customers/validators"

describe("store customer account metadata", () => {
  const requiredCustomerFields = {
    email: "customer@example.com",
  }

  it("parses recursive JSON metadata", () => {
    const result = StoreCreateCustomerAccountSchema.parse({
      ...requiredCustomerFields,
      metadata: {
        consent: true,
        preferences: {
          categories: ["tea", null, { featured: false }],
        },
      },
    })

    expect(result.metadata).toStrictEqual({
      consent: true,
      preferences: {
        categories: ["tea", null, { featured: false }],
      },
    })
  })

  it.each([
    ["omitted", requiredCustomerFields],
    ["null", { ...requiredCustomerFields, metadata: null }],
  ])("preserves %s metadata semantics", (_caseName, input) => {
    expect(StoreCreateCustomerAccountSchema.parse(input)).toStrictEqual(input)
  })

  it("rejects non-JSON metadata values", () => {
    expect(() =>
      StoreCreateCustomerAccountSchema.parse({
        ...requiredCustomerFields,
        metadata: { created_at: new Date("2026-01-01T00:00:00.000Z") },
      }),
    ).toThrow("Invalid input")
  })
})
