import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import {
  COLLECTION_URL_ASSIGNMENT_MARKETS,
  STOREFRONT_URL_ASSIGNMENT_ENTITY_KINDS,
} from "../../../../../modules/storefront-url-assignment/contracts"
import {
  readPublishedStorefrontAssignmentSources,
  STOREFRONT_ASSIGNMENT_SOURCE_BATCH_LIMIT,
} from "../../utils"

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
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sourceVersion: z.string().regex(/^[1-9]\d*$/),
  })
  .strict()

const RequestSchema = z
  .object({
    candidates: z
      .array(CandidateSchema)
      .min(1)
      .max(STOREFRONT_ASSIGNMENT_SOURCE_BATCH_LIMIT),
    entityKind: z.enum(STOREFRONT_URL_ASSIGNMENT_ENTITY_KINDS),
    market: z.enum(COLLECTION_URL_ASSIGNMENT_MARKETS),
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

export async function POST(
  request: MedusaStoreRequest,
  response: MedusaResponse
) {
  const parsed = RequestSchema.safeParse(request.body)
  if (!parsed.success) {
    return response.status(400).json({ message: "Invalid request" })
  }
  const result = await readPublishedStorefrontAssignmentSources(
    request,
    parsed.data.entityKind,
    parsed.data.market,
    parsed.data.candidates
  )
  if (result.kind === "unavailable") {
    return response
      .status(503)
      .json({ message: "Catalog availability is temporarily unavailable" })
  }
  return response.json({
    assignments: result.assignments,
    entityKind: parsed.data.entityKind,
    marketCode: parsed.data.market,
    schemaVersion: 1,
  })
}
