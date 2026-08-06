import crypto from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const HEX_KEY_REGEX = /^[0-9a-fA-F]{64}$/u

/**
 * Gets the encryption key from environment variable.
 * The key must be a 64-character hex string (32 bytes).
 */
const getEncryptionKey = (): Buffer => {
  const keyHex = process.env["SETTINGS_ENCRYPTION_KEY"]
  if (keyHex === undefined || keyHex.length === 0) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "SETTINGS_ENCRYPTION_KEY is required. Generate with: openssl rand -hex 32",
    )
  }
  if (!HEX_KEY_REGEX.test(keyHex)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `SETTINGS_ENCRYPTION_KEY must be a 64-character hex string (got length: ${keyHex.length}). Generate with: openssl rand -hex 32`,
    )
  }
  return Buffer.from(keyHex, "hex")
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
const encrypt = (plaintext: string): string => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Combine: IV (12 bytes) + ciphertext + auth tag (16 bytes)
  const combined = Buffer.concat([iv, ciphertext, authTag])

  return combined.toString("base64")
}

/**
 * Decrypts a base64-encoded ciphertext string.
 * Expects format: IV (12 bytes) + ciphertext + auth tag (16 bytes).
 */
const decrypt = (ciphertext: string): string => {
  const key = getEncryptionKey()
  const combined = Buffer.from(ciphertext, "base64")

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encryptedData = combined.subarray(
    IV_LENGTH,
    combined.length - AUTH_TAG_LENGTH,
  )

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]).toString("utf-8")
}

/**
 * Encrypts specified fields in an object.
 * Only encrypts non-null string values.
 */
export const encryptFields = <T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
): T => {
  const result = { ...data }

  for (const field of fields) {
    const value: unknown = result[field]
    if (typeof value === "string" && value.length > 0) {
      Object.assign(result, { [field]: encrypt(value) })
    }
  }

  return result
}

/**
 * Decrypts specified fields in an object.
 * Only decrypts non-null string values.
 */
export const decryptFields = <T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
): T => {
  const result = { ...data }

  for (const field of fields) {
    const value: unknown = result[field]
    if (typeof value === "string" && value.length > 0) {
      try {
        Object.assign(result, { [field]: decrypt(value) })
      } catch {
        // If decryption fails, the value might not be encrypted (legacy data)
        // Keep the original value
      }
    }
  }

  return result
}
