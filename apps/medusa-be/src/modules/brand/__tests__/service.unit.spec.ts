import { describe, expect, it } from "vitest"
import {
  type BrandAttributeRecord,
  shouldDeleteBrandAttribute,
} from "../service"

const attribute = ({
  attributeDeletedAt,
  typeDeletedAt,
  name = "Country",
}: {
  attributeDeletedAt?: string
  name?: string
  typeDeletedAt?: string
} = {}): BrandAttributeRecord => ({
  attributeType: {
    deleted_at: typeDeletedAt,
    id: `type_${name}`,
    name,
  },
  deleted_at: attributeDeletedAt,
  id: `attribute_${name}`,
  value: "value",
})

describe("Brand attribute replacement", () => {
  it("preserves active values whose attribute type is soft-deleted", () => {
    expect(
      shouldDeleteBrandAttribute(
        attribute({ typeDeletedAt: "2026-07-20" }),
        new Set()
      )
    ).toBe(false)
  })

  it("deletes an omitted value only while its type is active", () => {
    expect(shouldDeleteBrandAttribute(attribute(), new Set())).toBe(true)
  })

  it("keeps requested and already-soft-deleted values", () => {
    expect(shouldDeleteBrandAttribute(attribute(), new Set(["Country"]))).toBe(
      false
    )
    expect(
      shouldDeleteBrandAttribute(
        attribute({ attributeDeletedAt: "2026-07-20" }),
        new Set()
      )
    ).toBe(false)
  })
})
