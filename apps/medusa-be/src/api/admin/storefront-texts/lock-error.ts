import type { MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"

const LOCK_TIMEOUT_MESSAGE = "Timed-out acquiring lock"

export const STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE =
  "Another storefront text operation is already running. Please try again shortly."

export function handleStorefrontTextLockError(
  error: unknown,
  res: MedusaResponse
): void {
  if (
    !(error instanceof Error && error.message.includes(LOCK_TIMEOUT_MESSAGE))
  ) {
    throw error
  }

  res.status(409).json({
    message: STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
    type: MedusaError.Types.CONFLICT,
  })
}
