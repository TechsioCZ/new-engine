import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requestClaimAccessWorkflow } from "../../../../../workflows/claim-case/workflows/request-claim-access"
import { resolveExactMarketSalesChannelId } from "../../../private-flow-utils"
import type { StoreRequestClaimAccessSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreRequestClaimAccessSchemaType>,
  res: MedusaResponse
) {
  const salesChannelId = resolveExactMarketSalesChannelId(req)
  const { result } = await requestClaimAccessWorkflow(req.scope).run({
    input: { ...req.validatedBody, sales_channel_id: salesChannelId },
  })

  res.status(202).json(result)
}
