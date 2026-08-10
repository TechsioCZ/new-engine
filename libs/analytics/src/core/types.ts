/**
 * E-commerce event types shared across all analytics providers
 */

export interface EcommerceProduct {
  id: string
  name: string
  price: number
  currency: string
  quantity?: number
  category?: string
  variant?: string
  sku?: string
}

export interface CoreViewContentParams {
  productId: string
  productName: string
  /** Unit value (usually product price). */
  value: number
  currency: string
  category?: string
}

export interface CoreAddToCartParams {
  productId: string
  productName: string
  /** Total value for the added quantity (e.g. unitPrice * quantity). */
  value: number
  currency: string
  quantity: number
  category?: string
}

export interface CoreCheckoutItem {
  productId: string
  quantity: number
}

export interface CoreInitiateCheckoutParams {
  /**
   * Optional detailed cart items. Prefer this over `productIds` so adapters can
   * pass accurate per-item quantities to analytics providers.
   */
  items?: CoreCheckoutItem[]
  productIds: string[]
  /** Total cart value. */
  value: number
  currency: string
  numItems: number
}

export interface CorePurchaseParams {
  orderId: string
  /** Total order value. */
  value: number
  currency: string
  numItems: number
  products: EcommerceProduct[]
  /** Customer email (optional - used by Leadhub for customer identification) */
  email?: string
}

// ============================================================================
// Unified Analytics Adapter Interface
// ============================================================================

/**
 * Analytics adapter interface for unified tracking
 * Each provider implements this interface to enable unified event tracking
 */
export interface AnalyticsAdapter {
  /** Unique identifier for this adapter (e.g., 'meta', 'google', 'leadhub') */
  readonly key: string
  /** Track product view event */
  trackViewContent?: (params: CoreViewContentParams) => boolean
  /** Track add to cart event */
  trackAddToCart?: (params: CoreAddToCartParams) => boolean
  /** Track checkout initiation event */
  trackInitiateCheckout?: (params: CoreInitiateCheckoutParams) => boolean
  /** Track purchase/conversion event */
  trackPurchase?: (params: CorePurchaseParams) => boolean
  /** Track custom event */
  trackCustom?: (eventName: string, params?: object) => boolean
}
