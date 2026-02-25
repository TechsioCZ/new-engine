import { MedusaError } from "@medusajs/framework/utils"
import {
  type ErrorWithOriginalThrowable,
  isMedusaErrorType,
  isMedusaInvalidData404Error,
  normalizeError,
  shouldCaptureException,
  withMedusaStatusCode,
} from "../errors"

describe("normalizeError", () => {
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
    expect(result.originalThrowable).toBe(null)
  })

  it("converts undefined to an Error with originalThrowable", () => {
    const result = normalizeError(undefined) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("undefined")
    expect(result.originalThrowable).toBe(undefined)
  })

  it("converts a number throwable to an Error", () => {
    const result = normalizeError(42) as ErrorWithOriginalThrowable
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe("42")
    expect(result.originalThrowable).toBe(42)
  })
})

describe("shouldCaptureException", () => {
  describe("returns false for client error types", () => {
    it.each([
      ["UNAUTHORIZED", MedusaError.Types.UNAUTHORIZED],
      ["NOT_ALLOWED", MedusaError.Types.NOT_ALLOWED],
      ["INVALID_DATA", MedusaError.Types.INVALID_DATA],
      ["NOT_FOUND", MedusaError.Types.NOT_FOUND],
    ])("skips %s errors", (_, errorType) => {
      const error = new MedusaError(errorType, "test")
      expect(shouldCaptureException(error)).toBe(false)
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
      expect(shouldCaptureException(error)).toBe(true)
    })
  })

  describe("non-MedusaError objects", () => {
    it("captures errors with status codes (not filtered by status)", () => {
      expect(shouldCaptureException({ status: 400 })).toBe(true)
      expect(shouldCaptureException({ status: 404 })).toBe(true)
      expect(shouldCaptureException({ status: 500 })).toBe(true)
      expect(shouldCaptureException({ statusCode: 429 })).toBe(true)
    })

    it("captures errors without type property", () => {
      expect(shouldCaptureException({ message: "unknown error" })).toBe(true)
    })

    it("captures errors with unknown type", () => {
      expect(shouldCaptureException({ type: "custom_error" })).toBe(true)
    })
  })

  describe("edge cases", () => {
    it("returns true for null", () => {
      expect(shouldCaptureException(null)).toBe(true)
    })

    it("returns true for undefined", () => {
      expect(shouldCaptureException(undefined)).toBe(true)
    })

    it("returns true for primitive values", () => {
      expect(shouldCaptureException("string error")).toBe(true)
      expect(shouldCaptureException(42)).toBe(true)
    })

    it("returns true for plain Error instances without status", () => {
      expect(shouldCaptureException(new Error("test"))).toBe(true)
    })
  })
})

describe("isMedusaErrorType", () => {
  it("matches MedusaError by type", () => {
    const error = new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid")
    expect(isMedusaErrorType(error, MedusaError.Types.INVALID_DATA)).toBe(true)
  })
})

describe("isMedusaInvalidData404Error", () => {
  it("matches INVALID_DATA errors with statusCode 404", () => {
    const error = withMedusaStatusCode(
      new MedusaError(MedusaError.Types.INVALID_DATA, "Not found"),
      404
    )
    expect(isMedusaInvalidData404Error(error)).toBe(true)
  })

  it("matches NOT_FOUND MedusaError", () => {
    const error = new MedusaError(MedusaError.Types.NOT_FOUND, "Not found")
    expect(isMedusaInvalidData404Error(error)).toBe(true)
  })

  it("does not match INVALID_DATA without statusCode 404", () => {
    const error = new MedusaError(MedusaError.Types.INVALID_DATA, "Invalid")
    expect(isMedusaInvalidData404Error(error)).toBe(false)
  })
})
