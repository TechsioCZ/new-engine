import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { permanentlyDeleteProductAttributeOptionsWorkflow } from "../../../../../../workflows/product-attribute/workflows/options"

const deleteProductAttributeOption = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const { result } = await permanentlyDeleteProductAttributeOptionsWorkflow(
    req.scope,
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })

  res.json(result)
}

export { deleteProductAttributeOption as DELETE }
