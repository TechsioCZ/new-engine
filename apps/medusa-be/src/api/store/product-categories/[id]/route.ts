import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  decorateCategoriesWithLocalizedContent,
  type LocalizedCategoryContentDecoratable,
  sendLocalizedCategoryContentFailure,
} from "../../../../utils/localized-category-content"
import {
  readPublishedCategoryScope,
  sendPublishedCategoryScopeFailure,
} from "../../../../utils/published-category-scope"

type StoreCategoryRequest = MedusaRequest & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

export const GET = async (req: StoreCategoryRequest, res: MedusaResponse) => {
  const categoryId = req.params.id
  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Product category was not found"
    )
  }
  const publicationScope = await readPublishedCategoryScope({
    container: req.scope,
    locale: req.locale,
    salesChannelIds: req.publishable_key_context?.sales_channel_ids,
  })
  if (
    publicationScope.kind === "invalid-response" ||
    publicationScope.kind === "unavailable"
  ) {
    sendPublishedCategoryScopeFailure(publicationScope, res)
    return
  }
  if (
    publicationScope.kind === "published" &&
    !publicationScope.categoryIds.includes(categoryId)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id: ${categoryId} was not found`
    )
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph(
    {
      entity: "product_category",
      filters: { id: categoryId, ...req.filterableFields },
      fields: req.queryConfig.fields,
    },
    { locale: req.locale }
  )
  const category = data[0] as LocalizedCategoryContentDecoratable | undefined
  if (!category) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product category with id: ${categoryId} was not found`
    )
  }

  const decoration = await decorateCategoriesWithLocalizedContent(
    req.scope,
    [category],
    req.locale
  )
  if (decoration.kind !== "decorated") {
    sendLocalizedCategoryContentFailure(decoration, res)
    return
  }

  res.json({ product_category: category })
}
