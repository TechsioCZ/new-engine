export const getProductBrandLockKeys = (productIds: string[]) =>
  [...new Set(productIds)]
    .toSorted()
    .map((productId) => `product-brand:${productId}`)

export const getBrandProductsLockKeys = (
  brandId: string,
  productIds: string[],
) => [`brand-products:${brandId}`, ...getProductBrandLockKeys(productIds)]

export const ensureProductsAssignableToBrand = async (
  scope: { links?: { brand_id: string; product_id: string }[] },
  brandId: string,
  productIds: string[],
) => {
  const productIdSet = new Set(productIds)
  const conflictingProducts = (scope.links ?? []).flatMap((link) =>
    productIdSet.has(link.product_id) && link.brand_id !== brandId
      ? [link.product_id]
      : [],
  )

  if (conflictingProducts.length > 0) {
    await Promise.reject(
      new Error(
        `Products are already linked to another brand: ${conflictingProducts.join(", ")}`,
      ),
    )
  }
}

export const createScope = ({
  links = [],
}: {
  links?: { brand_id: string; product_id: string }[]
}) => ({
  links,
})
