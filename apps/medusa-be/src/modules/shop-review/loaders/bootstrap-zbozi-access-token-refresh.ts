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

interface SchedulerOptions {
  apiStoreService: ApiStoreModuleService
  logger: Logger
  setTimer?: typeof setTimeout
}

const scheduleTimer = (
  task: () => void,
  delayMs: number,
  setTimer: typeof setTimeout,
) => {
  const timer = setTimer(task, Math.min(delayMs, MAX_TIMER_DELAY_MS))
  if (
    typeof timer === "object" &&
    timer !== null &&
    "unref" in timer &&
    typeof timer.unref === "function"
  ) {
    timer.unref()
  }
  return timer
}

export const runZboziAccessTokenRefreshCycle = async ({
  apiStoreService,
  logger,
  setTimer = setTimeout,
}: SchedulerOptions): Promise<void> => {
  const scheduleNextCycle = (delayMs: number) => {
    scheduleTimer(
      () => {
        const runInBackground = async () => {
          try {
            await runZboziAccessTokenRefreshCycle({
              apiStoreService,
              logger,
              setTimer,
            })
          } catch (error) {
            logger.error(
              "Zboží access token refresh cycle crashed",
              error instanceof Error ? error : new Error(String(error)),
            )
          }
        }
        void runInBackground()
      },
      delayMs,
      setTimer,
    )
  }

  try {
    const current = await apiStoreService.retrieveApiStoreSecretsByName(
      ACCESS_TOKEN_API_STORE_NAME,
    )
    if (
      current?.access_token_expires_at !== null &&
      current?.access_token_expires_at !== undefined &&
      current.access_token_expires_at !== "" &&
      !shouldRefreshZboziAccessToken({
        expiresAt: current.access_token_expires_at,
      })
    ) {
      const delayMs = calculateNextRefreshDelayMs({
        expiresAt: current.access_token_expires_at,
        warn: (message) => {
          logger.warn(message)
        },
      })
      logger.info(
        `Zboží access token is still valid; scheduling refresh in ${Math.round(delayMs / 1000)} seconds.`,
      )
      scheduleNextCycle(delayMs)
      return
    }

    const { expiresAt } = await refreshZboziAccessTokenStore({
      apiStoreService,
    })
    const delayMs = calculateNextRefreshDelayMs({
      expiresAt,
      warn: (message) => {
        logger.warn(message)
      },
    })

    logger.info(
      `Zboží access token refreshed; next refresh scheduled in ${Math.round(delayMs / 1000)} seconds.`,
    )
    scheduleNextCycle(delayMs)
  } catch (error) {
    logger.error(
      "Zboží access token refresh failed",
      error instanceof Error ? error : new Error(String(error)),
    )
    logger.warn(
      `Zboží access token refresh retry scheduled in ${Math.round(ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS / 1000)} seconds.`,
    )
    scheduleNextCycle(ZBOZI_ACCESS_TOKEN_RETRY_DELAY_MS)
  }
}

export default async function bootstrapZboziAccessTokenRefresh({
  container,
}: LoaderOptions): Promise<void> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env["MEDUSA_DISABLE_ZBOZI_ACCESS_TOKEN_BOOTSTRAP"] === "1") {
    logger.info("Zboží access token refresh bootstrap disabled by environment.")
    return
  }

  try {
    const apiStoreService =
      container.resolve<ApiStoreModuleService>(API_STORE_MODULE)
    const runInBackground = async () => {
      try {
        await runZboziAccessTokenRefreshCycle({ apiStoreService, logger })
      } catch (error) {
        logger.error(
          `Failed to bootstrap ${ACCESS_TOKEN_API_STORE_NAME} refresh scheduler`,
          error instanceof Error ? error : new Error(String(error)),
        )
      }
    }
    void runInBackground()
    await Promise.resolve()
  } catch (error) {
    logger.error(
      `Failed to bootstrap ${ACCESS_TOKEN_API_STORE_NAME} refresh scheduler`,
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}
