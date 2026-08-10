/**
 * Prefetch Configuration
 *
 * Centralized configuration for all prefetch strategies and timing.
 * Controls when and how aggressively we prefetch data to optimize perceived performance.
 */

/**
 * Prefetch delays in milliseconds
 *
 * Philosophy:
 * - Immediate (0ms): Critical path, user likely to need
 * - Fast (200-400ms): High probability, preload during idle time
 * - Medium (500-800ms): Medium probability, background prefetch
 * - Slow (1500ms+): Low priority, only after critical work done
 */
export const PREFETCH_DELAYS = {
  /**
   * Category children prefetch delay
   * Used by: usePrefetchCategoryChildren
   * Context: Category page mount, immediate Phase 1 prefetch
   * Rationale: Children are highly likely next navigation target
   */
  CATEGORY_CHILDREN: 0,

  /**
   * Category hover prefetch delay
   * Used by: usePrefetchOnHover
   * Context: Hover on category trigger in TreeView
   * Rationale: 300ms balances responsiveness with avoiding waste on quick mouse movements
   */
  CATEGORY_HOVER: 300,

  /**
   * Pagination prefetch delays by priority
   * Used by: usePrefetchPages
   */
  PAGES: {
    /**
     * HIGH priority: Next page (page + 1)
     * Immediate prefetch - user most likely to click "next"
     */
    HIGH: 0,

    /**
     * LOW priority: Previous, first, last pages
     * 1500ms delay - escape routes, prefetch last
     */
    LOW: 1500,

    /**
     * MEDIUM priority: Page after next (page + 2)
     * 500ms delay - possible but less likely
     */
    MEDIUM: 500,
  },

  /**
   * Individual product detail prefetch delay
   * Used by: usePrefetchProduct
   * Context: Hover/focus on product card
   * Rationale: 400ms is typical hover dwell time before click
   */
  PRODUCT_DETAIL: 400,

  /**
   * Root categories prefetch delay
   * Used by: PrefetchManager, usePrefetchRootCategories
   * Context: Homepage load, category page mount
   * Rationale: 200ms allows hero content to render first
   */
  ROOT_CATEGORIES: 200,
} as const
