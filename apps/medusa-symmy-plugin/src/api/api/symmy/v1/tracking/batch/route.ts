import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { addTrackingBatchWorkflow } from "../../../../../../workflows/add-tracking-batch/workflow"
import type { AddTrackingBatchSchemaType } from "./validators"

type AuthenticatedRequest = MedusaRequest<AddTrackingBatchSchemaType> & {
  auth_context?: {
    actor_id?: string
  }
}

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
