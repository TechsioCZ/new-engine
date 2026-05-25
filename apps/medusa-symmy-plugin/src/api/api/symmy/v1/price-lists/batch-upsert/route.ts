import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
  SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/price-lists-batch/async"
import type { UpsertPriceListsBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/price-lists/batch-upsert
 * operationId: PostSymmyPriceListsBatchUpsert
 * summary: Queue price list batch upsert
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * parameters:
 *   - in: header
 *     name: Idempotency-Key
 *     required: false
 *     schema:
 *       type: string
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyUpsertPriceListsBatchRequest"
 * responses:
 *   "202":
 *     description: Price list upsert import job queued, or an existing idempotent job returned.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyQueuedJobResponse"
 *   "400":
 *     description: Invalid price list batch payload.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyValidationErrorResponse"
 *   "401":
 *     description: Missing or invalid authentication token.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyUnauthorizedErrorResponse"
 *   "500":
 *     description: Unexpected Symmy API error.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyInternalErrorResponse"
 */
export const POST = async (
  req: MedusaRequest<UpsertPriceListsBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRICE_LISTS_UPSERT_JOB_TYPE,
    payload: { price_lists: req.validatedBody.price_lists },
    total: req.validatedBody.price_lists.length,
    requestedEvent: SYMMY_PRICE_LISTS_UPSERT_REQUESTED_EVENT,
  })
}
