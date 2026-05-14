import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { decryptFields, encryptFields } from "../../../../src/utils/encryption"

// Valid 64-character hex key (32 bytes) - synthetic test value, not a real secret
// gitleaks:allow
const VALID_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

const encryptValue = (value: string): string => {
  const result = encryptFields({ value }, ["value"])
  const encrypted = result.value
  if (typeof encrypted !== "string") {
    throw new Error(`Expected string, got ${typeof encrypted}`)
  }
  return encrypted
}

const decryptValue = (value: string): string => {
  const result = decryptFields({ value }, ["value"])
  const decrypted = result.value
  if (typeof decrypted !== "string") {
    throw new Error(`Expected string, got ${typeof decrypted}`)
  }
  return decrypted
}

describe("encryption utilities", () => {
  const originalEnv = process.env.SETTINGS_ENCRYPTION_KEY

  afterEach(() => {
    if (originalEnv) {
      process.env.SETTINGS_ENCRYPTION_KEY = originalEnv
    } else {
      // biome-ignore lint/performance/noDelete: required to truly unset env var for testing
      delete process.env.SETTINGS_ENCRYPTION_KEY
    }
  })

  describe("key validation", () => {
    it.each([
      {
        scenario: "key is missing",
        key: undefined,
        expectedError: "SETTINGS_ENCRYPTION_KEY is required",
      },
      {
        scenario: "key is too short",
        key: "abc123",
        expectedError:
          "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (got length: 6)",
      },
      {
        scenario: "key is too long",
        key: `${VALID_KEY}extra`,
        expectedError:
          "SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (got length: 69)",
      },
    ])("throws error when $scenario", ({ key, expectedError }) => {
      if (key === undefined) {
        // biome-ignore lint/performance/noDelete: required to truly unset env var for testing
        delete process.env.SETTINGS_ENCRYPTION_KEY
      } else {
        process.env.SETTINGS_ENCRYPTION_KEY = key
      }

      expect(() => encryptFields({ value: "secret" }, ["value"])).toThrow(
        expectedError
      )
    })
  })

  describe("encryptFields / decryptFields", () => {
    beforeEach(() => {
      process.env.SETTINGS_ENCRYPTION_KEY = VALID_KEY
    })

    it("round-trips plaintext correctly", () => {
      const plaintext = "my-secret-api-key"

      const encrypted = encryptValue(plaintext)
      const decrypted = decryptValue(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it("produces different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "same-input"

      const encrypted1 = encryptValue(plaintext)
      const encrypted2 = encryptValue(plaintext)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it("leaves empty string unchanged", () => {
      const plaintext = ""

      const encrypted = encryptValue(plaintext)
      const decrypted = decryptValue(encrypted)

      expect(encrypted).toBe("")
      expect(decrypted).toBe(plaintext)
    })

    it("handles unicode characters", () => {
      const plaintext = "Příliš žluťoučký kůň úpěl ďábelské ódy 🔐"

      const encrypted = encryptValue(plaintext)
      const decrypted = decryptValue(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it("handles long strings", () => {
      const plaintext = "a".repeat(10_000)

      const encrypted = encryptValue(plaintext)
      const decrypted = decryptValue(encrypted)

      expect(decrypted).toBe(plaintext)
    })

    it("keeps tampered ciphertext unchanged", () => {
      const encrypted = encryptValue("secret")
      // Tamper with the ciphertext (flip a bit using XOR)
      const tampered = Buffer.from(encrypted, "base64")
      const tamperedIndex = 20
      // biome-ignore lint/suspicious/noBitwiseOperators: XOR is intentional for tampering test
      tampered[tamperedIndex] = (tampered[tamperedIndex] ?? 0) ^ 0xff
      const tamperedBase64 = tampered.toString("base64")

      expect(decryptValue(tamperedBase64)).toBe(tamperedBase64)
    })

    it("keeps truncated ciphertext unchanged", () => {
      const encrypted = encryptValue("secret")
      const truncated = encrypted.slice(0, 10)

      expect(decryptValue(truncated)).toBe(truncated)
    })

    it("encrypts specified string fields", () => {
      const data = {
        client_id: "public-id",
        client_secret: "secret-value",
        is_enabled: true,
      }

      const encrypted = encryptFields(data, ["client_secret"])
      const decrypted = decryptFields(encrypted, ["client_secret"])

      expect(decrypted.client_id).toBe("public-id")
      expect(decrypted.client_secret).toBe("secret-value")
      expect(decrypted.is_enabled).toBe(true)
    })

    it("skips null values", () => {
      const data = {
        field1: "value",
        field2: null,
      }

      const encrypted = encryptFields(data, ["field1", "field2"])
      const decrypted = decryptFields(encrypted, ["field1", "field2"])

      expect(decrypted.field1).toBe("value")
      expect(decrypted.field2).toBeNull()
    })

    it("skips empty strings", () => {
      const data = {
        field1: "value",
        field2: "",
      }

      const encrypted = encryptFields(data, ["field1", "field2"])
      const decrypted = decryptFields(encrypted, ["field1", "field2"])

      expect(decrypted.field1).toBe("value")
      expect(decrypted.field2).toBe("")
    })

    it("skips non-string values", () => {
      type MixedData = {
        name: string
        count: number
        active: boolean
      }

      const data: MixedData = {
        name: "test",
        count: 42,
        active: true,
      }

      const fields: (keyof MixedData)[] = ["name", "count", "active"]
      const encrypted = encryptFields(data, fields)
      const decrypted = decryptFields(encrypted, fields)

      expect(decrypted.name).toBe("test")
      expect(decrypted.count).toBe(42)
      expect(decrypted.active).toBe(true)
    })

    it("does not mutate original object", () => {
      const original = { secret: "value" }

      encryptFields(original, ["secret"])

      expect(original.secret).toBe("value")
    })
  })
})
