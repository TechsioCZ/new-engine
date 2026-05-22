import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateStockBatchWorkflow } from "../../../../../../../workflows/update-stock-batch"
import type { UpdateStockBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpdateStockBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await updateStockBatchWorkflow(req.scope).run({
    input: { updates: req.validatedBody.updates },
  })
  res.status(200).json(result)
}
