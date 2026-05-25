import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertCustomerGroupsBatchWorkflow } from "../../../../../../workflows/customer-groups-batch/workflow"
import type { UpsertCustomerGroupsBatchSchemaType } from "./validators"

type AuthenticatedRequest =
  MedusaRequest<UpsertCustomerGroupsBatchSchemaType> & {
    auth_context?: {
      actor_id?: string
    }
  }

/**
 * @api [post] /api/symmy/v1/customer-groups/batch
 * operationId: PostSymmyCustomerGroupsBatch
 * summary: Upsert customer groups in batch
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * x-authenticated: true
 * security:
 *   - api_token: []
 *   - cookie_auth: []
 *   - jwt_token: []
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyUpsertCustomerGroupsBatchRequest"
 * responses:
 *   "200":
 *     description: Per-customer-group upsert results.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyUpsertCustomerGroupsBatchResponse"
 *   "400":
 *     description: Invalid customer group batch payload.
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
 * x-workflow: upsertCustomerGroupsBatchWorkflow
 * x-events: []
 */
export const POST = async (
  req: MedusaRequest<UpsertCustomerGroupsBatchSchemaType>,
  res: MedusaResponse
) => {
  const authReq = req as AuthenticatedRequest
  const { result } = await upsertCustomerGroupsBatchWorkflow(req.scope).run({
    input: {
      created_by: authReq.auth_context?.actor_id,
      customer_groups: req.validatedBody.customer_groups,
    },
  })
  res.status(200).json(result)
}
