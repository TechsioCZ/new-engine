import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../lib/queued-job-handler"
import {
  SYMMY_CUSTOMERS_UPSERT_JOB_TYPE,
  SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
} from "../../../../../../workflows/upsert-customers-batch/async"
import type { UpsertCustomersBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/customers/batch
 * operationId: PostSymmyCustomersBatch
 * summary: Queue customer batch upsert
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
 * parameters:
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
 *         $ref: "#/components/schemas/SymmyUpsertCustomersBatchRequest"
 * responses:
 *   "202":
 *     description: Customer upsert import job queued, or an existing idempotent job returned.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyQueuedJobResponse"
 *   "400":
 *     description: Invalid customer batch payload.
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
 * x-workflow: upsertCustomersBatchWorkflow
 * x-events:
 *   - name: symmy.customers.upsert.requested
 *     payload: |-
 *       ```ts
 *       {
 *         job_id, // The ID of the Symmy import job
 *       }
 *       ```
 */
export const POST = async (
  req: MedusaRequest<UpsertCustomersBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_CUSTOMERS_UPSERT_JOB_TYPE,
    payload: { customers: req.validatedBody.customers },
    total: req.validatedBody.customers.length,
    requestedEvent: SYMMY_CUSTOMERS_UPSERT_REQUESTED_EVENT,
  })
}
