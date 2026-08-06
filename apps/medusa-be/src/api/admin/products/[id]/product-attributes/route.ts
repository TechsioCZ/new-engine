import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { setProductAttributesWorkflow } from "../../../../../workflows/product-attribute/workflows/set-product-attributes"
import { getProductAttributeDetail } from "../../../product-attributes/utils"
import type { AdminSetProductAttributesSchemaType } from "../../../product-attributes/validators"

const ensureProductExists = async (
  req: AuthenticatedMedusaRequest,
  productId: string,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: productId },
    pagination: { take: 1 },
  })
  if (z.array(z.object({ id: z.string() })).parse(data).length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product "${productId}" was not found.`,
    )
  }
}

const get = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const productId = req.params["id"] ?? ""
  await ensureProductExists(req, productId)
  res.json({
    product_attributes: await getProductAttributeDetail(req.scope, productId),
  })
}

export { get as GET }

const post = async (
  req: AuthenticatedMedusaRequest<AdminSetProductAttributesSchemaType>,
  res: MedusaResponse,
) => {
  const productId = req.params["id"] ?? ""
  await setProductAttributesWorkflow(req.scope).run({
    input: {
      operations: req.validatedBody.operations,
      product_id: productId,
    },
  })
  res.json({
    product_attributes: await getProductAttributeDetail(req.scope, productId),
  })
}

export { post as POST }
