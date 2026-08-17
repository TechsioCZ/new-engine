import { describe, expect, it } from "vitest"
import { resolveVisibleFieldError } from "./field-errors"

const changeErrorMeta = {
  errors: ["invalid"],
  errorMap: { onChange: "invalid" },
  isBlurred: false,
}

describe("resolveVisibleFieldError", () => {
  it("keeps an unblurred change error hidden before submit", () => {
    expect(
      resolveVisibleFieldError({
        meta: changeErrorMeta,
        submissionAttempts: 0,
      })
    ).toBeUndefined()
  })

  it("shows an unblurred change error after submit", () => {
    expect(
      resolveVisibleFieldError({
        meta: changeErrorMeta,
        submissionAttempts: 1,
      })
    ).toBe("invalid")
  })
})
