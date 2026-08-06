import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { createProductAttributeOptionWorkflow } from "../../../../../../workflows/product-attribute/workflows/options"
import {
  retrieveProductAttributeDefinitionOrThrow,
  toProductAttributeOptionResponse,
} from "../../../utils"
import type { AdminCreateProductAttributeOptionSchemaType } from "../../../validators"

const createProductAttributeOption = async (
  req: AuthenticatedMedusaRequest<AdminCreateProductAttributeOptionSchemaType>,
  res: MedusaResponse,
) => {
  const definitionId = req.params["id"] ?? ""
  await retrieveProductAttributeDefinitionOrThrow(req.scope, definitionId)
  const { result } = await createProductAttributeOptionWorkflow(req.scope).run({
    input: {
      definition_id: definitionId,
      ...req.validatedBody,
    },
  })
  res.status(201).json({
    option: toProductAttributeOptionResponse(result, 0),
  })
}

export { createProductAttributeOption as POST }
