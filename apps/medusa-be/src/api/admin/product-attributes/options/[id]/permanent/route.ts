import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { permanentlyDeleteProductAttributeOptionsWorkflow } from "../../../../../../workflows/product-attribute"

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { result } = await permanentlyDeleteProductAttributeOptionsWorkflow(
    req.scope
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })

  res.json(result)
}
