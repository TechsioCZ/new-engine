import { timingSafeEqual } from "node:crypto"
import type { MedusaRequest } from "@medusajs/framework/http"

export function getHeaderValue(
  req: MedusaRequest,
  name: string
): string | undefined {
  const value = req.headers[name]
  if (Array.isArray(value)) {
    return value[0]
  }
  return value
}

/**
 * Validates a webhook signature using constant-time comparison.
 *
 * Note: This function compares two signature strings directly. The caller is
 * responsible for computing the expected signature (e.g., HMAC(payload, secret))
 * before calling this function.
 *
 * @param signature - The signature received in the webhook request header
 * @param expectedSignature - The signature computed from the payload and shared secret
 * @returns true if the signatures match, false otherwise
 */
export function isValidWebhookSignature(
  signature: string | undefined,
  expectedSignature: string | undefined
): boolean {
  if (!expectedSignature || !signature) {
    return false
  }
  // Both are hex-encoded SHA-256 digests (64 chars); length mismatch means no match
  if (signature.length !== expectedSignature.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
