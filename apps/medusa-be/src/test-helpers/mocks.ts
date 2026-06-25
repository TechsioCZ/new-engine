export const getProductBrandLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .sort()
    .map((productId) => `product-brand:${productId}`)

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[]
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const getProductBrandIdsToReplace = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[]
) =>
  nextIds.length
    ? currentIds
    : currentIds.filter((brandId) => activeBrandIds.has(brandId))

export const ensureProductsAssignableToBrand = async (
  scope: { links?: Array<{ brand_id: string; product_id: string }> },
  brandId: string,
  productIds: string[]
) => {
  const conflictingProducts = (scope.links ?? [])
    .filter((link) => productIds.includes(link.product_id))
    .filter((link) => link.brand_id !== brandId)
    .map((link) => link.product_id)

  if (conflictingProducts.length) {
    throw new Error(
      `Products are already linked to another brand: ${conflictingProducts.join(", ")}`
    )
  }
}

export const createScope = ({
  links = [],
}: {
  links?: Array<{ brand_id: string; product_id: string }>
}) => ({
  links,
})
