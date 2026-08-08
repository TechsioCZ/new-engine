import { sleep } from "@techsio/std/async"

const DEACTIVATED_SESSION_CLEANUP_TIMEOUT_MS = 3000

interface CleanupDeactivatedSessionInput {
  broadcastLogout: () => void
  clearToken: () => void
  logout: () => Promise<unknown>
  logoutProxy?: () => Promise<unknown>
}

const waitWithTimeout = async (
  promise: Promise<unknown>,
  timeoutMs: number,
) => {
  await Promise.race([promise, sleep(timeoutMs)])
}

export const cleanupDeactivatedSession = async ({
  broadcastLogout,
  clearToken,
  logout,
  logoutProxy,
}: CleanupDeactivatedSessionInput) => {
  const cleanupOperations = [logout()]

  if (logoutProxy) {
    cleanupOperations.push(logoutProxy())
  }

  try {
    await waitWithTimeout(
      Promise.allSettled(cleanupOperations),
      DEACTIVATED_SESSION_CLEANUP_TIMEOUT_MS,
    )
  } finally {
    clearToken()
    broadcastLogout()
  }
}
