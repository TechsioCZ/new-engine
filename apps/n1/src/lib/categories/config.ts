// App-level escape hatch for hiding categories from the runtime registry.
// Keep this empty unless business explicitly wants a storefront category hidden.
export const hiddenCategoryHandles: readonly string[] = []

// Homepage merchandising is app-owned. Keep the featured categories explicit instead of
// inferring them from generic registry structure such as leaf nodes.
// If a configured handle disappears from the backend, the homepage falls back to root categories.
export const featuredHomeCategoryHandles: readonly string[] = [
  "cyklo-category-378",
  "moto-category-424",
]
