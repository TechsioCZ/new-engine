import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { getProductAttributeService } from "../../../../utils/product-attributes"
import type { ProductAttributeOptionRecord } from "../../../../utils/product-attributes"
import {
  applyProductAttributeStatusFilter,
  escapeProductAttributeLikePattern,
  getOptionUsageCountMap,
  parseProductAttributeOrder,
  toProductAttributeOptionResponse,
} from "../utils"
import type { AdminGetProductAttributeOptionsSchemaType } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetProductAttributeOptionsSchemaType
  >,
  res: MedusaResponse,
) {
  const { definition_id, limit, offset, order, q, status } = req.validatedQuery
  const filters: Record<string, unknown> = { definition_id }
  const escapedQuery = q ? escapeProductAttributeLikePattern(q) : undefined
  if (escapedQuery) {
    filters["$or"] = [
      { key: { $ilike: `%${escapedQuery}%` } },
      { label: { $ilike: `%${escapedQuery}%` } },
    ]
  }
  applyProductAttributeStatusFilter(filters, status)

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
