import { describe, expect, it } from "vitest"
import {
  buildProductSearchDocuments,
  collectProductSearchIdentifiers,
} from "../documents"
import { isAcceptedProductHit } from "../search-results"

const product = {
  handle: "shopitem-4314",
  id: "prod_4314",
  metadata: {
    source_shopitem_id: 4314,
  },
  title: "Herbatica product",
  variants: [
    {
      id: "variant_0824",
      metadata: {
        code: "0824",
      },
      sku: "SHOPITEM-4314-0824",
      title: "Default variant",
    },
  ],
}

describe("Herbatica exact product identifiers", () => {
  it("collects the handle, source Shoptet ID, and displayed variant code", () => {
    expect(collectProductSearchIdentifiers(product)).toEqual(
      expect.arrayContaining(["shopitem-4314", "4314", "0824"])
    )
  })

  it("accepts every exact identifier in grouped and separate-variant documents", () => {
    const documents = buildProductSearchDocuments(product)

    expect(documents).toHaveLength(2)

    for (const document of documents) {
      expect(document.search_identifiers_normalized).toEqual(
        expect.arrayContaining(["shopitem-4314", "4314", "0824"])
      )

      for (const query of ["shopitem-4314", "4314", "0824"]) {
        expect(isAcceptedProductHit(document, query, 1, false)).toBe(true)
      }
    }
  })

  it("continues to reject partial numeric identifier matches", () => {
    const [document] = buildProductSearchDocuments(product)

    expect(isAcceptedProductHit(document, "431", 0, false)).toBe(false)
    expect(isAcceptedProductHit(document, "824", 0, false)).toBe(false)
  })
})
