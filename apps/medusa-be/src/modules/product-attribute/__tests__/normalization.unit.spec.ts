import { describe, expect, it } from "vitest"

import {
  assertProductAttributeKeyAvailable,
  normalizeProductAttributeKey,
  normalizeRequiredProductAttributeKey,
  partitionProductAttributeRecordIds,
} from "../../../utils/product-attributes"

const INVALID_KEY_ERROR = /must contain at least one letter or number/
const RESTORE_DELETED_OPTION_ERROR =
  /Restore deleted option "patopt_deleted" instead/
const ACTIVE_COLLISION_ERROR = /Use a different key/

describe("Product Attribute keys", () => {
  it("normalizes Admin and import keys through one canonical path", () => {
    expect(normalizeProductAttributeKey("  Záruka výrobcu  ")).toBe(
      "záruka-výrobcu"
    )
  })

  it("rejects values without a usable normalized key", () => {
    expect(() => normalizeRequiredProductAttributeKey(" --- ")).toThrow(
      INVALID_KEY_ERROR
    )
  })

  it("directs callers to restore a colliding deleted record", () => {
    expect(() =>
      assertProductAttributeKeyAvailable({
        collision: {
          deleted_at: new Date(),
          id: "patopt_deleted",
        },
        definitionKey: "supplier",
        key: "bioherba",
        kind: "option",
      })
    ).toThrow(RESTORE_DELETED_OPTION_ERROR)
  })

  it("rejects an active key collision without restore guidance", () => {
    expect(() =>
      assertProductAttributeKeyAvailable({
        collision: {
          deleted_at: null,
          id: "patdef_active",
        },
        key: "supplier",
        kind: "definition",
      })
    ).toThrow(ACTIVE_COLLISION_ERROR)
  })
})

describe("Product Attribute soft-delete partitions", () => {
  it("separates active records from records eligible for restore", () => {
    expect(
      partitionProductAttributeRecordIds([
        { deleted_at: null, id: "active" },
        { deleted_at: new Date("2026-01-01"), id: "deleted" },
      ])
    ).toEqual({
      active_ids: ["active"],
      deleted_ids: ["deleted"],
    })
  })
})
