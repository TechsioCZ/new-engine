import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { HttpTypes } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { GET as listProducts } from "@medusajs/medusa/api/admin/products/route"

import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

const get = async (
  req: AuthenticatedMedusaRequest<HttpTypes.AdminProductListParams>,
  res: MedusaResponse<HttpTypes.AdminProductListResponse>,
): Promise<void> => {
  req.filterableFields = await normalizeProductSalesChannelFilter(
    req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY),
    req.filterableFields,
  )
  await listProducts(req, res)
}

export { get as GET }
