import type { CatalogListInputBase } from "@techsio/storefront-data/catalog/types"

export const SALE_CATEGORY_HANDLE = "vypredaj-zlavy-a-akcie"

type CategoryCatalogScope = {
  categoryIds?: string[]
  onSale?: CatalogListInputBase["on_sale"]
}

export const isSaleCategoryHandle = (slug: string) =>
  slug === SALE_CATEGORY_HANDLE

export const resolveCategoryCatalogScope = (
  slug: string,
  categoryIds: string[]
): CategoryCatalogScope =>
  isSaleCategoryHandle(slug) ? { onSale: true } : { categoryIds }
