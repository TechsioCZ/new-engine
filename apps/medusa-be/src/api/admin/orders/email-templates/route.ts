import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { orderEmailTemplates } from "../../../../utils/order-email-templates"

const getEmailTemplates = (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({
    templates: orderEmailTemplates,
  })
}

export { getEmailTemplates as GET }
