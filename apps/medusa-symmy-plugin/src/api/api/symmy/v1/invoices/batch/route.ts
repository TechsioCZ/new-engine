import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { attachInvoicesBatchWorkflow } from "../../../../../../workflows/attach-invoices-batch/workflow"
import type { AttachInvoicesBatchSchemaType } from "./validators"

type AuthenticatedRequest = MedusaRequest<AttachInvoicesBatchSchemaType> & {
  auth_context?: {
    actor_id?: string
  }
}

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
