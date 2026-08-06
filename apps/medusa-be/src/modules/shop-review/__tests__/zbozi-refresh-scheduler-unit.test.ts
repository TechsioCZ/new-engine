import type { Logger } from "@medusajs/framework/types"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { ApiStoreModuleService, ApiStoreSecretDTO } from "../../api-store"
import { runZboziAccessTokenRefreshCycle } from "../loaders/bootstrap-zbozi-access-token-refresh"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  REFRESH_TOKEN_API_STORE_NAME,
  ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
  ZBOZI_TOKEN_URL,
} from "../zbozi-token"

/**
 * Asserts that a plain mock object contains the given keys before narrowing
 * it to a framework type. Building the mock as `unknown` first (instead of
 * the target type) avoids requiring every property of the huge module
 * service, logger, and DTO interfaces while still validating the shape the
 * scheduler actually reads from at runtime.
 */
const assertMockShape: <T>(
  candidate: unknown,
  requiredKeys: readonly (keyof T)[],
) => asserts candidate is T = (candidate, requiredKeys) => {
  if (
    candidate === null ||
    (typeof candidate !== "object" && typeof candidate !== "function")
  ) {
    throw new TypeError("Expected a mock object")
  }

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new TypeError(`Mock object missing required key: ${String(key)}`)
    }
  }
}

const createApiStoreSecret = (
  candidate: unknown,
  requiredKeys: readonly (keyof ApiStoreSecretDTO)[],
): ApiStoreSecretDTO => {
  assertMockShape<ApiStoreSecretDTO>(candidate, requiredKeys)
  return candidate
}

const createApiStoreService = (
  retrieveApiStoreSecretsByName: ApiStoreModuleService["retrieveApiStoreSecretsByName"],
  upsertApiStoreConfigByName: ApiStoreModuleService["upsertApiStoreConfigByName"],
): ApiStoreModuleService => {
  const candidate: unknown = {
    retrieveApiStoreSecretsByName,
    upsertApiStoreConfigByName,
  }
  assertMockShape<ApiStoreModuleService>(candidate, [
    "retrieveApiStoreSecretsByName",
    "upsertApiStoreConfigByName",
  ])
  return candidate
}

const createLogger = () => {
  const error = vi.fn<Logger["error"]>()
  const info = vi.fn<Logger["info"]>()
  const warn = vi.fn<Logger["warn"]>()
  const candidate: unknown = { error, info, warn }
  assertMockShape<Logger>(candidate, ["error", "info", "warn"])
  return { error, info, logger: candidate, warn }
}

const createMockTimeout = (): NodeJS.Timeout => {
  const candidate: unknown = { unref: vi.fn<() => void>() }
  assertMockShape<NodeJS.Timeout>(candidate, ["unref"])
  return candidate
}

type SetTimerFn = (callback: () => void, delayMs: number) => NodeJS.Timeout

const createTimer = () =>
  vi.fn<SetTimerFn>((_callback, _delay) => createMockTimeout())

/**
 * `typeof setTimeout` merges the callable signature with the
 * `node:timers/promises` namespace member, which a plain test double never
 * needs to implement. Narrowing through `unknown` keeps the scheduler option
 * fully typed while only requiring the callable shape the loader invokes.
 */
const asSchedulerSetTimer = (candidate: SetTimerFn): typeof setTimeout => {
  const target: unknown = candidate
  assertMockShape<typeof setTimeout>(target, [])
  return target
}

interface MockFetchResponse {
  json: () => Promise<unknown>
  ok: boolean
  status: number
}

const createFetch = () =>
  vi.fn<(url: string, init: unknown) => Promise<MockFetchResponse>>()

