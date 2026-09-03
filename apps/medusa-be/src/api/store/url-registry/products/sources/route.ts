import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import {
  PRODUCT_CATALOG_SOURCE_BATCH_LIMIT,
  type ProductCatalogSourceCandidate,
  type PublishedProductCatalogSource,
  parseProductCatalogSourceMarket,
  readPublishedProductCatalogSources,
} from "../../product-source"

const CandidateSchema = z
  .object({
    entityId: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[\x21-\x7e]+$/),
    publicSlug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^(?=.*[a-z0-9])[a-z0-9-]+$/),
  })
  .strict()

const RequestSchema = z
  .object({
    candidates: z
      .array(CandidateSchema)
      .min(1)
      .max(PRODUCT_CATALOG_SOURCE_BATCH_LIMIT),
    market: z.string(),
    schemaVersion: z.literal(1),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.candidates.map((candidate) => candidate.entityId)).size !==
        value.candidates.length ||
      new Set(value.candidates.map((candidate) => candidate.publicSlug))
        .size !== value.candidates.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate entity IDs and public slugs must be unique",
        path: ["candidates"],
      })
    }
  })

type BatchResponse = Readonly<{
  marketCode: string
  schemaVersion: 1
  sources: readonly PublishedProductCatalogSource[]
}>

export async function POST(
  request: MedusaStoreRequest,
  response: MedusaResponse<BatchResponse | { message: string }>
) {
  const parsed = RequestSchema.safeParse(request.body)
  const market = parsed.success
    ? parseProductCatalogSourceMarket(parsed.data.market)
    : null
  if (!(parsed.success && market)) {
    return response.status(400).json({ message: "Invalid request" })
  }
  const result = await readPublishedProductCatalogSources(
    request,
    parsed.data.candidates as readonly ProductCatalogSourceCandidate[],
    market
  )
  if (result.kind === "missing") {
    return response
      .status(404)
      .json({ message: "Product source was not found" })
  }
  if (result.kind === "unavailable") {
    return response
      .status(503)
      .json({ message: "Product availability is temporarily unavailable" })
  }
  return response.json({
    marketCode: market,
    schemaVersion: 1,
    sources: result.sources,
  })
}
