import { afterEach, describe, expect, it } from "vitest"
import {
  getDocString,
  getEnv,
  getEnvString,
  isEnabled,
  parseEnvList,
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
  describe("getEnv", () => {
    it("returns the value when environment variable is set", () => {
      process.env.TEST_VAR = "test-value"
      expect(getEnv("TEST_VAR")).toBe("test-value")
    })

    it("returns undefined when environment variable is not set", () => {
      // biome-ignore lint/performance/noDelete: delete required to unset env vars in Node.js
      delete process.env.TEST_VAR
      expect(getEnv("TEST_VAR")).toBeUndefined()
    })

    it("throws when required variable is missing", () => {
      // biome-ignore lint/performance/noDelete: delete required to unset env vars in Node.js
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

  describe("getEnvString", () => {
    it("returns the value when environment variable is set", () => {
      process.env.STRING_VAR = "hello"
      expect(getEnvString("STRING_VAR")).toBe("hello")
    })

    it("returns null when environment variable is not set", () => {
      // biome-ignore lint/performance/noDelete: delete required to unset env vars in Node.js
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
    // biome-ignore lint/performance/noDelete: delete required to unset env vars in Node.js
    delete process.env.TEST_FLAG
    expect(isEnabled("TEST_FLAG", true)).toBe(true)
    expect(isEnabled("TEST_FLAG", false)).toBe(false)

    process.env.TEST_FLAG = "false"
    expect(isEnabled("TEST_FLAG")).toBe(false)

    process.env.TEST_FLAG = "  OFF "
    expect(isEnabled("TEST_FLAG")).toBe(false)

    process.env.TEST_FLAG = "yes"
    expect(isEnabled("TEST_FLAG")).toBe(true)
  })

  it("parseEnvList returns a cleaned list", () => {
    process.env.TEST_LIST = "en, cs , , sk "
    expect(parseEnvList("TEST_LIST")).toEqual(["en", "cs", "sk"])

    // biome-ignore lint/performance/noDelete: delete required to unset env vars in Node.js
    delete process.env.TEST_LIST
    expect(parseEnvList("TEST_LIST")).toEqual([])
  })

  it("getDocString returns only string values", () => {
    expect(getDocString("hello")).toBe("hello")
    expect(getDocString(null)).toBe("")
    expect(getDocString(42)).toBe("")
  })
})
