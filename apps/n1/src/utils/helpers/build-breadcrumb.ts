import type { BreadcrumbItemType } from "@techsio/ui-kit/molecules/breadcrumb"
import type { Category } from "@/lib/categories/types"
import { getCategoryPath } from "../transform/get-category-path"

export function buildBreadcrumbs(
  categoryId: string | undefined,
  categoryMap: Record<string, Category>
): BreadcrumbItemType[] {
  const breadcrumbs: BreadcrumbItemType[] = [{ label: "Domů", href: "/" }]

  if (!categoryId) {
    return breadcrumbs
  }

  const category = categoryMap[categoryId]
  if (!category) {
    return breadcrumbs
  }

  const pathIds = getCategoryPath(category, categoryMap)

  for (const id of pathIds) {
    const cat = categoryMap[id]
    if (!cat) {
      continue
    }

    breadcrumbs.push({
      label: cat.name,
      href: `/kategorie/${cat.handle}`,
    })
  }

  return breadcrumbs
}

export function buildProductBreadcrumbs(
  categoryId: string | undefined,
  categoryMap: Record<string, Category>,
  productTitle: string,
  productHandle: string
): BreadcrumbItemType[] {
  const categoryBreadcrumbs = buildBreadcrumbs(categoryId, categoryMap)

  return [
    ...categoryBreadcrumbs,
    {
      label: productTitle,
      href: `/produkt/${productHandle}`,
      isCurrent: true,
    },
  ]
}
