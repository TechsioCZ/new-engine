import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"

import {
  normalizeError,
  shouldCaptureException,
} from "../../../../src/utils/errors"
import type { ErrorWithOriginalThrowable } from "../../../../src/utils/errors"

describe(normalizeError, () => {
  it("returns the same Error instance if throwable is already an Error", () => {
    const error = new Error("test error")
    const result = normalizeError(error)
    expect(result).toBe(error)
  })

  it("converts a string throwable to an Error with originalThrowable", () => {
    const throwable = "something went wrong"
    const result = normalizeError(throwable) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("something went wrong")
    expect(result.originalThrowable).toBe(throwable)
  })

  it("converts an object throwable to an Error with originalThrowable", () => {
    const throwable = { code: "ERR_001", details: "some details" }
    const result = normalizeError(throwable) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("[object Object]")
    expect(result.originalThrowable).toBe(throwable)
  })

  it("converts null to an Error with originalThrowable", () => {
    const result = normalizeError(null) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("null")
    expect(result.originalThrowable).toBeNull()
  })

  it("converts undefined to an Error with originalThrowable", () => {
    const result = normalizeError() as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("undefined")
    expect(result.originalThrowable).toBeUndefined()
  })

  it("converts a number throwable to an Error", () => {
    const result = normalizeError(42) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("42")
    expect(result.originalThrowable).toBe(42)
  })
})

describe(shouldCaptureException, () => {
  describe("returns false for client error types", () => {
    it.each([
      ["UNAUTHORIZED", MedusaError.Types.UNAUTHORIZED],
      ["NOT_ALLOWED", MedusaError.Types.NOT_ALLOWED],
      ["INVALID_DATA", MedusaError.Types.INVALID_DATA],
      ["NOT_FOUND", MedusaError.Types.NOT_FOUND],
    ])("skips %s errors", (_, errorType) => {
      const error = new MedusaError(errorType, "test")
      expect(shouldCaptureException(error)).toBeFalsy()
    })
  })

  describe("returns true for error types that might indicate infrastructure issues", () => {
    it.each([
      ["CONFLICT", MedusaError.Types.CONFLICT],
      ["DUPLICATE_ERROR", MedusaError.Types.DUPLICATE_ERROR],
      [
        "PAYMENT_AUTHORIZATION_ERROR",
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      ],
      ["DB_ERROR", MedusaError.Types.DB_ERROR],
      ["UNEXPECTED_STATE", MedusaError.Types.UNEXPECTED_STATE],
    ])("captures %s errors", (_, errorType) => {
      const error = new MedusaError(errorType, "test")
      expect(shouldCaptureException(error)).toBeTruthy()
    })
  })

  describe("non-MedusaError objects", () => {
    it("captures errors with status codes (not filtered by status)", () => {
      expect(shouldCaptureException({ status: 400 })).toBeTruthy()
      expect(shouldCaptureException({ status: 404 })).toBeTruthy()
      expect(shouldCaptureException({ status: 500 })).toBeTruthy()
      expect(shouldCaptureException({ statusCode: 429 })).toBeTruthy()
    })

    it("captures errors without type property", () => {
      expect(shouldCaptureException({ message: "unknown error" })).toBeTruthy()
    })

    it("captures errors with unknown type", () => {
      expect(shouldCaptureException({ type: "custom_error" })).toBeTruthy()
    })
  })

  describe("edge cases", () => {
    it("returns true for null", () => {
      expect(shouldCaptureException(null)).toBeTruthy()
    })

    it("returns true for undefined", () => {
      expect(shouldCaptureException()).toBeTruthy()
    })

    it("returns true for primitive values", () => {
      expect(shouldCaptureException("string error")).toBeTruthy()
      expect(shouldCaptureException(42)).toBeTruthy()
    })

    it("returns true for plain Error instances without status", () => {
      expect(shouldCaptureException(new Error("test"))).toBeTruthy()
    })
  })
})
