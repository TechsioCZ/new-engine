import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type {
  ShopReviewModuleService,
  ShopReviewTrustSummary,
} from "../../../../modules/shop-review"
import { SHOP_REVIEW_MODULE } from "../../../../modules/shop-review"

const CACHE_SECONDS = 6 * 60 * 60
const STALE_SECONDS = 24 * 60 * 60
const CACHE_MS = CACHE_SECONDS * 1000
const STALE_MS = STALE_SECONDS * 1000
const SUCCESS_CACHE_CONTROL = `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`

type CacheStatus = "hit" | "miss" | "stale"
type CacheEntry = {
  data: ShopReviewTrustSummary
  freshUntil: number
  staleUntil: number
}

let cache: CacheEntry | null = null

const fetchSummary = async (
  shopReviewService: ShopReviewModuleService
): Promise<{ data: ShopReviewTrustSummary; status: CacheStatus }> => {
  const now = Date.now()

  if (cache && cache.freshUntil > now) {
    return { data: cache.data, status: "hit" }
  }

  try {
    const data = await shopReviewService.fetchZboziShopTrustSummary()
    cache = {
      data,
      freshUntil: now + CACHE_MS,
      staleUntil: now + CACHE_MS + STALE_MS,
    }

    return { data, status: "miss" }
  } catch (error) {
    if (cache && cache.staleUntil > now) {
      return { data: cache.data, status: "stale" }
    }

    throw error
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const shopReviewService =
    req.scope.resolve<ShopReviewModuleService>(SHOP_REVIEW_MODULE)

  try {
    const { data, status } = await fetchSummary(shopReviewService)

    res.setHeader("Cache-Control", SUCCESS_CACHE_CONTROL)
    res.setHeader("X-Zbozi-Review-Cache", status)
    res.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    res.setHeader("Cache-Control", "no-store")
    res.status(502).json({
      code: "zbozi_summary_fetch_failed",
      message,
    })
  }
}