describe("Zboží access token refresh scheduler", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("does not refresh immediately when the stored token expires outside the refresh window", async () => {
    const { logger } = createLogger()
    const setTimer = createTimer()
    const upsertApiStoreConfigByName =
      vi.fn<ApiStoreModuleService["upsertApiStoreConfigByName"]>()
    const apiStoreService = createApiStoreService(
      vi.fn<ApiStoreModuleService["retrieveApiStoreSecretsByName"]>(
        async (name) => {
          await Promise.resolve()
          if (name === ACCESS_TOKEN_API_STORE_NAME) {
            return createApiStoreSecret(
              {
                access_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
                api_key: "still-valid",
                name,
              },
              ["access_token_expires_at"],
            )
          }
          throw new Error("refresh token store should not be read")
        },
      ),
      upsertApiStoreConfigByName,
    )
    const fetch = createFetch()
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService,
      logger,
      setTimer: asSchedulerSetTimer(setTimer),
    })

    expect(fetch).not.toHaveBeenCalled()
    expect(upsertApiStoreConfigByName).not.toHaveBeenCalled()
    expect(setTimer).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      expect.any(Number),
    )
    expect(Number(setTimer.mock.calls[0]?.[1])).toBeGreaterThan(0)
  })

  it("refreshes immediately when the stored token expires inside the refresh window", async () => {
    const { logger } = createLogger()
    const setTimer = createTimer()
    const upsertApiStoreConfigByName =
      vi.fn<ApiStoreModuleService["upsertApiStoreConfigByName"]>()
    const apiStoreService = createApiStoreService(
      vi.fn<ApiStoreModuleService["retrieveApiStoreSecretsByName"]>(
        async (name) => {
          await Promise.resolve()
          if (name === ACCESS_TOKEN_API_STORE_NAME) {
            return createApiStoreSecret(
              {
                access_token_expires_at: new Date(Date.now() + 60 * 1000),
                api_key: "old-access-token",
                name,
              },
              ["access_token_expires_at"],
            )
          }
          if (name === REFRESH_TOKEN_API_STORE_NAME) {
            return createApiStoreSecret(
              {
                api_key: "refresh-token",
                credentials: null,
                name,
              },
              ["api_key", "credentials"],
            )
          }
          return null
        },
      ),
      upsertApiStoreConfigByName,
    )
    const fetch = createFetch()
    fetch.mockResolvedValue({
      json: vi
        .fn<() => Promise<{ access_token: string; expires_in: number }>>()
        .mockResolvedValue({
          access_token: "new-access-token",
          expires_in: 3600,
        }),
      ok: true,
      status: 200,
    })
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService,
      logger,
      setTimer: asSchedulerSetTimer(setTimer),
    })

    expect(fetch).toHaveBeenCalledWith(
      ZBOZI_TOKEN_URL,
      expect.objectContaining({ method: "POST" }),
    )
    const [, fetchInit] = fetch.mock.calls[0] ?? []
    expect(fetchInit).toMatchObject({
      headers: { authorization: "Bearer refresh-token" },
    })
    expect(upsertApiStoreConfigByName).toHaveBeenCalledWith(
      expect.objectContaining({
        api_key: "new-access-token",
        is_internal: true,
        name: ACCESS_TOKEN_API_STORE_NAME,
      }),
    )
    expect(setTimer).toHaveBeenCalledOnce()
  })

  it("schedules retry and logs when refresh fails", async () => {
    const { error: loggerError, logger, warn: loggerWarn } = createLogger()
    const setTimer = createTimer()
    const upsertApiStoreConfigByName =
      vi.fn<ApiStoreModuleService["upsertApiStoreConfigByName"]>()
    const apiStoreService = createApiStoreService(
      vi.fn<ApiStoreModuleService["retrieveApiStoreSecretsByName"]>(
        async (name) => {
          await Promise.resolve()
          if (name === ACCESS_TOKEN_API_STORE_NAME) {
            return null
          }
          if (name === REFRESH_TOKEN_API_STORE_NAME) {
            return createApiStoreSecret(
              {
                api_key: "refresh-token",
                credentials: null,
                name,
              },
              ["api_key", "credentials"],
            )
          }
          return null
        },
      ),
      upsertApiStoreConfigByName,
    )
    const fetch = createFetch()
    fetch.mockResolvedValue({
      json: vi.fn<() => Promise<{ error: string }>>().mockResolvedValue({
        error: "bad",
      }),
      ok: false,
      status: 401,
    })
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService,
      logger,
      setTimer: asSchedulerSetTimer(setTimer),
    })

    expect(loggerError).toHaveBeenCalledWith(
      "Zboží access token refresh failed",
      expect.any(Error),
    )
    expect(loggerWarn).toHaveBeenCalledWith(
      `Zboží access token refresh retry scheduled in ${Math.round(ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS / 1000)} seconds.`,
    )
    expect(setTimer).toHaveBeenCalledWith(
      expect.any(Function),
      ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
    )
  })
})
