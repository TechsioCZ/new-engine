import type { ILockingModule } from "@medusajs/framework/types"

type LockExecutionResult<T> =
  | { status: "executed"; value: T }
  | { status: "timed_out" }

class LockAcquisitionTimeoutError extends Error {}

const MILLISECONDS_PER_SECOND = 1000

export async function executeWithLockTimeout<T>(
  lockingModule: Pick<ILockingModule, "execute">,
  key: string,
  timeoutSeconds: number,
  job: () => Promise<T>
): Promise<LockExecutionResult<T>> {
  const timeoutError = new LockAcquisitionTimeoutError()
  let callbackStarted = false
  let timedOut = false
  let timeoutHandle: NodeJS.Timeout | undefined

  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      if (!callbackStarted) {
        timedOut = true
        reject(timeoutError)
      }
    }, timeoutSeconds * MILLISECONDS_PER_SECOND)
    timeoutHandle.unref()
  })

  const execution = lockingModule.execute(
    key,
    async () => {
      if (timedOut) {
        throw timeoutError
      }

      callbackStarted = true
      return await job()
    },
    { timeout: timeoutSeconds }
  )

  try {
    const value = await Promise.race([execution, timeout])
    return { status: "executed", value }
  } catch (error) {
    if (error === timeoutError) {
      return { status: "timed_out" }
    }

    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}
