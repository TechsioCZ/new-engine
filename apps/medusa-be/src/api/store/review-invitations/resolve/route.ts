import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import type ProductReviewModuleService from "../../../../modules/product-review/service"
import { normalizeProductSalesChannelFilter } from "../../../utils/product-filters"
import {
  privateFlowNotFound,
  requireExactBodyString,
  resolveExactMarketSalesChannelId,
  setPrivateNoStore,
} from "../../private-flow-utils"

type ResolveReviewInvitationBody = {
  token?: string
}

type ReviewTokenRecord = {
  expires_at?: Date | null | string
  product_id: string
  token: string
  used_at?: Date | null | string
}

type ReviewTokenService = ProductReviewModuleService & {
  listReviewTokens: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<ReviewTokenRecord[]>
}

type ProductRecord = {
  id: string
}

export async function POST(
  request: MedusaStoreRequest<ResolveReviewInvitationBody>,
  response: MedusaResponse
) {
  setPrivateNoStore(response)
  const token = requireExactBodyString(request.body, "token")
  const salesChannelId = resolveExactMarketSalesChannelId(request)
  const reviewService = request.scope.resolve<ReviewTokenService>(
    PRODUCT_REVIEW_MODULE
  )
  const [reviewToken] = await reviewService.listReviewTokens(
    { token },
    {
      select: ["token", "product_id", "expires_at", "used_at"],
      take: 1,
    }
  )

  if (
    !reviewToken ||
    reviewToken.token !== token ||
    reviewToken.used_at ||
    (reviewToken.expires_at &&
      new Date(reviewToken.expires_at).getTime() <= Date.now())
  ) {
    return privateFlowNotFound()
  }

  const query = request.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = request.scope.resolve(
    ContainerRegistrationKeys.REMOTE_QUERY
  )
  const filters = await normalizeProductSalesChannelFilter(query, remoteQuery, {
    id: reviewToken.product_id,
    sales_channel_id: salesChannelId,
    status: ProductStatus.PUBLISHED,
  })
  const { data } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters,
    pagination: { take: 1 },
  })
  const product = (data as ProductRecord[])[0]

  if (!product || product.id !== reviewToken.product_id) {
    return privateFlowNotFound()
  }

  response.json({ product_id: product.id })
}
