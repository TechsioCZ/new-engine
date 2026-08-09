import type { LoaderOptions, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ApiStoreModuleService } from "../../api-store"
import { API_STORE_MODULE } from "../../api-store"
import {
  ACCESS_TOKEN_API_STORE_NAME,
  calculateNextRefreshDelayMs,
  refreshZboziAccessTokenStore,
  shouldRefreshZboziAccessToken,
  ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
} from "../zbozi-token"

const MAX_TIMER_DELAY_MS = 2_147_483_647

type Timer = ReturnType<typeof setTimeout> & { unref?: () => void }

type SchedulerOptions = {
  apiStoreService: ApiStoreModuleService
  logger: Logger
  setTimer?: typeof setTimeout
}

function scheduleTimer(
  callback: () => void,
  delayMs: number,
  setTimer: typeof setTimeout
) {
  const timer = setTimer(
    callback,
    Math.min(delayMs, MAX_TIMER_DELAY_MS)
  ) as Timer
  timer.unref?.()
  return timer
}

function runRefreshCycleInBackground(options: SchedulerOptions) {
  runZboziAccessTokenRefreshCycle(options).catch((error) => {
    options.logger.error(
      "Zboží access token refresh cycle crashed",
      error instanceof Error ? error : new Error(String(error))
    )
  })
}

export async function runZboziAccessTokenRefreshCycle({
  apiStoreService,
  logger,
  setTimer = setTimeout,
}: SchedulerOptions): Promise<void> {
  try {
    const current = await apiStoreService.retrieveApiStoreSecretsByName(
      ACCESS_TOKEN_API_STORE_NAME
    )
    if (
      current?.access_token_expires_at &&
      !shouldRefreshZboziAccessToken({
        expiresAt: current.access_token_expires_at,
      })
    ) {
      const delayMs = calculateNextRefreshDelayMs({
        expiresAt: current.access_token_expires_at,
        warn: (message) => logger.warn(message),
      })
      logger.info(
        `Zboží access token is still valid; scheduling refresh in ${Math.round(delayMs / 1000)} seconds.`
      )
      scheduleTimer(
        () =>
          runRefreshCycleInBackground({ apiStoreService, logger, setTimer }),
        delayMs,
        setTimer
      )
      return
    }

    const { expiresAt } = await refreshZboziAccessTokenStore({
      apiStoreService,
    })
    const delayMs = calculateNextRefreshDelayMs({
      expiresAt,
      warn: (message) => logger.warn(message),
    })

    logger.info(
      `Zboží access token refreshed; next refresh scheduled in ${Math.round(delayMs / 1000)} seconds.`
    )
    scheduleTimer(
      () => runRefreshCycleInBackground({ apiStoreService, logger, setTimer }),
      delayMs,
      setTimer
    )
  } catch (error) {
    logger.error(
      "Zboží access token refresh failed",
      error instanceof Error ? error : new Error(String(error))
    )
    logger.warn(
      `Zboží access token refresh retry scheduled in ${Math.round(ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS / 1000)} seconds.`
    )
    scheduleTimer(
      () => runRefreshCycleInBackground({ apiStoreService, logger, setTimer }),
      ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS,
      setTimer
    )
  }
}

export default async function bootstrapZboziAccessTokenRefresh({
  container,
}: LoaderOptions) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env.MEDUSA_DISABLE_ZBOZI_ACCESS_TOKEN_BOOTSTRAP === "1") {
    logger.info("Zboží access token refresh bootstrap disabled by environment.")
    return
  }

  try {
    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)
    runRefreshCycleInBackground({ apiStoreService, logger })
  } catch (error) {
    logger.error(
      `Failed to bootstrap ${ACCESS_TOKEN_API_STORE_NAME} refresh scheduler`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}
