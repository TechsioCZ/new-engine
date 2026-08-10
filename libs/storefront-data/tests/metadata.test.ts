import { describe, expect, it } from "vitest"

import {
  decodeStorefrontMetadata,
  isStorefrontMetadata,
} from "../src/shared/metadata"

describe("storefront metadata", () => {
  it("accepts JSON objects and preserves their identity", () => {
    const metadata = {
      flags: [true, null, 3],
      nested: { source: "storefront" },
    }

    expect(isStorefrontMetadata(metadata)).toBeTruthy()
    expect(decodeStorefrontMetadata(metadata)).toBe(metadata)
  })

  it.each([
    { invalid: () => "function" },
    { invalid: Number.NaN },
    Object.fromEntries([["invalid", undefined]]),
    new Date(),
  ])("rejects values that are not JSON objects", (value) => {
    expect(isStorefrontMetadata(value)).toBeFalsy()
    expect(() => decodeStorefrontMetadata(value)).toThrow(
      "Storefront metadata must be a JSON object",
    )
  })

  it("rejects cyclic objects without recursing indefinitely", () => {
    const cyclic: { self?: object } = {}
    cyclic.self = cyclic

    expect(isStorefrontMetadata(cyclic)).toBeFalsy()
  })
})
