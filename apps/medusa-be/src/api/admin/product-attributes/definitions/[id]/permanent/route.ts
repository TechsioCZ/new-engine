import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { permanentlyDeleteProductAttributeDefinitionsWorkflow } from "../../../../../../workflows/product-attribute/workflows/definitions"

const remove = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { result } = await permanentlyDeleteProductAttributeDefinitionsWorkflow(
    req.scope,
  ).run({
    input: { ids: [req.params["id"] ?? ""] },
  })

  res.json(result)
}

export { remove as DELETE }
