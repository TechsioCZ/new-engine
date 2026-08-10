import { setTimeout as delay } from "node:timers/promises"

import type { ILockingModule } from "@medusajs/framework/types"

type LockExecutionResult<T> =
  | { status: "executed"; value: T }
  | { status: "timed_out" }

class LockAcquisitionTimeoutError extends Error {
  override readonly name = "LockAcquisitionTimeoutError"
}

const MILLISECONDS_PER_SECOND = 1000

// The provider backstop must lose the race against the wrapper timer, or its
// plain rejection escapes instead of normalizing into the typed timed_out
// result (same pattern as the PPL rate-limit wrapper's provider deadline).
const PROVIDER_TIMEOUT_BUFFER_SECONDS = 5

export const executeWithLockTimeout = async <T>(
  lockingModule: Pick<ILockingModule, "execute">,
  key: string,
  timeoutSeconds: number,
  job: () => Promise<T>,
): Promise<LockExecutionResult<T>> => {
  const timeoutError = new LockAcquisitionTimeoutError()
  let callbackStarted = false
  let timedOut = false
  const execution = lockingModule.execute(
    key,
    async () => {
      if (timedOut) {
        throw timeoutError
      }

      callbackStarted = true
      return await job()
    },
    { timeout: timeoutSeconds + PROVIDER_TIMEOUT_BUFFER_SECONDS },
  )
  const waitForTimeout = async (): Promise<T> => {
    await delay(timeoutSeconds * MILLISECONDS_PER_SECOND, undefined, {
      ref: false,
    })
    if (!callbackStarted) {
      timedOut = true
      throw timeoutError
    }

    return await execution
  }
  const timeout = waitForTimeout()

  try {
    const value = await Promise.race([execution, timeout])
    return { status: "executed", value }
  } catch (error) {
    if (error === timeoutError) {
      return { status: "timed_out" }
    }

    throw error
  }
}
