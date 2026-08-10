import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import type { OrderExpeditionGraph } from "../../../../utils/order-expedition"
import type { PostAdminOrderExpeditionPdfSchemaType } from "../validators"
import { createOrderExpeditionPdfResponse } from "./pdf-service"

interface OrderExpeditionPdfResponse {
  send: (body: Buffer) => unknown
  set: (headers: Record<string, number | string>) => unknown
}

export const postOrderExpeditionPdf = async (
  query: OrderExpeditionGraph,
  validatedBody: PostAdminOrderExpeditionPdfSchemaType,
  url: string,
  res: OrderExpeditionPdfResponse,
): Promise<void> => {
  const { order_ids: orderIds } = validatedBody
  const { buffer, filename } = await createOrderExpeditionPdfResponse(
    query,
    orderIds,
    url,
  )

  res.set({
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
    "Content-Type": "application/pdf",
  })
  res.send(buffer)
}

const post = async (
  req: MedusaRequest<PostAdminOrderExpeditionPdfSchemaType>,
  res: MedusaResponse,
): Promise<void> => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const url = `${req.protocol}://${req.get?.("host") ?? req.headers.host ?? "localhost"}/admin/order-expedition/pdf`
  await postOrderExpeditionPdf(query, req.validatedBody, url, res)
}

export { post as POST }
