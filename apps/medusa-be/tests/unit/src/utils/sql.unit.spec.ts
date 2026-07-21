import { describe, expect, it } from "vitest"
import { escapeLikePattern } from "../../../../src/utils/sql"

describe("escapeLikePattern", () => {
  it("preserves text without SQL LIKE metacharacters", () => {
    expect(escapeLikePattern("hello world")).toBe("hello world")
  })

  it("escapes percent signs, underscores, and backslashes", () => {
    expect(escapeLikePattern("50%_discount\\sale")).toBe(
      "50\\%\\_discount\\\\sale"
    )
  })

  it("preserves unicode while escaping LIKE metacharacters", () => {
    expect(escapeLikePattern("cafe_50% áru")).toBe("cafe\\_50\\% áru")
  })
})
