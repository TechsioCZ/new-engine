import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import {
  handleStorefrontTextLockError,
  STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
} from "../../../src/api/admin/storefront-texts/lock-error"

const createResponse = () => {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))

  return { json, res: { status }, status }
}

describe("storefront text lock error handling", () => {
  it.each([
    new Error("Timed-out acquiring lock."),
    new MedusaError(MedusaError.Types.CONFLICT, "Timed-out acquiring lock."),
  ])("returns a useful conflict for a lock timeout", (error) => {
    const response = createResponse()

    handleStorefrontTextLockError(error, response.res)

    expect(response.status).toHaveBeenCalledWith(409)
    expect(response.json).toHaveBeenCalledWith({
      message: STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
      type: MedusaError.Types.CONFLICT,
    })
  })

  it.each([new Error("Workflow failed"), "Timed-out acquiring lock."])(
    "rethrows unrelated errors",
    (error) => {
      const response = createResponse()

      expect(() => {
        handleStorefrontTextLockError(error, response.res)
      }).toThrow(error)
      expect(response.status).not.toHaveBeenCalled()
      expect(response.json).not.toHaveBeenCalled()
    },
  )
})
