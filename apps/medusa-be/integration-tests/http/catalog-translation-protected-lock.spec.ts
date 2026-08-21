import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { describe, expect, it, vi } from "vitest"
import { PROTECTED_DATABASE_TABLE_LOCK } from "../../src/scripts/catalog-translation-pipeline/runtime"

vi.setConfig({ testTimeout: 60_000 })

medusaIntegrationTestRunner({
  inApp: true,
  testSuite: ({ dbConnection }) => {
    describe("catalog translation protected table lock", () => {
      it("blocks protected DML on a second PostgreSQL connection", async () => {
        let releaseFirstTransaction: (() => void) | undefined
        let reportFirstLock: (() => void) | undefined
        const firstLockAcquired = new Promise<void>((resolve) => {
          reportFirstLock = resolve
        })
        const holdFirstTransaction = new Promise<void>((resolve) => {
          releaseFirstTransaction = resolve
        })
        const first = dbConnection.transaction(async (transaction: any) => {
          await transaction.raw(PROTECTED_DATABASE_TABLE_LOCK)
          reportFirstLock?.()
          await holdFirstTransaction
        })
        await firstLockAcquired

        let protectedUpdateCompleted = false
        const second = dbConnection.transaction(async (transaction: any) => {
          await transaction.raw("update product set title = title where false")
          protectedUpdateCompleted = true
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
        expect(protectedUpdateCompleted).toBe(false)

        releaseFirstTransaction?.()
        await Promise.all([first, second])
        expect(protectedUpdateCompleted).toBe(true)
      })
    })
  },
})
