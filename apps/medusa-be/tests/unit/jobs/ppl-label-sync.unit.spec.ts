import { describe, expect, it } from "vitest"

import {
  checkTimeoutConditions,
  MAX_PENDING_AGE_MS,
  MAX_SYNC_ATTEMPTS,
  type PendingFulfillment,
  type SyncAttemptInfo,
} from "../../../src/modules/ppl-client/utils"

const createFulfillment = (
  overrides: Partial<PendingFulfillment> = {}
): PendingFulfillment => ({
  id: "ful_123",
  data: {
    status: "pending",
    batch_id: "batch_123",
    product_type: "PRIV",
  },
  created_at: new Date().toISOString(),
  provider_id: "ppl_ppl",
  ...overrides,
})

const createAttemptInfo = (
  overrides: Partial<SyncAttemptInfo> = {}
): SyncAttemptInfo => ({
  syncAttempts: 1,
  firstSyncAttempt: new Date().toISOString(),
  now: new Date().toISOString(),
  ...overrides,
})

describe("ppl-label-sync", () => {
  describe("checkTimeoutConditions", () => {
    it("returns null when within limits", () => {
      const fulfillment = createFulfillment()
      const attemptInfo = createAttemptInfo({ syncAttempts: 5 })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result).toBeNull()
    })

    it("returns error when max sync attempts exceeded", () => {
      const fulfillment = createFulfillment()
      const attemptInfo = createAttemptInfo({ syncAttempts: MAX_SYNC_ATTEMPTS })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result).not.toBeNull()
      expect(result?.reason).toContain("max sync attempts")
      expect(result?.message).toContain(`${MAX_SYNC_ATTEMPTS} attempts`)
    })

    it("returns error when pending for over 24 hours", () => {
      const oldDate = new Date(Date.now() - MAX_PENDING_AGE_MS - 1000) // 24h + 1s ago
      const fulfillment = createFulfillment({
        created_at: oldDate.toISOString(),
      })
      const attemptInfo = createAttemptInfo({ syncAttempts: 5 })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result).not.toBeNull()
      expect(result?.reason).toContain("24 hours")
      expect(result?.message).toContain("24 hours")
    })

    it("returns null when just under 24 hours", () => {
      const almostOldDate = new Date(Date.now() - MAX_PENDING_AGE_MS + 60_000) // 24h - 1min
      const fulfillment = createFulfillment({
        created_at: almostOldDate.toISOString(),
      })
      const attemptInfo = createAttemptInfo({ syncAttempts: 5 })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result).toBeNull()
    })

    it("returns null when just under max attempts", () => {
      const fulfillment = createFulfillment()
      const attemptInfo = createAttemptInfo({
        syncAttempts: MAX_SYNC_ATTEMPTS - 1,
      })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result).toBeNull()
    })

    it("includes batch_id in error message", () => {
      const fulfillment = createFulfillment({
        data: {
          status: "pending",
          batch_id: "test_batch_xyz",
          product_type: "PRIV",
        },
      })
      const attemptInfo = createAttemptInfo({ syncAttempts: MAX_SYNC_ATTEMPTS })

      const result = checkTimeoutConditions(fulfillment, attemptInfo)

      expect(result?.message).toContain("test_batch_xyz")
    })
  })
})
