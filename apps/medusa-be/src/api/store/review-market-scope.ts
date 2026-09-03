import type { MedusaRequest } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../modules/storefront-url-assignment/service"
import { parseProductPublicationSnapshot } from "../../modules/url-registry-outbox/product-publication-assignment"

type StoreRequestWithPublishableKeyContext = MedusaRequest & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

const OTHER_MARKETS = ["cz", "hu", "ro"] as const

const resolveExactSalesChannelId = (value: unknown) => {
  const ids = Array.isArray(value)
    ? value.filter(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.length > 0
      )
    : []
  const uniqueIds = [...new Set(ids)]

  return uniqueIds.length === 1 ? uniqueIds[0] : null
}

export const hasExactSlovakReviewScope = async (
  request: StoreRequestWithPublishableKeyContext,
  productId?: string
) => {
  const salesChannelId = resolveExactSalesChannelId(
    request.publishable_key_context?.sales_channel_ids
  )
  if (!salesChannelId) {
    return false
  }

  try {
    if (productId) {
      const query = request.scope.resolve<Query>(
        ContainerRegistrationKeys.QUERY
      )
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "metadata", "updated_at", "sales_channels.id"],
        filters: { id: productId, status: ProductStatus.PUBLISHED },
        pagination: { take: 2 },
      })
      if (products.length !== 1) {
        return false
      }

      const assignments = parseProductPublicationSnapshot(
        products[0]
      ).assignments
      const slovakAssignment = assignments.sk

      return (
        slovakAssignment?.publicationStatus === "published" &&
        slovakAssignment.salesChannelId === salesChannelId &&
        OTHER_MARKETS.every(
          (marketCode) =>
            assignments[marketCode]?.salesChannelId !== salesChannelId
        )
      )
    }

    const service = request.scope.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
    const commonFilters = {
      publication_status: "published" as const,
      sales_channel_id: salesChannelId,
    }
    const [slovakAssignments, ...foreignAssignments] = await Promise.all([
      service.listStorefrontUrlAssignments(
        { ...commonFilters, market_code: "sk" },
        { select: ["id"], take: 1 }
      ),
      ...OTHER_MARKETS.map((marketCode) =>
        service.listStorefrontUrlAssignments(
          { ...commonFilters, market_code: marketCode },
          { select: ["id"], take: 1 }
        )
      ),
    ])

    return (
      slovakAssignments.length === 1 &&
      foreignAssignments.every((assignments) => assignments.length === 0)
    )
  } catch {
    return false
  }
}
