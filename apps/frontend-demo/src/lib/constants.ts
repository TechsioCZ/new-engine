/**
 * Centralized constants for the application
 */

// Storage keys
export const STORAGE_KEYS = {
  // Cart
  CART_ID: "medusa_cart_id",

  // User preferences
  THEME: "theme",
  LANGUAGE: "language",
  CURRENCY: "currency",

  // UI state
  SIDEBAR_OPEN: "sidebar_open",
  FILTERS_OPEN: "filters_open",

  // Feature data
  RECENTLY_VIEWED: "recently_viewed_products",
  SEARCH_HISTORY: "search_history",

  // Temporary data
  FORM_DRAFT: "temp_form_draft",
  CHECKOUT_DRAFT: "temp_checkout_draft",
} as const

// API configuration
