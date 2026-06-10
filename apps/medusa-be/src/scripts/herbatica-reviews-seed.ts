import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"
import {
  extractElements,
  extractFirstElementContent,
  extractFirstText,
  normalizeInlineText,
  normalizeText,
  readXmlSource,
} from "./herbatica-xml-utils"
import { HERBATICA_REVIEWS_XML_ENV } from "./herbatica-seed-config"

const REVIEW_SOURCE_PREFIX = "herbatica-review"
const REVIEW_BATCH_SIZE = 100

type ParsedReviewProduct = {
  gtins: string[]
  skus: string[]
  variantId?: string
}

type ParsedReview = {
  content: string
  id: string
  rating: number
  reviewerName?: string
  timestamp?: string
  products: ParsedReviewProduct[]
}

type ProductVariantRecord = {
  ean?: null | string
  id: string
  metadata?: null | Record<string, unknown>
  product?: null | {
    id?: string
  }
  sku?: null | string
}

type ReviewRecord = {
  customer_id: string
  id: string
  product_id: string
}

const parseRating = (value?: string) => {
  const parsed = Number(normalizeInlineText(value)?.replace(",", "."))
  return Number.isFinite(parsed)
    ? Math.min(5, Math.max(1, Math.round(parsed)))
    : undefined
}

const getUrlVariantId = (url?: string) => {
  if (!url) {
    return
  }

  try {
    const parsedUrl = new URL(url)
    return normalizeInlineText(parsedUrl.searchParams.get("variantId") ?? "")
  } catch {
    return normalizeInlineText(url.match(/[?&]variantId=([^&#]+)/)?.[1])
  }
}

const parseReviewProducts = (source: string): ParsedReviewProduct[] => {
  const productsSource = extractFirstElementContent(source, "products")
  if (!productsSource) {
    return []
  }

  return extractElements(productsSource, "product").map((product) => {
    const url = normalizeInlineText(extractFirstText(product.inner, "product_url"))

    return {
      gtins: extractElements(product.inner, "gtin")
        .map((gtin) => normalizeInlineText(gtin.inner))
        .filter((gtin): gtin is string => Boolean(gtin)),
      skus: extractElements(product.inner, "sku")
        .map((sku) => normalizeInlineText(sku.inner))
        .filter((sku): sku is string => Boolean(sku)),
      variantId: getUrlVariantId(url),
    }
  })
}

const parseHerbaticaReviewsXml = (xml: string): ParsedReview[] => {
  const reviews: ParsedReview[] = []

  for (const review of extractElements(xml, "review")) {
    const id = normalizeInlineText(extractFirstText(review.inner, "review_id"))
    const content = normalizeText(extractFirstText(review.inner, "content"))
    const rating = parseRating(extractFirstText(review.inner, "overall"))

    if (!(id && content && rating)) {
      continue
    }

    reviews.push({
      content,
      id,
      products: parseReviewProducts(review.inner),
      rating,
      reviewerName: normalizeInlineText(
        extractFirstText(extractFirstElementContent(review.inner, "reviewer") ?? "", "name")
      ),
      timestamp: normalizeInlineText(
        extractFirstText(review.inner, "review_timestamp")
      ),
    })
  }

  return reviews
}

const getMetadataString = (
  metadata: ProductVariantRecord["metadata"],
  key: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" ? normalizeInlineText(value) : undefined
}

const addMapValue = (
  map: Map<string, Set<string>>,
  key: null | string | undefined,
  productId: null | string | undefined
) => {
  const normalizedKey = normalizeInlineText(key ?? undefined)
  if (!(normalizedKey && productId)) {
    return
  }

  const values = map.get(normalizedKey) ?? new Set<string>()
  values.add(productId)
  map.set(normalizedKey, values)
}

const buildVariantProductIndexes = async (container: ExecArgs["container"]) => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "ean", "metadata", "product.id"],
  })

  const bySku = new Map<string, Set<string>>()
  const byGtin = new Map<string, Set<string>>()
  const byVariantId = new Map<string, Set<string>>()

  for (const variant of data as ProductVariantRecord[]) {
    const productId = variant.product?.id
    addMapValue(bySku, variant.sku, productId)
    addMapValue(bySku, getMetadataString(variant.metadata, "code"), productId)
    addMapValue(bySku, getMetadataString(variant.metadata, "source_sku"), productId)
    addMapValue(byGtin, variant.ean, productId)
    addMapValue(byGtin, getMetadataString(variant.metadata, "ean"), productId)
    addMapValue(byVariantId, getMetadataString(variant.metadata, "variant_id"), productId)
    addMapValue(
      byVariantId,
      getMetadataString(variant.metadata, "source_variant_id"),
      productId
    )
  }

  return { byGtin, bySku, byVariantId }
}

