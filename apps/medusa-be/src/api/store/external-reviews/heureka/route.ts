import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { XMLParser } from "fast-xml-parser"
import {
  type HeurekaExternalReviewKind,
  normalizeHeurekaExternalReviews,
} from "./normalizers"
import type { StoreGetHeurekaExternalReviewsSchemaType } from "./validators"

const HEUREKA_EXPORT_ENDPOINTS: Record<HeurekaExternalReviewKind, string> = {
  shop: "https://www.heureka.sk/direct/dotaznik/export-review.php",
  product: "https://www.heureka.sk/direct/dotaznik/export-product-review.php",
}

const DEFAULT_TIMEOUT_MS = 8000
const HEUREKA_EXPORT_CACHE_SECONDS = 6 * 60 * 60
const HEUREKA_EXPORT_STALE_SECONDS = 24 * 60 * 60
const HEUREKA_EXPORT_CACHE_MS = HEUREKA_EXPORT_CACHE_SECONDS * 1000
const HEUREKA_EXPORT_STALE_MS = HEUREKA_EXPORT_STALE_SECONDS * 1000
const HEUREKA_EXPORT_SUCCESS_CACHE_CONTROL = `public, max-age=0, s-maxage=${HEUREKA_EXPORT_CACHE_SECONDS}, stale-while-revalidate=${HEUREKA_EXPORT_STALE_SECONDS}`
const NO_STORE_CACHE_CONTROL = "no-store"

type NormalizedHeurekaExternalReviews = ReturnType<
  typeof normalizeHeurekaExternalReviews
>
type HeurekaExportCacheStatus = "hit" | "miss" | "stale"
type HeurekaExportCacheEntry = {
  data: NormalizedHeurekaExternalReviews
  freshUntil: number
  staleUntil: number
}

const heurekaExportCache = new Map<
  HeurekaExternalReviewKind,
  HeurekaExportCacheEntry
>()

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  processEntities: true,
  trimValues: true,
})

const resolveTimeoutMs = () => {
  const rawValue = process.env.HEUREKA_REVIEW_EXPORT_TIMEOUT_MS
  const timeoutMs = rawValue ? Number(rawValue) : DEFAULT_TIMEOUT_MS

  return Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_TIMEOUT_MS
}

const isHeurekaExportEnabled = () =>
  process.env.HEUREKA_REVIEW_EXPORT_ENABLED !== "0"

const normalizeEnvValue = (value: string | undefined) => {
  const normalized = value?.trim()

  return normalized || undefined
}

const resolveHeurekaExportKey = () =>
  normalizeEnvValue(process.env.HEUREKA_REVIEW_EXPORT_KEY) ??
  normalizeEnvValue(process.env.HEUREKA_PRIVATE_KEY)

const fetchHeurekaExportXml = async (
  kind: HeurekaExternalReviewKind,
  key: string
) => {
  const url = new URL(HEUREKA_EXPORT_ENDPOINTS[kind])
  url.searchParams.set("key", key)

  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), resolveTimeoutMs())

  try {
    const response = await fetch(url, {
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new Error(`Heureka export responded with ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

const fetchNormalizedHeurekaExport = async (
  kind: HeurekaExternalReviewKind,
  key: string
): Promise<{
  data: NormalizedHeurekaExternalReviews
  status: HeurekaExportCacheStatus
}> => {
  const now = Date.now()
  const cached = heurekaExportCache.get(kind)

  if (cached && cached.freshUntil > now) {
    return {
      data: cached.data,
      status: "hit",
    }
  }

  try {
    const xml = await fetchHeurekaExportXml(kind, key)
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
}

export async function GET(
  req: MedusaRequest<unknown, StoreGetHeurekaExternalReviewsSchemaType>,
  res: MedusaResponse
) {
  const { kind, limit } = req.validatedQuery

  if (!isHeurekaExportEnabled()) {
    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL)
    res.status(503).json({
      code: "heureka_export_disabled",
      message: "Heureka review export is disabled.",
    })
    return
  }

  const key = resolveHeurekaExportKey()

  if (!key) {
    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL)
    res.status(503).json({
      code: "heureka_export_not_configured",
      message: "Heureka review export key is not configured.",
    })
    return
  }

  try {
    const { data: normalized, status } = await fetchNormalizedHeurekaExport(
      kind,
      key
    )

    res.setHeader("Cache-Control", HEUREKA_EXPORT_SUCCESS_CACHE_CONTROL)
    res.setHeader("X-Heureka-Review-Cache", status)
    res.json({
      reviews: normalized.reviews.slice(0, limit),
      summary: normalized.summary,
      meta: normalized.meta,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"

    res.setHeader("Cache-Control", NO_STORE_CACHE_CONTROL)
    res.status(502).json({
      code: "heureka_export_fetch_failed",
      message,
    })
  }
}
