import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { orderEmailTemplates } from "../../../../utils/order-email-templates"

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json({
    templates: orderEmailTemplates,
  })
}
