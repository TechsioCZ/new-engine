import { describe, expect, it } from "vitest"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { createProductSuggestions } from "./search-autocomplete-product-normalizers"

describe("createProductSuggestions", () => {
  it("keeps the calculated price and its original price", () => {
    const [suggestion] = createProductSuggestions({
      currencyCode: "eur",
      hits: [
        {
          id: "prod_test",
          title: "Test product",
          handle: "test-product",
          search_result: { variant_id: "variant_test" },
          variants: [
            {
              id: "variant_test",
              calculated_price: {
                calculated_amount: 800,
                original_amount: 1000,
                currency_code: "eur",
              },
            },
          ],
        },
      ],
      market: "sk",
      publicSlugsByProductId: { prod_test: "testovaci-produkt" },
    })

    expect(suggestion?.href).toBe(
      "/produkty/testovaci-produkt?variant=variant_test"
    )
    expect(suggestion?.sourceId).toBe("prod_test")
    expect(suggestion?.priceLabel).toBe(formatCurrencyAmount(800, "eur"))
    expect(suggestion?.originalPriceLabel).toBe(
      formatCurrencyAmount(1000, "eur")
    )
  })

  it("omits products without a URL-registry projection", () => {
    expect(
      createProductSuggestions({
        currencyCode: "eur",
        hits: [
          { id: "prod_test", title: "Test product", handle: "legacy-handle" },
        ],
        market: "sk",
        publicSlugsByProductId: {},
      })
    ).toEqual([])
  })
})
