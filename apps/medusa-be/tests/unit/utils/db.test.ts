import { describe, expect, it } from "vitest"

import { decodeSqlRows } from "../../../src/utils/db"

const decodeNamedRow = (row: Readonly<{ name?: unknown }>) => {
  if (typeof row.name !== "string") {
    throw new TypeError("name must be a string")
  }
  return { name: row.name }
}

describe("SQL row decoding", () => {
  it("decodes valid rows without globally converting date-like strings", () => {
    const rows = decodeSqlRows(
      [{ name: "2026-08-06" }, { name: "ordinary" }],
      decodeNamedRow,
    )

    expect(rows).toStrictEqual([{ name: "2026-08-06" }, { name: "ordinary" }])
  })

  it("rejects malformed result and row containers", () => {
    expect(() => decodeSqlRows(null, decodeNamedRow)).toThrow(
      "Raw SQL result rows must be an array",
    )
    expect(() => decodeSqlRows(["invalid"], decodeNamedRow)).toThrow(
      "Raw SQL row 0 must be an object",
    )
  })

  it("propagates decoder validation failures", () => {
    expect(() => decodeSqlRows([{ name: 42 }], decodeNamedRow)).toThrow(
      "name must be a string",
    )
  })
})
