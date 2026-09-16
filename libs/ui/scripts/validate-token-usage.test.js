import { describe, expect, test } from "bun:test"
import { findMissingTokens } from "./validate-token-usage.js"

describe("fractional Tailwind utility validation", () => {
  const noDefinedTokens = new Set()

  test.each(["w-4/5", "md:w-4/5", "h-1/2", "max-w-3/4"])(
    "accepts the standard dimension utility %s",
    (className) => {
      expect(findMissingTokens(className, noDefinedTokens)).toEqual([])
    }
  )

  test.each(["p-4/5", "gap-4/5", "w-product-card"])(
    "keeps governed utility %s token-validated",
    (className) => {
      expect(findMissingTokens(className, noDefinedTokens)).not.toEqual([])
    }
  )
})
