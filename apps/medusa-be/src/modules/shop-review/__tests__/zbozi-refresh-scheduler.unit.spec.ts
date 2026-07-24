import { afterEach, describe, expect, it, vi } from "vitest"
import { runZboziAccessTokenRefreshCycle } from "../loaders/bootstrap-zbozi-access-token-refresh"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  REFRESH_TOKEN_API_STORE_NAME,
  ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
  ZBOZI_TOKEN_URL,
} from "../zbozi-token"

const createLogger = () => ({
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
})

const createTimer = () => {
  const setTimer = vi.fn((_callback: () => void, _delay: number) => ({
    unref: vi.fn(),
  })) as unknown as typeof setTimeout

  return setTimer
}

describe("Zboží access token refresh scheduler", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("does not refresh immediately when the stored token expires outside the refresh window", async () => {
    const logger = createLogger()
    const setTimer = createTimer()
    const apiStoreService = {
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return {
            access_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
            api_key: "still-valid",
            name,
          }
        }
        throw new Error("refresh token store should not be read")
      }),
      upsertApiStoreConfigByName: vi.fn(),
    }
    const fetch = vi.fn()
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService: apiStoreService as never,
      logger: logger as never,
      setTimer,
    })

    expect(fetch).not.toHaveBeenCalled()
    expect(apiStoreService.upsertApiStoreConfigByName).not.toHaveBeenCalled()
    expect(setTimer).toHaveBeenCalledTimes(1)
    expect(setTimer).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Number)
    )
    expect(Number(setTimer.mock.calls[0]?.[1])).toBeGreaterThan(0)
  })

  it("refreshes immediately when the stored token expires inside the refresh window", async () => {
    const logger = createLogger()
    const setTimer = createTimer()
    const apiStoreService = {
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return {
            access_token_expires_at: new Date(Date.now() + 60 * 1000),
            api_key: "old-access-token",
            name,
          }
        }
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            credentials: null,
            name,
          }
        }
        return null
      }),
      upsertApiStoreConfigByName: vi.fn(),
    }
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        access_token: "new-access-token",
        expires_in: 3600,
      }),
      ok: true,
      status: 200,
    })
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService: apiStoreService as never,
      logger: logger as never,
      setTimer,
    })

    expect(fetch).toHaveBeenCalledWith(
      ZBOZI_TOKEN_URL,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer refresh-token",
        }),
        method: "POST",
      })
    )
    expect(apiStoreService.upsertApiStoreConfigByName).toHaveBeenCalledWith(
      expect.objectContaining({
        name: ACCESS_TOKEN_API_STORE_NAME,
        api_key: "new-access-token",
        is_internal: true,
      })
    )
    expect(setTimer).toHaveBeenCalledTimes(1)
  })

  it("schedules retry and logs when refresh fails", async () => {
    const logger = createLogger()
    const setTimer = createTimer()
    const apiStoreService = {
      retrieveApiStoreSecretsByName: vi.fn(async (name: string) => {
        if (name === ACCESS_TOKEN_API_STORE_NAME) {
          return null
        }
        if (name === REFRESH_TOKEN_API_STORE_NAME) {
          return {
            api_key: "refresh-token",
            credentials: null,
            name,
          }
        }
        return null
      }),
      upsertApiStoreConfigByName: vi.fn(),
    }
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ error: "bad" }),
      ok: false,
      status: 401,
    })
    vi.stubGlobal("fetch", fetch)

    await runZboziAccessTokenRefreshCycle({
      apiStoreService: apiStoreService as never,
      logger: logger as never,
      setTimer,
    })

    expect(logger.error).toHaveBeenCalledWith(
      "Zboží access token refresh failed",
      expect.any(Error)
    )
    expect(logger.warn).toHaveBeenCalledWith(
      `Zboží access token refresh retry scheduled in ${Math.round(ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS / 1000)} seconds.`
    )
    expect(setTimer).toHaveBeenCalledWith(
      expect.any(Function),
      ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS
    )
  })
})
