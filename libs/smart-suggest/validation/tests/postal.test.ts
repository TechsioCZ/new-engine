import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import { Cause, Effect, Exit } from "effect"
import { describe, expect, it } from "@effect/vitest"

import { validatePostalCodeEffect } from "../src/effect"
import { getPostalInputHints, validatePostalCode } from "../src/validation"
import { PostalValidationError } from "../src/schemas"

type PostalFixture = readonly [SmartSuggestCountryCode, string, string]

describe("validatePostalCode", () => {
  const validPostalFixtures = [
    ["CZ", "12345", "123 45"],
    ["SK", "81101", "811 01"],
    ["PL", "12345", "12-345"],
    ["DE", "10115", "10115"],
    ["AT", "1010", "1010"],
    ["HU", "1051", "1051"],
    ["RO", "010011", "010011"],
    ["GB", "sw1a1aa", "SW1A 1AA"],
    ["CA", "k1a0b1", "K1A 0B1"],
    ["US", "90210-1234", "90210-1234"],
  ] satisfies readonly PostalFixture[]

  it.each(
    validPostalFixtures
  )("normalizes and validates %s postal codes", (countryCode, rawInput, displayValue) => {
    expect(validatePostalCode({ countryCode, rawInput })).toMatchObject({
      countryCode,
      displayValue,
      isValid: true,
      errors: [],
    })
  })

  it("keeps unsupported countries tolerant with unknown validity", () => {
    expect(
      validatePostalCode({ countryCode: "ZZ", rawInput: "12345" })
    ).toMatchObject({
      countryCode: "ZZ",
      isValid: "unknown",
      errors: [expect.objectContaining({ code: "postal.country_unsupported" })],
    })
  })

  it("reports invalid postal codes with structured errors", () => {
    const result = validatePostalCode({
      countryCode: "CZ",
      rawInput: "ABCDE",
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "postal.invalid" })
    )
  })

  it.each([
    ["CZ", "12a345", "12A345"],
    ["SK", "12a345", "12A345"],
    ["US", "90210foo1234", "90210FOO1234"],
  ] satisfies readonly PostalFixture[])(
    "rejects letters in numeric %s postal codes before formatting",
    (countryCode, rawInput, displayValue) => {
      const result = validatePostalCode({
        countryCode,
        rawInput,
      })

      expect(result).toMatchObject({
        displayValue,
        isValid: false,
        normalizedValue: displayValue,
      })
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "postal.invalid" })
      )
    }
  )

  it.each([
    ["CZ", "123 45", "123 45"],
    ["SK", "811 01", "811 01"],
    ["PL", "12-345", "12-345"],
    ["US", "90210-1234", "90210-1234"],
  ] satisfies readonly PostalFixture[])(
    "allows documented %s postal separators in %s",
    (countryCode, rawInput, displayValue) => {
      expect(validatePostalCode({ countryCode, rawInput })).toMatchObject({
        displayValue,
        isValid: true,
      })
    }
  )

  it.each([
    ["CZ", "123-45", "123-45"],
    ["CZ", "1 23 45", "1 23 45"],
    ["PL", "12 345", "12 345"],
    ["US", "90210--1234", "90210--1234"],
  ] satisfies readonly PostalFixture[])(
    "rejects noisy numeric %s postal input %s before digit formatting",
    (countryCode, rawInput, displayValue) => {
      const result = validatePostalCode({ countryCode, rawInput })

      expect(result).toMatchObject({
        displayValue,
        isValid: false,
        normalizedValue: displayValue,
      })
      expect(result.errors).toContainEqual(
        expect.objectContaining({ code: "postal.invalid" })
      )
    }
  )

  it("does not force numeric input for alphanumeric or punctuated countries", () => {
    expect(getPostalInputHints("GB")).toMatchObject({ inputMode: "text" })
    expect(getPostalInputHints("CA")).toMatchObject({ inputMode: "text" })
    expect(getPostalInputHints("US")).toMatchObject({ inputMode: "text" })
  })
})

describe("validatePostalCodeEffect", () => {
  it.effect("succeeds with strict postal results", () =>
    Effect.gen(function* strictPostalSuccessProgram() {
      const result = yield* validatePostalCodeEffect({
        countryCode: "CZ",
        rawInput: "12345",
      })

      expect(result).toMatchObject({
        displayValue: "123 45",
        isValid: true,
      })
    })
  )

  it.effect("fails unknown or invalid postal codes with schema-backed errors", () =>
    Effect.gen(function* strictPostalFailureProgram() {
      const unknownCountryExit = yield* Effect.exit(
        validatePostalCodeEffect({ countryCode: "ZZ", rawInput: "12345" })
      )
      const invalidPostalExit = yield* Effect.exit(
        validatePostalCodeEffect({ countryCode: "CZ", rawInput: "abc" })
      )

      expect(Exit.isFailure(unknownCountryExit)).toBe(true)
      expect(Exit.isFailure(invalidPostalExit)).toBe(true)

      if (!Exit.isFailure(unknownCountryExit) || !Exit.isFailure(invalidPostalExit)) {
        return
      }

      expect(Cause.squash(unknownCountryExit.cause)).toMatchObject({
        _tag: "PostalValidationError",
        issues: [expect.objectContaining({ code: "postal.country_unsupported" })],
        result: expect.objectContaining({ isValid: "unknown" }),
      })
      expect(Cause.squash(invalidPostalExit.cause)).toBeInstanceOf(
        PostalValidationError
      )
    })
  )
})
