import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createClaimWorkflow } from "../../../workflows/claim-case/workflows/create-claim"
import { resolveExactMarketSalesChannelId } from "../private-flow-utils"
import type { StoreCreateClaimSchemaType } from "./validators"

export async function POST(
  req: MedusaRequest<StoreCreateClaimSchemaType>,
  res: MedusaResponse
) {
  const salesChannelId = resolveExactMarketSalesChannelId(req)
  const { result } = await createClaimWorkflow(req.scope).run({
    input: { ...req.validatedBody, sales_channel_id: salesChannelId },
  })

  res.status(201).json(result)
}
