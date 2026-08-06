export const PRIMARY_CATEGORY_METADATA_KEY = "primary_category_id"

export class PrimaryCategoryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PrimaryCategoryValidationError"
  }
}

/**
 * Validate the Medusa merchandising metadata invariant without coupling it to
 * HTTP or workflow infrastructure. Null/undefined clears the optional value.
 */
export const validatePrimaryCategoryAssignment = (
  primaryCategoryId: unknown,
  productCategoryIds: Iterable<string>
): string | null => {
  if (primaryCategoryId === undefined || primaryCategoryId === null) {
    return null
  }

  if (
    typeof primaryCategoryId !== "string" ||
    !primaryCategoryId.trim() ||
    primaryCategoryId !== primaryCategoryId.trim()
  ) {
    throw new PrimaryCategoryValidationError(
      "metadata.primary_category_id must be a non-empty category ID string"
    )
  }

  const assignedCategoryIds = new Set(productCategoryIds)
  if (!assignedCategoryIds.has(primaryCategoryId)) {
    throw new PrimaryCategoryValidationError(
      `metadata.primary_category_id must reference a category assigned to the product: ${primaryCategoryId}`
    )
  }

  return primaryCategoryId
}
