import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { verifyClaimAccessWorkflow } from "../../../../../workflows/claim-case/workflows/verify-claim-access"
import { resolveExactMarketSalesChannelId } from "../../../private-flow-utils"
import type { StoreVerifyClaimAccessSchemaType } from "../../validators"

export async function POST(
  req: MedusaRequest<StoreVerifyClaimAccessSchemaType>,
  res: MedusaResponse
) {
  const salesChannelId = resolveExactMarketSalesChannelId(req)
  const { result } = await verifyClaimAccessWorkflow(req.scope).run({
    input: { ...req.validatedBody, sales_channel_id: salesChannelId },
  })

  res.status(200).json(result)
}
