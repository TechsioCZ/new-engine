import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createClaimWorkflow } from "../../../workflows/claim-case/workflows/create-claim"
import type { StoreCreateClaimSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<StoreCreateClaimSchemaType>,
  res: MedusaResponse
) {
  const { result } = await createClaimWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json(result)
}
