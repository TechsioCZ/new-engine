import { describe, expect, it } from "vitest"

import {
  decodeContentHit,
  decodeOptional,
  decodeString,
} from "./search-autocomplete-response-core-decoders"
import { decodeProductHit } from "./search-autocomplete-response-product-decoder"

const product = {
  handle: "tea",
  id: "prod_1",
  title: "Tea",
}

const variant = {
  id: "variant_1",
}

describe("search autocomplete boundary decoders", () => {
  it("distinguishes missing, nullable, and invalid optional fields", () => {
    expect(decodeOptional({}, "label", decodeString)).toStrictEqual({
      included: false,
      value: null,
    })
    expect(
      decodeOptional({ label: null }, "label", decodeString),
    ).toStrictEqual({
      included: true,
      value: null,
    })
    expect(decodeOptional({ label: 1 }, "label", decodeString)).toBeNull()
  })

  it("can reject explicit null while accepting an absent field", () => {
    expect(decodeOptional({}, "label", decodeString, false)).toStrictEqual({
      included: false,
      value: null,
    })
    expect(
      decodeOptional({ label: null }, "label", decodeString, false),
    ).toBeNull()
  })

  it("omits absent optional product fields", () => {
    expect(decodeProductHit(product)).toStrictEqual(product)
  })

  it("preserves explicit null for nullable product fields", () => {
    const decoded = decodeProductHit({
      ...product,
      brand: null,
      categories: null,
      metadata: null,
      thumbnail: null,
      variants: null,
    })

    expect(decoded).toStrictEqual({
      ...product,
      brand: null,
      categories: null,
      metadata: null,
      thumbnail: null,
      variants: null,
    })
  })

  it("rejects explicit null and malformed search results", () => {
    expect(decodeProductHit({ ...product, search_result: null })).toBeNull()
    expect(
      decodeProductHit({ ...product, search_result: { variant_id: 1 } }),
    ).toBeNull()
  })

  it("decodes valid search result optionals without inventing missing keys", () => {
    expect(
      decodeProductHit({
        ...product,
        search_result: { variant_id: null },
      }),
    ).toStrictEqual({
      ...product,
      search_result: { variant_id: null },
    })
  })

  it("rejects malformed product references and arrays", () => {
    expect(
      decodeProductHit({ ...product, brand: { id: "brand_1" } }),
    ).toBeNull()
    expect(decodeProductHit({ ...product, categories: [null] })).toBeNull()
    expect(decodeProductHit({ ...product, variants: {} })).toBeNull()
  })

  it("preserves missing and nullable variant fields", () => {
    expect(decodeProductHit({ ...product, variants: [variant] })).toStrictEqual(
      {
        ...product,
        variants: [variant],
      },
    )
    expect(
      decodeProductHit({
        ...product,
        variants: [{ ...variant, barcode: null, sku: null }],
      }),
    ).toStrictEqual({
      ...product,
      variants: [{ ...variant, barcode: null, sku: null }],
    })
  })

  it("decodes calculated price missing, null, and finite values", () => {
    expect(
      decodeProductHit({
        ...product,
        variants: [{ ...variant, calculated_price: {} }],
      }),
    ).toStrictEqual({
      ...product,
      variants: [{ ...variant, calculated_price: {} }],
    })
    expect(
      decodeProductHit({
        ...product,
        variants: [{ ...variant, calculated_price: null }],
      }),
    ).toStrictEqual({
      ...product,
      variants: [{ ...variant, calculated_price: null }],
    })
    expect(
      decodeProductHit({
        ...product,
        variants: [
          {
            ...variant,
            calculated_price: {
              calculated_amount: 125,
              currency_code: "czk",
            },
          },
        ],
      }),
    ).not.toBeNull()
  })

  it("rejects invalid calculated price values", () => {
    expect(
      decodeProductHit({
        ...product,
        variants: [
          {
            ...variant,
            calculated_price: { calculated_amount: Number.NaN },
          },
        ],
      }),
    ).toBeNull()
  })

  it("distinguishes missing and nullable content fields", () => {
    const hit = { href: "/blog/tea", id: "post_1", title: "Tea" }
    expect(decodeContentHit(hit)).toStrictEqual(hit)
    expect(
      decodeContentHit({ ...hit, excerpt: null, type: null }),
    ).toStrictEqual({
      ...hit,
      excerpt: null,
      type: null,
    })
  })

  it("rejects invalid content optionals", () => {
    const hit = { href: "/blog/tea", id: "post_1", title: "Tea" }
    expect(decodeContentHit({ ...hit, excerpt: 1 })).toBeNull()
    expect(decodeContentHit({ ...hit, type: false })).toBeNull()
  })
})
