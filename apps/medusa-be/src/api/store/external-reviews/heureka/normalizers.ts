export type HeurekaExternalReviewKind = "shop" | "product"

export type NormalizedExternalReviewScores = {
  total?: number
  communication?: number
  deliveryTime?: number
  transportQuality?: number
  pickupTime?: number
  pickupQuality?: number
}

export type NormalizedExternalReview = {
  id: string
  source: "heureka"
  kind: HeurekaExternalReviewKind
  rating: number
  author: string
  message?: string
  createdAt: string
  verified: true
  recommended: boolean | null
  positivePoints?: string[]
  negativePoints?: string[]
  merchantReply?: {
    message: string
  }
  scores?: NormalizedExternalReviewScores
  product?: {
    name?: string
    url?: string
    ean?: string
  }
}

export type ReviewTrustSummary = {
  source: "heureka"
  scoreLabel: string
  reviewCountLabel: string
  calculatedFrom: "export"
  updatedAt: string
  recommendationRate: number | null
  recommendedCount: number
  recommendationSampleCount: number
  averageRating: number
  ratingDistribution: Record<"1" | "2" | "3" | "4" | "5", number>
}

export type HeurekaExternalReviewsMeta = {
  kind: HeurekaExternalReviewKind
  exportCount: number
  textReviewCount: number
  generatedAt: string
  sourceUpdatedEveryHours: number
}

type XmlRecord = Record<string, unknown>

const REVIEW_MARKER_FIELDS = new Set([
  "rating_id",
  "unix_timestamp",
  "total_rating",
  "rating",
  "summary",
  "pros",
  "cons",
  "recommends",
  "product_name",
])
const PRODUCT_CONTEXT_FIELDS = [
  "product_name",
  "product",
  "productName",
  "name",
  "url",
  "product_url",
  "ean",
  "EAN",
] as const

const scalarToString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const result = scalarToString(item)

      if (result) {
        return result
      }
    }

    return
  }

  if (typeof value === "object") {
    const record = value as XmlRecord

    return (
      scalarToString(record["#text"]) ??
      scalarToString(record._text) ??
      scalarToString(record.text)
    )
  }

  const text = String(value).trim()

  return text || undefined
}

const readString = (
  record: XmlRecord,
  keys: readonly string[]
): string | undefined => {
  for (const key of keys) {
    const value = scalarToString(record[key])

    if (value) {
      return value
    }
  }

  return
}

const readNumber = (
  record: XmlRecord,
  keys: readonly string[]
): number | undefined => {
  const text = readString(record, keys)

  if (!text) {
    return
  }

  const normalized = text.replace(",", ".")
  const numberValue = Number(normalized)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

const splitReviewPoints = (value: string | undefined) => {
  if (!value) {
    return
  }

  const points = value
    .split(/\r?\n/)
    .map((point) => point.trim())
    .filter(Boolean)

  return points.length > 0 ? points : undefined
}

const readReviewPoints = (record: XmlRecord, keys: readonly string[]) =>
  splitReviewPoints(readString(record, keys))

const isRecord = (value: unknown): value is XmlRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const looksLikeReviewRecord = (record: XmlRecord): boolean => {
  const keys = Object.keys(record)
  const markerCount = keys.filter((key) => REVIEW_MARKER_FIELDS.has(key)).length

  return markerCount >= 2
}

const pickProductContext = (record: XmlRecord): XmlRecord | undefined => {
  const productContext: XmlRecord = {}

  for (const field of PRODUCT_CONTEXT_FIELDS) {
    if (record[field] !== undefined) {
      productContext[field] = record[field]
    }
  }

  return Object.keys(productContext).length > 0 ? productContext : undefined
}

const collectReviewRecords = (
  value: unknown,
  records: XmlRecord[] = [],
  productContext?: XmlRecord
): XmlRecord[] => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectReviewRecords(item, records, productContext)
    }

    return records
  }

  if (!isRecord(value)) {
    return records
  }

  const currentProductContext = pickProductContext(value)
  const nextProductContext = currentProductContext
    ? {
        ...productContext,
        ...currentProductContext,
      }
    : productContext

  if (looksLikeReviewRecord(value)) {
    records.push(
      nextProductContext ? { ...nextProductContext, ...value } : value
    )
    return records
  }

  for (const nestedValue of Object.values(value)) {
    collectReviewRecords(nestedValue, records, nextProductContext)
  }

  return records
}

const normalizeRating = (rating: number | undefined): number | undefined => {
  if (rating === undefined) {
    return
  }

  if (rating >= 1 && rating <= 5) {
    return rating
  }

  if (rating > 5 && rating <= 10) {
    return Number((rating / 2).toFixed(1))
  }

  if (rating > 10 && rating <= 100) {
    return Number((rating / 20).toFixed(1))
  }

  return
}

const normalizeCreatedAt = (record: XmlRecord) => {
  const unixTimestamp = readNumber(record, ["unix_timestamp", "timestamp"])

  if (unixTimestamp) {
    const milliseconds =
      unixTimestamp > 9_999_999_999 ? unixTimestamp : unixTimestamp * 1000

    return new Date(milliseconds).toISOString()
  }

  const dateText = readString(record, ["date", "created_at", "createdAt"])
  const timestamp = dateText ? Date.parse(dateText) : Number.NaN

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : new Date(0).toISOString()
}

const normalizeRecommendation = (record: XmlRecord): boolean | null => {
  const value = readString(record, ["recommends", "recommend", "recommended"])

  if (!value) {
    return null
  }

  const normalized = value.toLowerCase()

  if (
    ["1", "true", "yes", "ano", "doporučuje", "odporúča"].includes(normalized)
  ) {
    return true
  }

  if (
    ["0", "false", "no", "ne", "nedoporučuje", "neodporúča"].includes(
      normalized
    )
  ) {
    return false
  }

  return null
}

