import {
  optionalPositiveIntParam,
  optionalStringParam,
} from "../query-params"

describe("queryParams utilities", () => {
  describe("optionalStringParam", () => {
    it("returns undefined for empty or whitespace strings", () => {
      const result = optionalStringParam.safeParse("   ")
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it("trims and returns non-empty strings", () => {
      const result = optionalStringParam.safeParse("  hello  ")
      expect(result.success).toBe(true)
      expect(result.data).toBe("hello")
    })

    it("fails for non-string values", () => {
      const result = optionalStringParam.safeParse(123)
      expect(result.success).toBe(false)
    })
  })

  describe("optionalPositiveIntParam", () => {
    it("parses positive integers from strings", () => {
      const result = optionalPositiveIntParam.safeParse(" 42 ")
      expect(result.success).toBe(true)
      expect(result.data).toBe(42)
    })

    it("returns undefined for empty strings", () => {
      const result = optionalPositiveIntParam.safeParse("   ")
      expect(result.success).toBe(true)
      expect(result.data).toBeUndefined()
    })

    it("rejects zero and negative numbers", () => {
      const zeroResult = optionalPositiveIntParam.safeParse("0")
      expect(zeroResult.success).toBe(false)

      const negativeResult = optionalPositiveIntParam.safeParse("-5")
      expect(negativeResult.success).toBe(false)
    })

    it("rejects non-numeric values", () => {
      const result = optionalPositiveIntParam.safeParse("not-a-number")
      expect(result.success).toBe(false)
    })

    it("rejects non-integer numbers", () => {
      const result = optionalPositiveIntParam.safeParse("3.14")
      expect(result.success).toBe(false)
    })
  })
})