const addMatchedProducts = (
  matches: Set<string>,
  index: Map<string, Set<string>>,
  values: Array<string | undefined>
) => {
  for (const value of values) {
    const normalized = normalizeInlineText(value)
    if (!normalized) {
      continue
    }

    for (const productId of index.get(normalized) ?? []) {
      matches.add(productId)
    }
  }
}

const resolveReviewProductIds = (
  review: ParsedReview,
  indexes: Awaited<ReturnType<typeof buildVariantProductIndexes>>
) => {
  const productIds = new Set<string>()

  for (const product of review.products) {
    addMatchedProducts(productIds, indexes.byVariantId, [product.variantId])
    addMatchedProducts(productIds, indexes.byGtin, product.gtins)
    addMatchedProducts(productIds, indexes.bySku, product.skus)
  }

  return [...productIds]
}

const resolveReviewsXmlPath = (args?: string[]) => {
  const argPath = normalizeInlineText(args?.[0])
  if (argPath) {
    return argPath
  }

  const envPath = normalizeInlineText(process.env[HERBATICA_REVIEWS_XML_ENV])
  if (envPath) {
    return envPath
  }

  throw new Error(
    `Could not find Herbatica reviews XML. Pass it as an argument or set ${HERBATICA_REVIEWS_XML_ENV}.`
  )
}

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

const getReviewCustomerId = (reviewId: string) =>
  `${REVIEW_SOURCE_PREFIX}:${reviewId}`

const getReviewerFirstName = (reviewerName?: string) => {
  if (!reviewerName || reviewerName.toLowerCase() === "anonym") {
    return null
  }

  return reviewerName
}

export const importHerbaticaReviews = async ({
  container,
  logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER),
  xmlPath,
}: {
  container: ExecArgs["container"]
  logger?: Logger
  xmlPath: string
}) => {
  logger.info("Starting Herbatica reviews import from XML feed...")
  logger.info(`Using reviews XML feed: ${xmlPath}`)

  const reviews = parseHerbaticaReviewsXml(await readXmlSource(xmlPath))
  const indexes = await buildVariantProductIndexes(container)
  const reviewService = container.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE
  )
  const existingReviews = (await reviewService.listReviews(
    {
      customer_id: {
        $like: `${REVIEW_SOURCE_PREFIX}:%`,
      },
    },
    {
      select: ["id", "customer_id", "product_id"],
    }
  )) as ReviewRecord[]
  const existingKeys = new Set(
    existingReviews.map((review) => `${review.customer_id}:${review.product_id}`)
  )
  const pendingReviews: Array<Record<string, unknown>> = []
  let matchedReviews = 0
  let skippedExisting = 0
  let unmatchedReviews = 0

  for (const review of reviews) {
    const productIds = resolveReviewProductIds(review, indexes)
    if (!productIds.length) {
      unmatchedReviews += 1
      continue
    }

    matchedReviews += 1
    const customerId = getReviewCustomerId(review.id)
    for (const productId of productIds) {
      const key = `${customerId}:${productId}`
      if (existingKeys.has(key)) {
        skippedExisting += 1
        continue
      }

      existingKeys.add(key)
      pendingReviews.push({
        content: review.content,
        created_at: review.timestamp ? new Date(review.timestamp) : undefined,
        customer_id: customerId,
        first_name: getReviewerFirstName(review.reviewerName),
        last_name: null,
        product_id: productId,
        rating: review.rating,
        status: "approved",
        title: "Overená recenzia Herbatica",
        updated_at: review.timestamp ? new Date(review.timestamp) : undefined,
      })
    }
  }

  for (const reviewBatch of chunk(pendingReviews, REVIEW_BATCH_SIZE)) {
    await reviewService.createReviews(reviewBatch)
  }

  logger.info(
    `Herbatica reviews import completed: parsed=${reviews.length}, matched=${matchedReviews}, unmatched=${unmatchedReviews}, created=${pendingReviews.length}, skipped_existing=${skippedExisting}`
  )
}

export default async function herbaticaReviewsSeed({
  container,
  args,
}: ExecArgs) {
  await importHerbaticaReviews({
    container,
    xmlPath: resolveReviewsXmlPath(args),
  })
}
