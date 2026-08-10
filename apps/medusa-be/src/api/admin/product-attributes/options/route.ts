import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getProductAttributeService } from "../../../../utils/product-attributes"
import {
  applyProductAttributeStatusFilter,
  escapeProductAttributeLikePattern,
  getOptionUsageCountMap,
  parseProductAttributeOrder,
  toProductAttributeOptionResponse,
} from "../utils"
import type { AdminGetProductAttributeOptionsSchemaType } from "../validators"

const get = async (
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetProductAttributeOptionsSchemaType
  >,
  res: MedusaResponse,
) => {
  const { definition_id, limit, offset, order, q, status } = req.validatedQuery
  const escapedQuery =
    typeof q === "string" && q.length > 0
      ? escapeProductAttributeLikePattern(q)
      : undefined
  const baseFilters = {
    definition_id,
    ...(typeof escapedQuery === "string" && escapedQuery.length > 0
      ? {
          $or: [
            { key: { $ilike: `%${escapedQuery}%` } },
            { label: { $ilike: `%${escapedQuery}%` } },
          ],
        }
      : {}),
  }
  const filters = applyProductAttributeStatusFilter(baseFilters, status)

  const [options, count] = await getProductAttributeService(
    req.scope,
  ).listAndCountProductAttributeOptions(filters, {
    order: parseProductAttributeOrder(order),
    skip: offset,
    take: limit,
    withDeleted: status !== "active",
  })
  const usageCounts = await getOptionUsageCountMap(
    req.scope,
    options.map((option) => option.id),
  )

  res.json({
    count,
    limit,
    offset,
    options: options.map((option) =>
      toProductAttributeOptionResponse(option, usageCounts.get(option.id) ?? 0),
    ),
  })
}

export { get as GET }
