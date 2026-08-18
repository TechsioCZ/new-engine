import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestClaimAccessWorkflow } from "../../../../../workflows/claim-case/workflows/request-claim-access"
import type { StoreRequestClaimAccessSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreRequestClaimAccessSchemaType>,
  res: MedusaResponse
) {
  const { result } = await requestClaimAccessWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(202).json(result)
}
