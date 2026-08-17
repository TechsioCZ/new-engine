import { describe, expect, it } from "vitest"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"
import { createProductSuggestions } from "./search-autocomplete-product-normalizers"

describe("createProductSuggestions", () => {
  it("keeps the calculated price and its original price", () => {
    const [suggestion] = createProductSuggestions(
      [
        {
          id: "prod_test",
          title: "Test product",
          handle: "test-product",
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
      "eur"
    )

    expect(suggestion?.priceLabel).toBe(formatCurrencyAmount(800, "eur"))
    expect(suggestion?.originalPriceLabel).toBe(
      formatCurrencyAmount(1000, "eur")
    )
  })
})
