import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import { Cause, Effect, Exit } from "effect"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "@effect/vitest"

import { validatePhoneNumber as validateDefaultPhoneNumber } from "../src/validation"
import { validatePhoneNumberEffect } from "../src/phone-strict-effect"
import {
  DEFAULT_PHONE_VALIDATION_MODE,
  getPhoneInputHints,
  getPhoneValidationModeContract,
  isPhoneValidationMode,
  liteResultToPhoneValidationResult,
  validatePhoneNumberLite,
} from "../src/phone-lite"
import { validatePhoneNumber } from "../src/phone-strict"
import { PhoneValidationError } from "../src/schemas"

type PhoneFixture = readonly [SmartSuggestCountryCode, string, string, string]

describe("validatePhoneNumber", () => {
  const validPhoneFixtures = [
    ["CZ", "+420 777 123 456", "+420777123456", "MOBILE"],
    ["SK", "+421 905 123 456", "+421905123456", "MOBILE"],
    ["AT", "+43 664 1234567", "+436641234567", "MOBILE"],
    ["HU", "+36 20 123 4567", "+36201234567", "MOBILE"],
    ["PL", "+48 512 345 678", "+48512345678", "MOBILE"],
    ["DE", "+49 1512 3456789", "+4915123456789", "MOBILE"],
    ["RO", "+40 721 234 567", "+40721234567", "MOBILE"],
    ["GB", "+44 7400 123456", "+447400123456", "MOBILE"],
    ["US", "+1 202 555 0125", "+12025550125", "FIXED_LINE_OR_MOBILE"],
    ["CA", "+1 416 555 0123", "+14165550123", "FIXED_LINE_OR_MOBILE"],
  ] satisfies readonly PhoneFixture[]

  it.each(
    validPhoneFixtures
  )("normalizes a valid %s phone", (defaultCountry, rawInput, e164, expectedType) => {
    expect(
      validatePhoneNumber({
        rawInput,
        defaultCountry,
        requireMobile: true,
      })
    ).toMatchObject({
      e164,
      isPossible: true,
      isValid: true,
      type: expectedType,
      errors: [],
    })
  })

  it("supports local numbers when a default country is provided", () => {
    expect(
      validatePhoneNumber({
        rawInput: "777 123 456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      e164: "+420777123456",
      detectedCountry: "CZ",
      isValid: true,
    })
  })

  it("supports pasted 00 international prefix values", () => {
    expect(
      validatePhoneNumber({
        rawInput: "00420777123456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      e164: "+420777123456",
      detectedCountry: "CZ",
      isValid: true,
    })
  })

  it("omits blank country hints instead of treating them as countries", () => {
    expect(
      validatePhoneNumber({
        allowedCountries: ["", "CZ"],
        defaultCountry: "",
        rawInput: "+420 777 123 456",
      })
    ).toMatchObject({
      detectedCountry: "CZ",
      e164: "+420777123456",
      errors: [],
      isValid: true,
    })
  })

  it("rejects fixed-line numbers when mobile is required", () => {
    const result = validatePhoneNumber({
      rawInput: "+420 222 111 222",
      defaultCountry: "CZ",
      requireMobile: true,
    })

    expect(result).toMatchObject({
      isPossible: true,
      isValid: false,
      type: "FIXED_LINE",
    })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.mobile_required" })
    )
  })

  it("reports country mismatch when selected country must match", () => {
    const result = validatePhoneNumber({
      rawInput: "+421 905 123 456",
      defaultCountry: "CZ",
      requireCountryMatch: true,
    })

    expect(result).toMatchObject({
      detectedCountry: "SK",
      isValid: false,
    })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.country_mismatch" })
    )
  })

  it("reports disallowed countries", () => {
    const result = validatePhoneNumber({
      rawInput: "+49 1512 3456789",
      allowedCountries: ["CZ", "SK"],
    })

    expect(result).toMatchObject({ detectedCountry: "DE", isValid: false })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.country_not_allowed" })
    )
  })

  it("returns structured errors for unknown or malformed input", () => {
    expect(validatePhoneNumber({ rawInput: "not a phone" })).toMatchObject({
      isPossible: false,
      isValid: false,
      errors: [expect.objectContaining({ field: "phone" })],
    })
  })

  it("can load the strict validator through a dynamic strict entrypoint import", async () => {
    const strictPhone = await import("../src/phone-strict")

    expect(
      strictPhone.validatePhoneNumber({
        rawInput: "+420 777 123 456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      e164: "+420777123456",
      isValid: true,
    })
  })

  it("keeps the root phone export lite and browser-safe", () => {
    expect(
      validateDefaultPhoneNumber({
        rawInput: "+420 777 123 456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      status: "strict_validation_required",
      canAttemptStrictValidation: true,
      errors: [],
    })
  })

  it("does not statically import strict phone metadata from root or lite sources", () => {
    const strictMetadataPackageName = ["libphonenumber", "js"].join("-")
    const rootSource = readFileSync(
      new URL("../src/validation.ts", import.meta.url),
      "utf8"
    )
    const liteSource = readFileSync(
      new URL("../src/phone-lite.ts", import.meta.url),
      "utf8"
    )

    expect(rootSource).not.toContain(strictMetadataPackageName)
    expect(rootSource).not.toContain("./phone-strict")
    expect(liteSource).not.toContain(strictMetadataPackageName)
  })
})

describe("validatePhoneNumberEffect", () => {
  it.effect("succeeds with strict phone results", () =>
    Effect.gen(function* strictPhoneSuccessProgram() {
      const result = yield* validatePhoneNumberEffect({
        rawInput: "+420 777 123 456",
        defaultCountry: "CZ",
      })

      expect(result).toMatchObject({
        e164: "+420777123456",
        isValid: true,
      })
    })
  )

  it.effect("fails invalid phones with a schema-backed error", () =>
    Effect.gen(function* strictPhoneFailureProgram() {
      const exit = yield* Effect.exit(
        validatePhoneNumberEffect({
          rawInput: "abc",
        })
      )

      expect(Exit.isFailure(exit)).toBe(true)

      if (!Exit.isFailure(exit)) {
        return
      }

      const failure = Cause.squash(exit.cause)

      expect(failure).toMatchObject({
        _tag: "PhoneValidationError",
        issues: [expect.objectContaining({ field: "phone" })],
        result: expect.objectContaining({ isValid: false }),
      })
      expect(failure).toBeInstanceOf(PhoneValidationError)
    })
  )
})

describe("phone validation mode contract", () => {
  it("defines server-only, lazy, and immediate mode behavior", () => {
    expect(DEFAULT_PHONE_VALIDATION_MODE).toBe("server-only")
    expect(isPhoneValidationMode("server-only")).toBe(true)
    expect(isPhoneValidationMode("frontend-lazy")).toBe(true)
    expect(isPhoneValidationMode("frontend-immediate")).toBe(true)
    expect(isPhoneValidationMode("frontend-strict")).toBe(false)

    expect(getPhoneValidationModeContract("server-only")).toMatchObject({
      strictValidationLoad: "none",
      serverValidation: "required",
      usesLiteValidationFirst: true,
    })
    expect(getPhoneValidationModeContract("frontend-lazy")).toMatchObject({
      strictValidationLoad: "lazy",
      serverValidation: "fallback",
      usesLiteValidationFirst: true,
    })
    expect(getPhoneValidationModeContract("frontend-immediate")).toMatchObject({
      strictValidationLoad: "immediate",
      serverValidation: "optional",
      usesLiteValidationFirst: false,
    })
  })

  it("exposes native phone input hints for server-only forms", () => {
    expect(getPhoneInputHints()).toEqual({
      type: "tel",
      autoComplete: "tel",
      inputMode: "tel",
    })
  })

  it("keeps lite validation cheap and never claims strict validity", () => {
    const result = validatePhoneNumberLite({
      rawInput: "+420 777 123 456",
      defaultCountry: "CZ",
    })

    expect(result).toMatchObject({
      normalizedDigits: "420777123456",
      status: "strict_validation_required",
      canAttemptStrictValidation: true,
      requiresStrictValidation: true,
      errors: [],
    })
    expect("isValid" in result).toBe(false)
    expect("e164" in result).toBe(false)
  })

  it("rejects malformed values before strict validation is attempted", () => {
    const result = validatePhoneNumberLite({ rawInput: "not a phone" })

    expect(result).toMatchObject({
      status: "malformed",
      canAttemptStrictValidation: false,
      requiresStrictValidation: false,
    })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.invalid_shape" })
    )
  })

  it("converts lite validation results through the canonical public result mapper", () => {
    const strictRequired = validatePhoneNumberLite({
      rawInput: "+420 777 123 456",
      defaultCountry: "CZ",
    })
    const malformed = validatePhoneNumberLite({ rawInput: "not a phone" })

    expect(liteResultToPhoneValidationResult(strictRequired)).toMatchObject({
      displayValue: "+420 777 123 456",
      errors: [],
      isPossible: true,
      isValid: false,
      rawInput: "+420 777 123 456",
    })
    expect(
      liteResultToPhoneValidationResult(strictRequired, {
        omitWhenStrictValidationRequired: true,
      })
    ).toBeUndefined()
    expect(
      liteResultToPhoneValidationResult(malformed, {
        omitWhenStrictValidationRequired: true,
      })
    ).toMatchObject({
      errors: [expect.objectContaining({ code: "phone.invalid_shape" })],
      isPossible: false,
      isValid: false,
    })
  })
})
