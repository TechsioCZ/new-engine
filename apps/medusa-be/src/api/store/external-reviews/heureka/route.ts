import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { XMLParser } from "fast-xml-parser"
import type { ShopReviewModuleService } from "../../../../modules/shop-review"
import { SHOP_REVIEW_MODULE } from "../../../../modules/shop-review"
import { hasExactSlovakReviewScope } from "../../review-market-scope"
import {
  type HeurekaExternalReviewKind,
  normalizeHeurekaExternalReviews,
} from "./normalizers"
import type { StoreGetHeurekaExternalReviewsSchemaType } from "./validators"

const HEUREKA_EXPORT_CACHE_SECONDS = 6 * 60 * 60
const HEUREKA_EXPORT_STALE_SECONDS = 24 * 60 * 60
const HEUREKA_EXPORT_CACHE_MS = HEUREKA_EXPORT_CACHE_SECONDS * 1000
const HEUREKA_EXPORT_STALE_MS = HEUREKA_EXPORT_STALE_SECONDS * 1000
const HEUREKA_EXPORT_SUCCESS_CACHE_CONTROL = "private, no-store"
const NO_STORE_CACHE_CONTROL = "no-store"
const HEUREKA_EXPORT_PUBLIC_ERROR_MESSAGE =
  "External reviews are temporarily unavailable"

type NormalizedHeurekaExternalReviews = ReturnType<
  typeof normalizeHeurekaExternalReviews
>
type HeurekaExportCacheStatus = "hit" | "miss" | "stale"
type HeurekaExportResult = {
  data: NormalizedHeurekaExternalReviews
  status: HeurekaExportCacheStatus
}
type HeurekaExportCacheEntry = {
  data: NormalizedHeurekaExternalReviews
  freshUntil: number
  staleUntil: number
}

const heurekaExportCache = new Map<
  HeurekaExternalReviewKind,
  HeurekaExportCacheEntry
>()
const heurekaExportRequests = new Map<
  HeurekaExternalReviewKind,
  Promise<HeurekaExportResult>
>()

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: true,
  trimValues: true,
})

const fetchHeurekaExportXml = async (
  kind: HeurekaExternalReviewKind,
  shopReviewService: ShopReviewModuleService
) => {
  const response = await shopReviewService.fetchHeurekaReviews({
    kind,
    locale: "sk",
  })

  return response.body
}

const fetchNormalizedHeurekaExport = async (
  kind: HeurekaExternalReviewKind,
  shopReviewService: ShopReviewModuleService
): Promise<HeurekaExportResult> => {
  const now = Date.now()
  const cached = heurekaExportCache.get(kind)

  if (cached && cached.freshUntil > now) {
    return {
      data: cached.data,
      status: "hit",
    }
  }

  const activeRequest = heurekaExportRequests.get(kind)
  if (activeRequest) {
    return activeRequest
  }

  const request = (async (): Promise<HeurekaExportResult> => {
    try {
      const xml = await fetchHeurekaExportXml(kind, shopReviewService)
      const parsedXml = xmlParser.parse(xml)
      const data = normalizeHeurekaExternalReviews(parsedXml, kind)

      heurekaExportCache.set(kind, {
        data,
        freshUntil: now + HEUREKA_EXPORT_CACHE_MS,
        staleUntil: now + HEUREKA_EXPORT_CACHE_MS + HEUREKA_EXPORT_STALE_MS,
      })

      return {
        data,
        status: "miss",
      }
    } catch (error) {
      if (cached && cached.staleUntil > now) {
        return {
          data: cached.data,
          status: "stale",
        }
      }

      throw error
    }
  })()

  heurekaExportRequests.set(kind, request)

  try {
    return await request
  } finally {
    if (heurekaExportRequests.get(kind) === request) {
      heurekaExportRequests.delete(kind)
    }
  }
}

export async function GET(
  req: MedusaRequest<unknown, StoreGetHeurekaExternalReviewsSchemaType>,
  res: MedusaResponse
) {
  const { kind, limit } = req.validatedQuery
  if (!(await hasExactSlovakReviewScope(req))) {
    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL)
    res.status(404).json({
      code: "external_reviews_not_available",
      message: HEUREKA_EXPORT_PUBLIC_ERROR_MESSAGE,
    })
    return
  }
  const shopReviewService =
    req.scope.resolve<ShopReviewModuleService>(SHOP_REVIEW_MODULE)

  try {
    const { data: normalized, status } = await fetchNormalizedHeurekaExport(
      kind,
      shopReviewService
    )

    res.setHeader("Cache-Control", HEUREKA_EXPORT_SUCCESS_CACHE_CONTROL)
    res.setHeader("X-Heureka-Review-Cache", status)
    res.json({
      reviews: normalized.reviews.slice(0, limit),
      summary: normalized.summary,
      meta: normalized.meta,
    })
  } catch (error) {
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    logger.error(
      "Failed to fetch Heureka external reviews",
      error instanceof Error ? error : new Error(String(error))
    )

    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL)
    res.status(502).json({
      code: "heureka_export_fetch_failed",
      message: HEUREKA_EXPORT_PUBLIC_ERROR_MESSAGE,
    })
  }
}
