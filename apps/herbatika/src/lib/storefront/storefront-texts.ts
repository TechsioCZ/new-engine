export const STOREFRONT_TEXT_KEYS = {
  cartAddToCart: "cart.add_to_cart",
  cartAddedToCart: "cart.added_to_cart",
  cartAddingToCart: "cart.adding_to_cart",
  cartFailed: "cart.failed",
  cartInsufficientQuantity: "cart.insufficient_quantity",
  cartInsufficientQuantityAvailable: "cart.insufficient_quantity_available",
  cartInsufficientQuantityInCart: "cart.insufficient_quantity_in_cart",
  cartMissingRegion: "cart.missing_region",
  cartMissingVariant: "cart.missing_variant",
  cartOutOfStock: "cart.out_of_stock",
  cartUnavailableInRegion: "cart.unavailable_in_region",
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
  [STOREFRONT_TEXT_KEYS.cartAddedToCart]: "Produkt bol pridaný do košíka.",
  [STOREFRONT_TEXT_KEYS.cartAddingToCart]: "Pridávam...",
  [STOREFRONT_TEXT_KEYS.cartFailed]: "Pridanie do košíka zlyhalo.",
  [STOREFRONT_TEXT_KEYS.cartInsufficientQuantity]:
    "Nedostatočné množstvo produktu.",
  [STOREFRONT_TEXT_KEYS.cartInsufficientQuantityAvailable]:
    "Nedostatočné množstvo produktu. Dostupné množstvo: {availableQuantity} ks.",
  [STOREFRONT_TEXT_KEYS.cartInsufficientQuantityInCart]:
    "Nedostatočné množstvo produktu. V košíku už máte {cartQuantity} ks, dostupné množstvo je {availableQuantity} ks.",
  [STOREFRONT_TEXT_KEYS.cartMissingRegion]:
    "Región sa ešte načítava. Skúste to prosím o chvíľu.",
  [STOREFRONT_TEXT_KEYS.cartMissingVariant]:
    "Produkt nemá dostupnú variantu na pridanie do košíka.",
  [STOREFRONT_TEXT_KEYS.cartOutOfStock]: "Produkt momentálne nie je skladom.",
  [STOREFRONT_TEXT_KEYS.cartUnavailableInRegion]:
    "Produkt nie je momentálne dostupný pre vybraný región.",
} as const satisfies Record<StorefrontTextKey, string>
