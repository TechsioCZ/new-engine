import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import {
  parseProductListMetadata,
  productListMetadataSchema,
} from "../../../../../src/modules/product-list/schemas"

describe("product-list metadata", () => {
  it("parses recursive JSON metadata", () => {
    const metadata = {
      flags: [true, false, null],
      nested: {
        count: 2,
        labels: ["one", "two"],
      },
      source: "storefront",
    }

    const parsed = parseProductListMetadata(metadata)

    expect(productListMetadataSchema.parse(metadata)).toStrictEqual(metadata)
    expect(parsed).toStrictEqual(metadata)
    expect(parsed).not.toBe(metadata)
    expect(parsed?.["nested"]).not.toBe(metadata.nested)
  })

  it.each([null, undefined])("normalizes %s to null", (metadata) => {
    expect(parseProductListMetadata(metadata)).toBeNull()
  })

  it("rejects non-JSON values with a typed domain error", () => {
    const metadata = {}
    Reflect.set(metadata, "invalid", undefined)

    expect(() => parseProductListMetadata(metadata)).toThrow(MedusaError)
  })
})
