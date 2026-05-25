import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addTrackingBatchWorkflow } from "../../../../../../workflows/add-tracking-batch/workflow"
import type { AddTrackingBatchSchemaType } from "./validators"

type AuthenticatedRequest = MedusaRequest<AddTrackingBatchSchemaType> & {
  auth_context?: {
    actor_id?: string
  }
}

/**
 * @api [post] /api/symmy/v1/tracking/batch
 * operationId: PostSymmyTrackingBatch
 * summary: Add tracking to orders in batch
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyAddTrackingBatchRequest"
 * responses:
 *   "200":
 *     description: Per-shipment tracking results.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyAddTrackingBatchResponse"
 *   "400":
 *     description: Invalid tracking batch payload.
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
  req: MedusaRequest<AddTrackingBatchSchemaType>,
  res: MedusaResponse
) => {
  const authReq = req as AuthenticatedRequest
  const { result } = await addTrackingBatchWorkflow(req.scope).run({
    input: {
      created_by: authReq.auth_context?.actor_id,
      shipments: req.validatedBody.shipments,
    },
  })
  res.status(200).json(result)
}
