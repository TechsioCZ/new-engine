export type StorefrontTextKey = "cart.add_to_cart"

export type StorefrontTextMessages = Partial<
  Record<StorefrontTextKey | (string & {}), string>
>

export type StorefrontTextsResponse = {
  locale: string
  market: string
  messages: StorefrontTextMessages
}

export const STOREFRONT_TEXT_KEYS = {
  cartAddToCart: "cart.add_to_cart",
} as const satisfies Record<string, StorefrontTextKey>