const resolveMessage = (record: XmlRecord) =>
  readString(record, ["summary", "comment", "message"])

const createReviewScores = (
  record: XmlRecord,
  rating: number
): NormalizedExternalReviewScores => ({
  total: readNumber(record, ["total_rating", "rating"]) ?? rating,
  communication: readNumber(record, ["communication"]),
  deliveryTime: readNumber(record, ["delivery_time"]),
  transportQuality: readNumber(record, ["transport_quality"]),
  pickupTime: readNumber(record, ["pickup_time"]),
  pickupQuality: readNumber(record, ["pickup_quality"]),
})

const normalizeReviewRecord = (
  record: XmlRecord,
  kind: HeurekaExternalReviewKind,
  index: number
): NormalizedExternalReview | null => {
  const rating = normalizeRating(
    readNumber(
      record,
      kind === "shop" ? ["total_rating", "rating"] : ["rating"]
    )
  )
  const message = resolveMessage(record)

  if (!rating) {
    return null
  }

  const createdAt = normalizeCreatedAt(record)
  const ratingId = readString(record, ["rating_id", "id"])
  const author =
    readString(record, ["author", "name", "customer_name"]) ??
    "Overený zákazník"
  const productName =
    kind === "product"
      ? readString(record, ["product_name", "product", "productName", "name"])
      : undefined
  const productUrl =
    kind === "product" ? readString(record, ["url", "product_url"]) : undefined
  const productEan =
    kind === "product" ? readString(record, ["ean", "EAN"]) : undefined
  const merchantReply = readString(record, ["reaction", "reply"])

  return {
    id: ratingId ?? `heureka-${kind}-${createdAt}-${index}`,
    source: "heureka",
    kind,
    rating,
    author,
    message,
    createdAt,
    verified: true,
    recommended: normalizeRecommendation(record),
    positivePoints: readReviewPoints(record, ["pros"]),
    negativePoints: readReviewPoints(record, ["cons"]),
    merchantReply: merchantReply ? { message: merchantReply } : undefined,
    scores: createReviewScores(record, rating),
    product:
      productName || productUrl || productEan
        ? {
            name: productName,
            url: productUrl,
            ean: productEan,
          }
        : undefined,
  }
}

const createRatingDistribution = (
  reviews: readonly NormalizedExternalReview[]
) => {
  const distribution: ReviewTrustSummary["ratingDistribution"] = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  }

  for (const review of reviews) {
    const ratingKey = String(
      Math.max(1, Math.min(5, Math.round(review.rating)))
    )

    distribution[ratingKey as keyof typeof distribution] += 1
  }

  return distribution
}

const hasReviewContent = (review: NormalizedExternalReview) =>
  Boolean(
    review.message?.trim() ||
      review.positivePoints?.length ||
      review.negativePoints?.length
  )

const getRecommendationSample = (
  rawRecords: readonly XmlRecord[],
  reviews: readonly NormalizedExternalReview[]
) => {
  const reviewByCreatedAt = new Map(
    reviews.map((review) => [review.createdAt, review])
  )
  const latestAllowedTimestamp = Date.now() - 90 * 24 * 60 * 60 * 1000
  const recommendations = rawRecords
    .map((record) => {
      const createdAt = normalizeCreatedAt(record)
      const review = reviewByCreatedAt.get(createdAt)

      if (!review) {
        return null
      }

      return {
        createdAt,
        recommends: normalizeRecommendation(record),
      }
    })
    .filter(
      (item): item is { createdAt: string; recommends: boolean | null } =>
        item !== null && item.recommends !== null
    )
  const recentRecommendations = recommendations.filter(
    (item) => Date.parse(item.createdAt) >= latestAllowedTimestamp
  )

  return recentRecommendations.length > 0
    ? recentRecommendations
    : recommendations
}

const formatExportCountLabel = (count: number) => `(${count} z exportu)`

export const normalizeHeurekaExternalReviews = (
  parsedXml: unknown,
  kind: HeurekaExternalReviewKind
) => {
  const rawRecords = collectReviewRecords(parsedXml)
  const allReviews = rawRecords
    .map((record, index) => normalizeReviewRecord(record, kind, index))
    .filter((review): review is NormalizedExternalReview => review !== null)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const textReviews = allReviews.filter(hasReviewContent)
  const recommendationSample = getRecommendationSample(rawRecords, allReviews)
  const recommendedCount = recommendationSample.filter(
    (item) => item.recommends
  ).length
  const recommendationRate =
    recommendationSample.length > 0
      ? Math.round((recommendedCount / recommendationSample.length) * 100)
      : null
  const ratingSum = allReviews.reduce((sum, review) => sum + review.rating, 0)
  const averageRating =
    allReviews.length > 0
      ? Number((ratingSum / allReviews.length).toFixed(1))
      : 0

  return {
    reviews: textReviews,
    summary: {
      source: "heureka",
      scoreLabel:
        recommendationRate === null ? "n/a" : `${recommendationRate}%`,
      reviewCountLabel: formatExportCountLabel(rawRecords.length),
      calculatedFrom: "export",
      updatedAt: new Date().toISOString(),
      recommendationRate,
      recommendedCount,
      recommendationSampleCount: recommendationSample.length,
      averageRating,
      ratingDistribution: createRatingDistribution(allReviews),
    } satisfies ReviewTrustSummary,
    meta: {
      kind,
      exportCount: rawRecords.length,
      textReviewCount: textReviews.length,
      generatedAt: new Date().toISOString(),
      sourceUpdatedEveryHours: 6,
    } satisfies HeurekaExternalReviewsMeta,
  }
}
