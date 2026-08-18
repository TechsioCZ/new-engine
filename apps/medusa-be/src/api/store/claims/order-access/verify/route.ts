import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyClaimAccessWorkflow } from "../../../../../workflows/claim-case/workflows/verify-claim-access"
import type { StoreVerifyClaimAccessSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreVerifyClaimAccessSchemaType>,
  res: MedusaResponse
) {
  const { result } = await verifyClaimAccessWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(200).json(result)
}
