import type { ExecArgs, Logger, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"
import { HERBATICA_REVIEWS_XML_ENV } from "./herbatica-seed-config"
import {
  extractElements,
  extractFirstElementContent,
  extractFirstText,
  normalizeInlineText,
  normalizeText,
  readXmlSource,
} from "./herbatica-xml-utils"

const REVIEW_SOURCE_PREFIX = "herbatica-review"
const REVIEW_BATCH_SIZE = 100
const VARIANT_ID_QUERY_REGEX = /[?&]variantId=(?<variantId>[^&#]+)/u

interface ParsedReviewProduct {
  gtins: string[]
  skus: string[]
  variantId?: string
}

interface ParsedReview {
  content: string
  id: string
  rating: number
  reviewerName?: string
  timestamp?: string
  products: ParsedReviewProduct[]
}

const productVariantRecordSchema = z.object({
  ean: z.string().nullish(),
  id: z.string(),
  metadata: z
    .object({
      code: z.string().optional(),
      ean: z.string().optional(),
      source_sku: z.string().optional(),
      source_variant_id: z.string().optional(),
      variant_id: z.string().optional(),
    })
    .nullish(),
  product: z.object({ id: z.string().optional() }).nullish(),
  sku: z.string().nullish(),
})

type ProductVariantRecord = z.infer<typeof productVariantRecordSchema>

interface PendingReview {
  content: string
  created_at: Date | undefined
  customer_id: string
  first_name: null | string
  last_name: null
  product_id: string
  rating: number
  status: "approved"
  title: string
  updated_at: Date | undefined
}

const toValidDate = (value?: string): Date | undefined => {
  if (value === undefined || value.length === 0) {
    return undefined
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const parseRating = (value?: string) => {
  const parsed = Number(normalizeInlineText(value)?.replace(",", "."))
  return Number.isFinite(parsed)
    ? Math.min(5, Math.max(1, Math.round(parsed)))
    : undefined
}

const getUrlVariantId = (url?: string): string | undefined => {
  if (url === undefined || url.length === 0) {
    return undefined
  }

  try {
    const parsedUrl = new URL(url)
    return normalizeInlineText(parsedUrl.searchParams.get("variantId") ?? "")
  } catch {
    return normalizeInlineText(
      VARIANT_ID_QUERY_REGEX.exec(url)?.groups?.["variantId"],
    )
  }
}

const parseReviewProducts = (source: string): ParsedReviewProduct[] => {
  const productsSource = extractFirstElementContent(source, "products")
  if (productsSource === undefined || productsSource.length === 0) {
    return []
  }

  return extractElements(productsSource, "product").map((product) => {
    const url = normalizeInlineText(
      extractFirstText(product.inner, "product_url"),
    )

    const variantId = getUrlVariantId(url)

    return {
      gtins: extractElements(product.inner, "gtin")
        .map((gtin) => normalizeInlineText(gtin.inner))
        .filter(
          (gtin): gtin is string => gtin !== undefined && gtin.length > 0,
        ),
      skus: extractElements(product.inner, "sku")
        .map((sku) => normalizeInlineText(sku.inner))
        .filter((sku): sku is string => sku !== undefined && sku.length > 0),
      ...(variantId === undefined || variantId.length === 0
        ? {}
        : { variantId }),
    }
  })
}

const parseHerbaticaReviewsXml = (xml: string): ParsedReview[] => {
  const reviews: ParsedReview[] = []

  for (const review of extractElements(xml, "review")) {
    const id =
      normalizeInlineText(extractFirstText(review.inner, "review_id")) ?? ""
    const content =
      normalizeText(extractFirstText(review.inner, "content")) ?? ""
    const rating = parseRating(extractFirstText(review.inner, "overall"))

    if (id.length === 0 || content.length === 0 || rating === undefined) {
      continue
    }

    const reviewerName = normalizeInlineText(
      extractFirstText(
        extractFirstElementContent(review.inner, "reviewer") ?? "",
        "name",
      ),
    )
    const timestamp = normalizeInlineText(
      extractFirstText(review.inner, "review_timestamp"),
    )

    reviews.push({
      content,
      id,
      products: parseReviewProducts(review.inner),
      rating,
      ...(reviewerName === undefined || reviewerName.length === 0
        ? {}
        : { reviewerName }),
      ...(timestamp === undefined || timestamp.length === 0
        ? {}
        : { timestamp }),
    })
  }

  return reviews
}

const getMetadataString = (
  metadata: ProductVariantRecord["metadata"],
  key: keyof NonNullable<ProductVariantRecord["metadata"]>,
) => {
  const value = metadata?.[key]
  return typeof value === "string" ? normalizeInlineText(value) : undefined
}

const addMapValue = (
  map: Map<string, Set<string>>,
  key: null | string | undefined,
  productId: null | string | undefined,
) => {
  const normalizedKey = normalizeInlineText(key ?? undefined)
  const hasNormalizedKey =
    normalizedKey !== undefined && normalizedKey.length > 0
  const hasProductId =
    productId !== null && productId !== undefined && productId.length > 0
  if (!(hasNormalizedKey && hasProductId)) {
    return
  }

  const values = map.get(normalizedKey) ?? new Set<string>()
  values.add(productId)
  map.set(normalizedKey, values)
}

const buildVariantProductIndexes = async (container: ExecArgs["container"]) => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "ean", "metadata", "product.id"],
  })

  const bySku = new Map<string, Set<string>>()
  const byGtin = new Map<string, Set<string>>()
  const byVariantId = new Map<string, Set<string>>()

  const variants = z.array(productVariantRecordSchema).safeParse(data)
  if (!variants.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Product variant query returned invalid review import data",
    )
  }

  for (const variant of variants.data) {
    const productId = variant.product?.id
    addMapValue(bySku, variant.sku, productId)
    addMapValue(bySku, getMetadataString(variant.metadata, "code"), productId)
    addMapValue(
      bySku,
      getMetadataString(variant.metadata, "source_sku"),
      productId,
    )
    addMapValue(byGtin, variant.ean, productId)
    addMapValue(byGtin, getMetadataString(variant.metadata, "ean"), productId)
    addMapValue(
      byVariantId,
      getMetadataString(variant.metadata, "variant_id"),
      productId,
    )
    addMapValue(
      byVariantId,
      getMetadataString(variant.metadata, "source_variant_id"),
      productId,
    )
  }

  return { byGtin, bySku, byVariantId }
}

