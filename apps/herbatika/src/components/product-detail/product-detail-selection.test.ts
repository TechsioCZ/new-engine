import { describe, expect, it } from "vitest"

import { resolveInitialVariantId } from "./product-detail-selection"

describe(resolveInitialVariantId, () => {
  const variants = [{ id: "variant-a" }, { id: "variant-b" }]

  it("selects the variant requested by the URL", () => {
    expect(resolveInitialVariantId(variants, "variant-b")).toBe("variant-b")
  })

  it("falls back when the URL variant is not part of the product", () => {
    expect(resolveInitialVariantId(variants, "missing")).toBe("variant-a")
  })
})
