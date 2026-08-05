import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { PostAdminOrderExpeditionPdfSchemaType } from "../validators"
import { createOrderExpeditionPdfResponse } from "./pdf-service"

export async function POST(
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>,
  res: MedusaResponse,
): Promise<void> {
  const { order_ids: orderIds } = req.validatedBody
  const { buffer, filename } = await createOrderExpeditionPdfResponse(
    req,
    orderIds,
  )

  res.set({
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
    "Content-Type": "application/pdf",
  })
  res.send(buffer)
}
