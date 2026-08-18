import { describe, expect, it } from "vitest"
import {
  resolveReviewInitial,
  resolveVisibleReviewMessage,
  resolveVisibleReviewPoints,
} from "./review-card.utils"

describe("review card presentation", () => {
  it("uses a stable fallback initial for blank author names", () => {
    expect(resolveReviewInitial("  zdeněk ")).toBe("Z")
    expect(resolveReviewInitial("  ")).toBe("A")
  })

  it("trims and limits positive or negative points", () => {
    expect(
      resolveVisibleReviewPoints([" Fast ", "", "Helpful", "Extra"])
    ).toEqual(["Fast", "Helpful"])
  })

  it("hides a message that only repeats the structured review points", () => {
    expect(
      resolveVisibleReviewMessage(" Fast   Helpful ", [["Fast", "Helpful"]])
    ).toBeUndefined()
    expect(
      resolveVisibleReviewMessage("A separate summary", [["Fast", "Helpful"]])
    ).toBe("A separate summary")
  })
})
