export const getProductBrandIdsToReplace = (
  currentIds: string[],
  activeBrandIds: Set<string>,
  nextIds: string[],
  dismissInactive = false,
) =>
  dismissInactive || nextIds.length
    ? currentIds
    : currentIds.filter((brandId) => activeBrandIds.has(brandId))
