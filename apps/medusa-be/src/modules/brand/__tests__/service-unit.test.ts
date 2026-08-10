import { describe, expect, it } from "vitest"

import { shouldDeleteBrandAttribute } from "../service"
import type { BrandAttributeRecord } from "../service"

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
    ...(typeDeletedAt === undefined ? {} : { deleted_at: typeDeletedAt }),
    id: `type_${name}`,
    name,
  },
  ...(attributeDeletedAt === undefined
    ? {}
    : { deleted_at: attributeDeletedAt }),
  id: `attribute_${name}`,
  value: "value",
})

describe("Brand attribute replacement", () => {
  it("preserves active values whose attribute type is soft-deleted", () => {
    expect(
      shouldDeleteBrandAttribute(
        attribute({ typeDeletedAt: "2026-07-20" }),
        new Set(),
      ),
    ).toBeFalsy()
  })

  it("deletes an omitted value only while its type is active", () => {
    expect(shouldDeleteBrandAttribute(attribute(), new Set())).toBeTruthy()
  })

  it("keeps requested and already-soft-deleted values", () => {
    expect(
      shouldDeleteBrandAttribute(attribute(), new Set(["Country"])),
    ).toBeFalsy()
    expect(
      shouldDeleteBrandAttribute(
        attribute({ attributeDeletedAt: "2026-07-20" }),
        new Set(),
      ),
    ).toBeFalsy()
  })
})
