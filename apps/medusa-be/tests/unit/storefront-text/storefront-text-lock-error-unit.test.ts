import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it, vi } from "vitest"

import {
  handleStorefrontTextLockError,
  STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
} from "../../../src/api/admin/storefront-texts/lock-error"

const createResponse = () => {
  const json = vi.fn<(body: unknown) => unknown>()
  const status = vi.fn<(code: number) => { json: typeof json }>(() => ({
    json,
  }))
  return { json, res: { status }, status }
}

const expectLockConflict = (error: Error) => {
  const response = createResponse()
  handleStorefrontTextLockError(error, response.res)
  expect(response.status).toHaveBeenCalledWith(409)
  expect(response.json).toHaveBeenCalledWith({
    message: STOREFRONT_TEXT_LOCK_CONFLICT_MESSAGE,
    type: MedusaError.Types.CONFLICT,
  })
}

const expectRethrow = (expectedError: unknown) => {
  const response = createResponse()
  let caughtError: unknown
  try {
    handleStorefrontTextLockError(expectedError, response.res)
  } catch (error) {
    caughtError = error
  }
  expect(caughtError).toBe(expectedError)
  expect(response.status).not.toHaveBeenCalled()
  expect(response.json).not.toHaveBeenCalled()
}

describe("storefront text lock error handling", () => {
  it("returns a useful conflict for a generic lock timeout", () => {
    expect.assertions(2)
    expectLockConflict(new Error("Timed-out acquiring lock."))
  })

  it("returns a useful conflict for a typed lock timeout", () => {
    expect.assertions(2)
    expectLockConflict(
      new MedusaError(MedusaError.Types.CONFLICT, "Timed-out acquiring lock."),
    )
  })

  it("rethrows an unrelated error", () => {
    expect.assertions(3)
    expectRethrow(new Error("Workflow failed"))
  })

  it("rethrows a non-error value", () => {
    expect.assertions(3)
    expectRethrow("Timed-out acquiring lock.")
  })
})
