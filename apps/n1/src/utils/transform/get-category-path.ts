import type { Category } from "@/lib/categories/types"

/**
 * Gets the full path of category IDs from root to the given category
 * @param category - The current category
 * @param categoryMap - Record of all categories by ID
 * @returns Array of category IDs from root to current category
 */
export function getCategoryPath(
  category: Category | undefined,
  categoryMap: Record<string, Category>
): string[] {
  if (!category) {
    return []
  }

  const path: string[] = []
  let current: Category | undefined = category

  // Walk up the tree collecting IDs
  while (current) {
    path.unshift(current.id) // Add to beginning to maintain order from root to leaf

    // Get parent category
    current = current.parent_category_id
      ? categoryMap[current.parent_category_id]
      : undefined
  }

  return path
}
