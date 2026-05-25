import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { enqueueImportJob } from "../../../../../../../../lib/queued-job-handler"
import {
  SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_JOB_TYPE,
  SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
} from "../../../../../../../../workflows/customer-group-customers-batch/async"
import type { AssignCustomersToGroupBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/customer-groups/{code}/customers/batch
 * operationId: PostSymmyCustomerGroupCustomersBatch
 * summary: Queue customer assignment to a customer group
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
 *     description: The Symmy customer group code.
 *     required: true
 *     schema:
 *       type: string
 *       description: The Symmy customer group code.
 *   - in: header
 *     name: Idempotency-Key
 *     description: A unique key used to make the queued import request idempotent.
 *     required: false
 *     schema:
 *       type: string
 *       description: A unique key used to make the queued import request idempotent.
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyAssignCustomersToGroupBatchRequest"
 * responses:
 *   "202":
 *     description: Customer assignment import job queued, or an existing idempotent job returned.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyQueuedJobResponse"
 *   "400":
 *     description: Invalid customer assignment batch payload.
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
 * x-workflow: assignCustomersToGroupBatchWorkflow
 * x-events:
 *   - name: symmy.customer_group_customers.assign.requested
 *     payload: |-
 *       ```ts
 *       {
 *         job_id, // The ID of the Symmy import job
 *       }
 *       ```
 */
export const POST = async (
  req: MedusaRequest<AssignCustomersToGroupBatchSchemaType>,
  res: MedusaResponse
) => {
  await enqueueImportJob(req, res, {
    type: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_JOB_TYPE,
    payload: {
      code: req.params.code,
      customer_identifiers: req.validatedBody.customer_identifiers,
    },
    total: req.validatedBody.customer_identifiers.length,
    requestedEvent: SYMMY_CUSTOMER_GROUP_CUSTOMERS_ASSIGN_REQUESTED_EVENT,
  })
}
