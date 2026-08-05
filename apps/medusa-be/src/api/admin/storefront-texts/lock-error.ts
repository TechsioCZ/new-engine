import { MedusaError } from "@medusajs/framework/utils"

const LOCK_TIMEOUT_MESSAGE_PATTERN = /timed-out acquiring lock/i

// Medusa's redis locking provider rejects with a typed MedusaError, but the
// in-memory and postgres providers reject with a bare Error whose message is
// the only signal they expose. Prefer the discriminator, fall back to the
// documented provider message.
const isLockTimeoutError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  if (error instanceof MedusaError) {
    return error.type === MedusaError.Types.CONFLICT
  }

  return LOCK_TIMEOUT_MESSAGE_PATTERN.test(error.message)
}

export const STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE =
  "Another storefront text operation is already running. Please try again shortly."

export interface StorefrontTextLockErrorResponse {
  status: (code: number) => { json: (body: unknown) => unknown }
}

export function handleStorefrontTextLockError(
  error: unknown,
  res: StorefrontTextLockErrorResponse
): void {
  if (!isLockTimeoutError(error)) {
    throw error
  }

  res.status(409).json({
    message: STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
    type: MedusaError.Types.CONFLICT,
  })
}
