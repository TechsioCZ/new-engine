import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import type { StoreBrandsDetailSchemaType } from "../validators"

const get = async (
  req: MedusaRequest<unknown, StoreBrandsDetailSchemaType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "brand",
    filters: {
      id: req.params["id"] ?? "-1",
    },
    ...req.queryConfig,
  })

  const brand = z
    .array(z.object({ id: z.string() }).loose())
    .parse(data)
    .at(0)
  if (brand === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${req.params["id"]}" was not found`,
    )
  }

  res.json(brand)
}

export { get as GET }