const addMatchedProducts = (
  matches: Set<string>,
  index: Map<string, Set<string>>,
  values: (string | undefined)[],
) => {
  for (const value of values) {
    const normalized = normalizeInlineText(value)
    if (normalized === undefined || normalized.length === 0) {
      continue
    }

    for (const productId of index.get(normalized) ?? []) {
      matches.add(productId)
    }
  }
}

const resolveReviewProductIds = (
  review: ParsedReview,
  indexes: Awaited<ReturnType<typeof buildVariantProductIndexes>>,
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
  if (argPath !== undefined && argPath.length > 0) {
    return argPath
  }

  const envPath = normalizeInlineText(process.env[HERBATICA_REVIEWS_XML_ENV])
  if (envPath !== undefined && envPath.length > 0) {
    return envPath
  }

  throw new MedusaError(
    MedusaError.Types.NOT_FOUND,
    `Could not find Herbatica reviews XML. Pass it as an argument or set ${HERBATICA_REVIEWS_XML_ENV}.`,
  )
}

const chunkReviewBatches = <T>(items: T[], size: number) => {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

const getReviewCustomerId = (reviewId: string) =>
  `${REVIEW_SOURCE_PREFIX}:${reviewId}`

const getReviewerFirstName = (reviewerName?: string) => {
  if (
    reviewerName === undefined ||
    reviewerName.length === 0 ||
    reviewerName.toLowerCase() === "anonym"
  ) {
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

  const xml = await readXmlSource(xmlPath)
  const reviews = parseHerbaticaReviewsXml(xml)
  const indexes = await buildVariantProductIndexes(container)
  const reviewService = container.resolve<ProductReviewModuleService>(
    PRODUCT_REVIEW_MODULE,
  )
  const listedReviews = await reviewService.listReviews(
    {
      customer_id: {
        $like: `${REVIEW_SOURCE_PREFIX}:%`,
      },
    },
    {
      select: ["id", "customer_id", "product_id"],
    },
  )
  const existingKeys = new Set(
    listedReviews.map((review) => `${review.customer_id}:${review.product_id}`),
  )
  const pendingReviews: PendingReview[] = []
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
      const reviewDate = toValidDate(review.timestamp)
      pendingReviews.push({
        content: review.content,
        created_at: reviewDate,
        customer_id: customerId,
        first_name: getReviewerFirstName(review.reviewerName),
        last_name: null,
        product_id: productId,
        rating: review.rating,
        status: "approved",
        title: "Overená recenzia Herbatica",
        updated_at: reviewDate,
      })
    }
  }

  await Promise.all(
    chunkReviewBatches(pendingReviews, REVIEW_BATCH_SIZE).map(
      async (reviewBatch) => await reviewService.createReviews(reviewBatch),
    ),
  )

  logger.info(
    `Herbatica reviews import completed: parsed=${reviews.length}, matched=${matchedReviews}, unmatched=${unmatchedReviews}, created=${pendingReviews.length}, skipped_existing=${skippedExisting}`,
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
