import type { BreadcrumbTemplateItem } from "@techsio/ui-kit/templates/breadcrumb"

import type { Category } from "@/data/static/type"

import { getCategoryPath } from "../transform/get-category-path"

export const buildBreadcrumbs = (
  categoryId: string | undefined,
  categoryMap: Record<string, Category>,
): BreadcrumbTemplateItem[] => {
  const breadcrumbs: BreadcrumbTemplateItem[] = [{ href: "/", label: "Domů" }]

  if (categoryId === null || categoryId === undefined || categoryId === "") {
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
      href: `/kategorie/${cat.handle}`,
      label: cat.name,
    })
  }

  return breadcrumbs
}

export const buildProductBreadcrumbs = (
  categoryId: string | undefined,
  categoryMap: Record<string, Category>,
  productTitle: string,
  productHandle: string,
): BreadcrumbTemplateItem[] => {
  const categoryBreadcrumbs = buildBreadcrumbs(categoryId, categoryMap)

  return [
    ...categoryBreadcrumbs,
    {
      href: `/produkt/${productHandle}`,
      isCurrent: true,
      label: productTitle,
    },
  ]
}
