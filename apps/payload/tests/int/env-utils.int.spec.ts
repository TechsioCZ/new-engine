import { afterEach, describe, expect, it } from "vitest"

import {
  getDocString,
  getEnv,
  getEnvString,
  isEnabled,
  resolveEnvLocales,
} from "@/lib/utils/env"

const ORIGINAL_ENV = { ...process.env }

const resetEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key]
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === "string") {
      process.env[key] = value
    }
  }
}

afterEach(() => {
  resetEnv()
})

describe("env utilities", () => {
  describe(getEnv, () => {
    it("returns the value when environment variable is set", () => {
      process.env.TEST_VAR = "test-value"
      expect(getEnv("TEST_VAR")).toBe("test-value")
    })

    it("returns undefined when environment variable is not set", () => {
      // delete required to unset env vars in Node.js
      delete process.env.TEST_VAR
      expect(getEnv("TEST_VAR")).toBeUndefined()
    })

    it("throws when required variable is missing", () => {
      // delete required to unset env vars in Node.js
      delete process.env.REQUIRED_VAR
      expect(() => getEnv("REQUIRED_VAR", true)).toThrow(
        "Missing required environment variable: REQUIRED_VAR"
      )
    })

    it("throws when required variable is empty string", () => {
      process.env.REQUIRED_VAR = ""
      expect(() => getEnv("REQUIRED_VAR", true)).toThrow(
        "Missing required environment variable: REQUIRED_VAR"
      )
    })

    it("throws when required variable is whitespace only", () => {
      process.env.REQUIRED_VAR = "   "
      expect(() => getEnv("REQUIRED_VAR", true)).toThrow(
        "Missing required environment variable: REQUIRED_VAR"
      )
    })

    it("returns value when required variable is set", () => {
      process.env.REQUIRED_VAR = "valid-value"
      expect(getEnv("REQUIRED_VAR", true)).toBe("valid-value")
    })

    it("returns empty string when not required and set to empty", () => {
      process.env.TEST_VAR = ""
      expect(getEnv("TEST_VAR")).toBe("")
    })
  })

  describe(getEnvString, () => {
    it("returns the value when environment variable is set", () => {
      process.env.STRING_VAR = "hello"
      expect(getEnvString("STRING_VAR")).toBe("hello")
    })

    it("returns null when environment variable is not set", () => {
      // delete required to unset env vars in Node.js
      delete process.env.STRING_VAR
      expect(getEnvString("STRING_VAR")).toBeNull()
    })

    it('returns null when value is "null" string', () => {
      process.env.STRING_VAR = "null"
      expect(getEnvString("STRING_VAR")).toBeNull()
    })

    it('returns null when value is "undefined" string', () => {
      process.env.STRING_VAR = "undefined"
      expect(getEnvString("STRING_VAR")).toBeNull()
    })

    it("returns null when value is empty string", () => {
      process.env.STRING_VAR = ""
      expect(getEnvString("STRING_VAR")).toBeNull()
    })

    it('returns actual value that happens to contain "null"', () => {
      process.env.STRING_VAR = "not-null-value"
      expect(getEnvString("STRING_VAR")).toBe("not-null-value")
    })
  })

  it("isEnabled honors defaults and explicit false values", () => {
    // delete required to unset env vars in Node.js
    delete process.env.TEST_FLAG
    expect(isEnabled("TEST_FLAG", true)).toBeTruthy()
    expect(isEnabled("TEST_FLAG", false)).toBeFalsy()

    process.env.TEST_FLAG = "false"
    expect(isEnabled("TEST_FLAG")).toBeFalsy()

    process.env.TEST_FLAG = "  OFF "
    expect(isEnabled("TEST_FLAG")).toBeFalsy()

    process.env.TEST_FLAG = "yes"
    expect(isEnabled("TEST_FLAG")).toBeTruthy()
  })

  it("resolveEnvLocales uses cleaned locales and first locale as default", () => {
    process.env.TEST_LOCALES = "cs, en, , sk "

    expect(resolveEnvLocales("TEST_LOCALES")).toStrictEqual({
      defaultLocale: "cs",
      locales: ["cs", "en", "sk"],
    })
  })

  it("resolveEnvLocales falls back to a non-empty locale list", () => {
    Reflect.deleteProperty(process.env, "TEST_LOCALES")

    expect(resolveEnvLocales("TEST_LOCALES")).toStrictEqual({
      defaultLocale: "en",
      locales: ["en"],
    })
    expect(resolveEnvLocales("TEST_LOCALES", [])).toStrictEqual({
      defaultLocale: "en",
      locales: ["en"],
    })
  })

  it("getDocString returns only string values", () => {
    expect(getDocString("hello")).toBe("hello")
    expect(getDocString(null)).toBe("")
    expect(getDocString(42)).toBe("")
  })
})
