import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncStorefrontTextsWorkflow } from "../../../../workflows/storefront-text/workflows/sync-storefront-texts"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await syncStorefrontTextsWorkflow(req.scope).run()

  res.json({ result })
}
