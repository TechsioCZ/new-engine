import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  decorateCategoriesWithLocalizedContent,
  type LocalizedCategoryContentDecoratable,
  sendLocalizedCategoryContentFailure,
} from "../../../utils/localized-category-content"
import {
  intersectPublishedCategoryIds,
  readPublishedCategoryScope,
  sendPublishedCategoryScopeFailure,
} from "../../../utils/published-category-scope"

type StoreCategoryRequest = MedusaRequest & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

type StoreCategoryNode = LocalizedCategoryContentDecoratable & {
  category_children?: StoreCategoryNode[]
}

const collectPublishedCategoryNodes = (
  categories: StoreCategoryNode[],
  publishedIds: readonly string[]
) => {
  const published = new Set(publishedIds)
  const nodes: StoreCategoryNode[] = []
  const visit = (category: StoreCategoryNode) => {
    nodes.push(category)
    if (!Array.isArray(category.category_children)) {
      return
    }
    category.category_children = category.category_children.filter((child) =>
      published.has(child.id)
    )
    for (const child of category.category_children) {
      visit(child)
    }
  }
  for (const category of categories) {
    visit(category)
  }
  return nodes
}

export const GET = async (req: StoreCategoryRequest, res: MedusaResponse) => {
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

  const categoryIds =
    publicationScope.kind === "published"
      ? intersectPublishedCategoryIds(
          publicationScope.categoryIds,
          req.filterableFields.id
        )
      : null
  if (categoryIds?.length === 0) {
    res.json({
      product_categories: [],
      count: 0,
      offset: req.queryConfig.pagination?.skip,
      limit: req.queryConfig.pagination?.take,
    })
    return
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const { data: productCategories, metadata } = await query.graph(
    {
      entity: "product_category",
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        ...(categoryIds ? { id: categoryIds } : {}),
      },
      pagination: req.queryConfig.pagination,
    },
    { locale: req.locale }
  )

  const categories = productCategories as StoreCategoryNode[]
  const categoriesToDecorate = categoryIds
    ? collectPublishedCategoryNodes(categories, categoryIds)
    : categories
  const decoration = await decorateCategoriesWithLocalizedContent(
    req.scope,
    categoriesToDecorate,
    req.locale
  )
  if (decoration.kind !== "decorated") {
    sendLocalizedCategoryContentFailure(decoration, res)
    return
  }

  res.json({
    product_categories: productCategories,
    count: metadata?.count ?? productCategories.length,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
