import { describe, expect, it } from "vitest"

import {
  StoreCreateCustomProductListSchema,
  StoreCreateFavoriteProductListItemSchema,
  StoreCreateFavoriteProductListSchema,
  StoreCreateProductListItemSchema,
  StoreUpdateProductListItemSchema,
  StoreUpdateProductListSchema,
} from "../../../../../../src/api/store/product-lists/validators"

const recursiveMetadata = {
  flags: [true, false, null],
  nested: {
    count: 2,
    labels: ["one", "two"],
  },
  source: "storefront",
}

const metadataSchemaCases = [
  {
    input: { metadata: recursiveMetadata },
    name: "favorite list creation",
    schema: StoreCreateFavoriteProductListSchema,
  },
  {
    input: { metadata: recursiveMetadata, title: "Seasonal picks" },
    name: "custom list creation",
    schema: StoreCreateCustomProductListSchema,
  },
  {
    input: { metadata: recursiveMetadata, product_id: "prod_1" },
    name: "list item creation",
    schema: StoreCreateProductListItemSchema,
  },
  {
    input: { metadata: recursiveMetadata, product_id: "prod_1" },
    name: "favorite item creation",
    schema: StoreCreateFavoriteProductListItemSchema,
  },
  {
    input: { metadata: recursiveMetadata },
    name: "list update",
    schema: StoreUpdateProductListSchema,
  },
  {
    input: { metadata: recursiveMetadata },
    name: "list item update",
    schema: StoreUpdateProductListItemSchema,
  },
]

describe("store product-list metadata validators", () => {
  it.each(metadataSchemaCases)(
    "accepts recursive JSON for $name",
    ({ input, schema }) => {
      expect(schema.safeParse(input).success).toBeTruthy()
    },
  )

  it.each(metadataSchemaCases)(
    "rejects non-JSON values for $name",
    ({ input, schema }) => {
      const invalidMetadata = {
        nested: ["valid", undefined],
      }

      expect(
        schema.safeParse({ ...input, metadata: invalidMetadata }).success,
      ).toBeFalsy()
    },
  )
})
