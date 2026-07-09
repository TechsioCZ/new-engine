export const STOREFRONT_TEXT_KEYS = {
  cartAddToCart: "cart.add_to_cart",
} as const

export type StorefrontTextKey =
  (typeof STOREFRONT_TEXT_KEYS)[keyof typeof STOREFRONT_TEXT_KEYS]

export type StorefrontTextMessages = Partial<
  Record<StorefrontTextKey | (string & {}), string>
>

export type StorefrontTextsResponse = {
  locale: string
  market: string
  messages: StorefrontTextMessages
}

export const DEFAULT_STOREFRONT_TEXT_MESSAGES = {
  [STOREFRONT_TEXT_KEYS.cartAddToCart]: "Do košíka",
} as const satisfies Record<StorefrontTextKey, string>
