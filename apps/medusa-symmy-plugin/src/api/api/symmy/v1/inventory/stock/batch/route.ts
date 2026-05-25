import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateStockBatchWorkflow } from "../../../../../../../workflows/update-stock-batch"
import type { UpdateStockBatchSchemaType } from "./validators"

/**
 * @api [post] /api/symmy/v1/inventory/stock/batch
 * operationId: PostSymmyInventoryStockBatch
 * summary: Update inventory stock in batch
 * tags:
 *   - Symmy
 * description: Requires Medusa user authentication through bearer token, session, or API key.
 * requestBody:
 *   required: true
 *   content:
 *     application/json:
 *       schema:
 *         $ref: "#/components/schemas/SymmyUpdateStockBatchRequest"
 * responses:
 *   "200":
 *     description: Per-stock-update results.
 *     content:
 *       application/json:
 *         schema:
 *           $ref: "#/components/schemas/SymmyUpdateStockBatchResponse"
 *   "400":
 *     description: Invalid stock batch payload.
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
  req: MedusaRequest<UpdateStockBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await updateStockBatchWorkflow(req.scope).run({
    input: { updates: req.validatedBody.updates },
  })
  res.status(200).json(result)
}
