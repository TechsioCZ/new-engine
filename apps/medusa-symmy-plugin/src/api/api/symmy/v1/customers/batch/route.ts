import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertCustomersBatchWorkflow } from "../../../../../../workflows/upsert-customers-batch/workflow"
import type { UpsertCustomersBatchSchemaType } from "./validators"

export const POST = async (
  req: MedusaRequest<UpsertCustomersBatchSchemaType>,
  res: MedusaResponse
) => {
  const { result } = await upsertCustomersBatchWorkflow(req.scope).run({
    input: { customers: req.validatedBody.customers },
  })
  res.status(200).json(result)
}
