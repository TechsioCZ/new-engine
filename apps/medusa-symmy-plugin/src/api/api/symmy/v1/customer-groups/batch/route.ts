import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { upsertCustomerGroupsBatchWorkflow } from "../../../../../../workflows/customer-groups-batch/workflow"
import type { UpsertCustomerGroupsBatchSchemaType } from "./validators"

type AuthenticatedRequest =
  MedusaRequest<UpsertCustomerGroupsBatchSchemaType> & {
    auth_context?: {
      actor_id?: string
    }
  }

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
