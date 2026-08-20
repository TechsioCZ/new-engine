import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { resolveAvailabilityText } from "./resolve-availability-text"

const romanianLabels = {
  allowSourceLabels: false,
  inStock: "În stoc",
  outOfStock: "Momentan nu este în stoc",
}
const SLOVAK_AVAILABILITY_PATTERN = /Momentálne nie je skladom|Na sklade/
const SLOVAK_SOURCE_COPY_PATTERN = /Skladom|zajtra/

const availabilitySource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/checkout/utils/resolve-availability-text.ts"
  ),
  "utf8"
)
const availabilityConsumerSources = [
  "src/components/checkout/sections/checkout-cart-item-row.tsx",
  "src/components/checkout/sections/checkout-order-summary-section.tsx",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))

const lineItem = (
  overrides: Record<string, unknown> = {}
): HttpTypes.StoreCartLineItem =>
  ({
    id: "item_1",
    quantity: 1,
    ...overrides,
  }) as HttpTypes.StoreCartLineItem

describe("resolveAvailabilityText localization", () => {
  it("uses Romanian storefront-text fallbacks for in-stock and sold-out items", () => {
    expect(resolveAvailabilityText(lineItem(), romanianLabels)).toBe("În stoc")
    expect(
      resolveAvailabilityText(
        lineItem({ variant_inventory_quantity: 0 }),
        romanianLabels
      )
    ).toBe("Momentan nu este în stoc")
  })

  it("keeps explicit source offer copy authoritative for the SK market", () => {
    expect(
      resolveAvailabilityText(
        lineItem({
          metadata: {
            top_offer: {
              availability_in_stock: "Disponibil imediat",
              delivery_label: "livrare mâine",
            },
          },
        }),
        { ...romanianLabels, allowSourceLabels: true }
      )
    ).toBe("Disponibil imediat, livrare mâine")
  })

  it("ignores Slovak source availability and delivery copy for RO", () => {
    const result = resolveAvailabilityText(
      lineItem({
        metadata: {
          top_offer: {
            availability_in_stock: "Skladom",
            delivery_label: "u vás zajtra",
          },
        },
      }),
      romanianLabels
    )

    expect(result).toBe("În stoc")
    expect(result).not.toMatch(SLOVAK_SOURCE_COPY_PATTERN)
  })

  it("contains no embedded Slovak availability fallback", () => {
    expect(availabilitySource).not.toMatch(SLOVAK_AVAILABILITY_PATTERN)
    for (const source of availabilityConsumerSources) {
      expect(source).toContain('useTranslations("catalog")')
      expect(source).toContain('allowSourceLabels: marketContext.code === "sk"')
      expect(source).toContain('tCatalog("product_detail.stock.in_stock")')
      expect(source).toContain('tCatalog("product_detail.stock.out_of_stock")')
      expect(source).not.toMatch(SLOVAK_AVAILABILITY_PATTERN)
    }
  })
})
