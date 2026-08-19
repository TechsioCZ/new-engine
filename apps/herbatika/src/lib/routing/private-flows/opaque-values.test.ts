import { describe, expect, it } from "vitest"
import { exactOpaqueSegment, exactOptionalQueryValue } from "./opaque-values"

describe("private opaque values", () => {
  it("preserves exact case and punctuation", () => {
    expect(exactOpaqueSegment("Token.Aa-01_~")).toBe("Token.Aa-01_~")
  })

  it.each([
    undefined,
    "",
    ["one"],
    "bad/value",
    "bad\\value",
    "bad\u0000value",
  ])("rejects an invalid path value: %s", (value) => {
    expect(exactOpaqueSegment(value)).toBeNull()
  })

  it("distinguishes an absent optional query from an invalid one", () => {
    expect(exactOptionalQueryValue(undefined)).toBeUndefined()
    expect(exactOptionalQueryValue(["duplicate"])).toBeNull()
    expect(exactOptionalQueryValue("Exact")).toBe("Exact")
  })
})
