import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { attachInvoicesBatchWorkflow } from "../../../../../../workflows/attach-invoices-batch/workflow"
import type { AttachInvoicesBatchSchemaType } from "./validators"

type AuthenticatedRequest = MedusaRequest<AttachInvoicesBatchSchemaType> & {
  auth_context?: {
    actor_id?: string
  }
}

/**
 * @api [post] /api/symmy/v1/invoices/batch
 * operationId: PostSymmyInvoicesBatch
 * summary: Attach invoices to orders in batch
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyAttachInvoicesBatchRequest"
 * responses:
 *   "200":
 *     description: Per-invoice attachment results.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyAttachInvoicesBatchResponse"
 *   "400":
 *     description: Invalid invoice batch payload.
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
  req: MedusaRequest<AttachInvoicesBatchSchemaType>,
  res: MedusaResponse
) => {
  const authReq = req as AuthenticatedRequest
  const { result } = await attachInvoicesBatchWorkflow(req.scope).run({
    input: {
      invoices: req.validatedBody.invoices,
      user_id: authReq.auth_context?.actor_id,
    },
  })
  res.status(200).json(result)
}
