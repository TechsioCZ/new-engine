export const getProductBrandIdsToReplace = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[]
) =>
  nextIds.length
    ? currentIds
    : currentIds.filter((brandId) => activeBrandIds.has(brandId))
