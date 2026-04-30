import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertPriceListsBatchWorkflow } from "../../../../../../workflows/price-lists-batch/workflow"
import type { UpsertPriceListsBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertPriceListsBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await upsertPriceListsBatchWorkflow(req.scope).run({
    input: { price_lists: req.validatedBody.price_lists },
  })
  res.status(200).json(result)
}
