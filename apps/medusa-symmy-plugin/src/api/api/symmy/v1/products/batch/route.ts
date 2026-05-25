import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/upsert-products-batch/async"
import type { UpsertProductsBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/products/batch
 * operationId: PostSymmyProductsBatch
 * summary: Queue product batch upsert
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
 *         $ref: "#/components/schemas/SymmyUpsertProductsBatchRequest"
 * responses:
 *   "202":
 *     description: Product upsert import job queued, or an existing idempotent job returned.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyQueuedJobResponse"
 *   "400":
 *     description: Invalid product batch payload.
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
  req: MedusaRequest<UpsertProductsBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRODUCTS_UPSERT_JOB_TYPE,
    payload: { products: req.validatedBody.products },
    total: req.validatedBody.products.length,
    requestedEvent: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
  })
}
