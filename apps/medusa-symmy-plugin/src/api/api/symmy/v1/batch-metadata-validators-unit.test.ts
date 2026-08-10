import { describe, expect, it } from "vitest"

import { UpsertCustomerGroupsBatchSchema } from "./customer-groups/batch/validators"
import { UpsertCustomersBatchSchema } from "./customers/batch/validators"
import { UpsertProductsBatchSchema } from "./products/batch/validators"

const nestedMetadata = {
  active: true,
  attributes: {
    aliases: ["primary", null, 3],
    source: "erp",
  },
  count: 2,
  deleted_at: null,
}

describe("batch metadata validators", () => {
  it("preserves recursive JSON metadata in customer group inputs", () => {
    const parsed = UpsertCustomerGroupsBatchSchema.parse({
      customer_groups: [
        {
          identifier_type: "name",
          metadata: nestedMetadata,
          name: "Wholesale",
        },
      ],
    })

    expect(parsed.customer_groups[0]?.metadata).toStrictEqual(nestedMetadata)
  })

  it("preserves recursive JSON metadata in customer inputs", () => {
    const parsed = UpsertCustomersBatchSchema.parse({
      customers: [
        {
          email: "customer@example.com",
          first_name: "Ada",
          identifier_type: "email",
          last_name: "Lovelace",
          metadata: nestedMetadata,
        },
      ],
    })

    expect(parsed.customers[0]?.metadata).toStrictEqual(nestedMetadata)
  })

  it("preserves recursive JSON metadata in product and variant inputs", () => {
    const parsed = UpsertProductsBatchSchema.parse({
      products: [
        {
          identifier_type: "sku",
          metadata: nestedMetadata,
          sku: "product-sku",
          title: "Product",
          variants: [
            {
              identifier_type: "sku",
              metadata: nestedMetadata,
              sku: "variant-sku",
              title: "Variant",
            },
          ],
        },
      ],
    })

    expect(parsed.products[0]?.metadata).toStrictEqual(nestedMetadata)
    expect(parsed.products[0]?.variants?.[0]?.metadata).toStrictEqual(
      nestedMetadata,
    )
  })

  it("keeps metadata optional and rejects a null metadata object", () => {
    const withoutMetadata = UpsertCustomerGroupsBatchSchema.parse({
      customer_groups: [{ identifier_type: "name", name: "Retail" }],
    })
    const withNullMetadata = UpsertCustomerGroupsBatchSchema.safeParse({
      customer_groups: [
        { identifier_type: "name", metadata: null, name: "Retail" },
      ],
    })

    expect(withoutMetadata.customer_groups[0]).not.toHaveProperty("metadata")
    expect(withNullMetadata.success).toBeFalsy()
  })

  it("rejects non-JSON metadata values", () => {
    const result = UpsertProductsBatchSchema.safeParse({
      products: [
        {
          identifier_type: "sku",
          metadata: { invalid: 1n },
          sku: "product-sku",
          title: "Product",
        },
      ],
    })

    expect(result.success).toBeFalsy()
  })
})
