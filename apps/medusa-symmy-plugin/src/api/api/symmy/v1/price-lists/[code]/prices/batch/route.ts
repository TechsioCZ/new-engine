import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updatePriceListPricesBatchWorkflow } from "../../../../../../../../workflows/price-lists-batch/workflow"
import type { UpdatePriceListPricesBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpdatePriceListPricesBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await updatePriceListPricesBatchWorkflow(req.scope).run({
    input: {
      code: req.params.code,
      prices: req.validatedBody.prices,
    },
  })
  res.status(200).json(result)
}
