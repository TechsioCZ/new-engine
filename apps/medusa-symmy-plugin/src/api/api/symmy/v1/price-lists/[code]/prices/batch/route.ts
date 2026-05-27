import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../../../lib/queued-job-handler"
import {
  SYMMY_PRICE_LIST_PRICES_UPDATE_JOB_TYPE,
  SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
} from "../../../../../../../../workflows/price-lists-batch/async"
import type { UpdatePriceListPricesBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/price-lists/{code}/prices/batch
 * operationId: PostSymmyPriceListPricesBatch
 * summary: Queue price list price updates
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
 * parameters:
 *   - in: path
 *     name: code
 *     description: The Symmy price list code.
 *     required: true
 *     schema:
 *       type: string
 *   - in: header
 *     name: Idempotency-Key
 *     description: A unique key used to make the queued import request idempotent.
 *     required: false
 *     schema:
 *       type: string
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyUpdatePriceListPricesBatchRequest"
 * responses:
 *   "202":
 *     description: Price list price update import job queued, or an existing idempotent job returned.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyQueuedJobResponse"
 *   "400":
 *     description: Invalid price list price batch payload.
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
 * x-workflow: updatePriceListPricesBatchWorkflow
 * x-events:
 *   - name: symmy.price_list_prices.update.requested
 *     payload: |-
 *       ```ts
 *       {
 *         job_id, // The ID of the Symmy import job
 *       }
 *       ```
 */
export const POST = async (
  req: MedusaRequest<UpdatePriceListPricesBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_PRICE_LIST_PRICES_UPDATE_JOB_TYPE,
    payload: {
      code: req.params.code,
      prices: req.validatedBody.prices,
    },
    total: req.validatedBody.prices.length,
    requestedEvent: SYMMY_PRICE_LIST_PRICES_UPDATE_REQUESTED_EVENT,
  })
}
