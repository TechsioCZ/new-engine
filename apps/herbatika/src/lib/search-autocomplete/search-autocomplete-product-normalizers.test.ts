import { describe, expect, it } from "vitest"

import { createProductSuggestions } from "./search-autocomplete-product-normalizers"

describe(createProductSuggestions, () => {
  it("creates a variant-specific typed-link destination", () => {
    const [suggestion] = createProductSuggestions(
      [
        {
          categories: [],
          handle: "magnesium",
          id: "product-1",
          search_result: {
            variant_id: "variant / 1",
            variant_title: "Large",
          },
          title: "Magnesium",
          variants: [],
        },
      ],
      "EUR",
    )

    expect(suggestion).toMatchObject({
      href: "/p/magnesium?variant=variant%20%2F%201",
      title: "Magnesium – Large",
    })
  })
})
