import type { MedusaRequest } from "@medusajs/framework/http"
import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export const ORDER_EXPEDITION_SUMMARY_CACHE_KEY = "order-expedition:summary:v1"
export const ORDER_EXPEDITION_SUMMARY_CACHE_TAG = "order-expedition:summary"
export const ORDER_EXPEDITION_SUMMARY_CACHE_TTL_SECONDS = 120

type RequestScope = MedusaRequest["scope"]

export function resolveOrderExpeditionSummaryCacheService(scope: RequestScope) {
  try {
    return scope.resolve<ICachingModuleService>(Modules.CACHING)
  } catch {
    return null
  }
}

export async function clearOrderExpeditionSummaryCache(scope: RequestScope) {
  const cacheService = resolveOrderExpeditionSummaryCacheService(scope)

  if (!cacheService) {
    return
  }

  try {
    await cacheService.clear({
      tags: [ORDER_EXPEDITION_SUMMARY_CACHE_TAG],
    })
  } catch (error) {
    const logger = resolveLogger(scope)

    if (typeof logger?.warn === "function") {
      logger.warn(
        `Order expedition summary cache invalidation failed: ${getErrorMessage(error)}`
      )
    }
  }
}

function resolveLogger(scope: RequestScope) {
  try {
    const logger = scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    return typeof logger?.warn === "function" ? logger : null
  } catch {
    return null
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
