import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertProductsBatchWorkflow } from "../../../../../../workflows/upsert-products-batch"
import type { UpsertProductsBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertProductsBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await upsertProductsBatchWorkflow(req.scope).run({
    input: { products: req.validatedBody.products },
  })
  res.status(200).json(result)
}
