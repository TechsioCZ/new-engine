import { describe, expect, it } from "vitest"
import {
  createProductIdentityIndex,
  matchSeedProduct,
} from "../../../../../src/workflows/seed/steps/product-identity"

const products = [
  { id: "by-handle", external_id: "old-id", handle: "current-handle" },
  { id: "by-external-id", external_id: "stable-id", handle: "old-handle" },
]

describe("matchSeedProduct", () => {
  const index = createProductIdentityIndex(products)

  it("prefers stable external_id when the handle changed", () => {
    expect(
      matchSeedProduct(
        { external_id: "stable-id", handle: "new-handle" },
        index
      )?.id
    ).toBe("by-external-id")
  })

  it("falls back to handle for legacy products without external_id", () => {
    expect(matchSeedProduct({ handle: "current-handle" }, index)?.id).toBe(
      "by-handle"
    )
  })

  it("rejects an external ID and handle that resolve to different products", () => {
    expect(() =>
      matchSeedProduct(
        { external_id: "stable-id", handle: "current-handle" },
        index
      )
    ).toThrow("Product identity conflict")
  })
})
