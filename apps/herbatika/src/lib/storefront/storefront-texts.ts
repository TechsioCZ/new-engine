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
  cartAdditionalItems: "cart.additional_items",
  cartContinueToCheckout: "cart.continue_to_checkout",
  cartDiscount: "cart.discount",
  cartEmptyDescription: "cart.empty_description",
  cartEmptyTitle: "cart.empty_title",
  cartLowStock: "cart.low_stock",
  cartProductsSubtotalExclTax: "cart.products_subtotal_excl_tax",
  cartQuantityAria: "cart.quantity_aria",
  cartRemoveFailed: "cart.remove_failed",
  cartRemoveItemAria: "cart.remove_item_aria",
  cartShippingExclTax: "cart.shipping_excl_tax",
  cartTax: "cart.tax",
  cartTitle: "cart.title",
  cartTitleWithCount: "cart.title_with_count",
  cartTotalInclTax: "cart.total_incl_tax",
  cartUpdateFailed: "cart.update_failed",
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
  [STOREFRONT_TEXT_KEYS.cartAdditionalItems]:
    "Ďalšie položky v košíku: {count}",
  [STOREFRONT_TEXT_KEYS.cartContinueToCheckout]: "Pokračovať k pokladni",
  [STOREFRONT_TEXT_KEYS.cartDiscount]: "Zľava",
  [STOREFRONT_TEXT_KEYS.cartEmptyDescription]:
    "Produkty môžete pridať z katalógu.",
  [STOREFRONT_TEXT_KEYS.cartEmptyTitle]: "Váš košík je prázdny",
  [STOREFRONT_TEXT_KEYS.cartLowStock]:
    "Zostáva už len {quantity} ks",
  [STOREFRONT_TEXT_KEYS.cartProductsSubtotalExclTax]:
    "Cena produktov bez DPH",
  [STOREFRONT_TEXT_KEYS.cartQuantityAria]: "Množstvo pre {itemName}",
  [STOREFRONT_TEXT_KEYS.cartRemoveFailed]:
    "Odstránenie položky zlyhalo.",
  [STOREFRONT_TEXT_KEYS.cartRemoveItemAria]:
    "Odstrániť {itemName} z košíka",
  [STOREFRONT_TEXT_KEYS.cartShippingExclTax]: "Doprava bez DPH",
  [STOREFRONT_TEXT_KEYS.cartTax]: "DPH",
  [STOREFRONT_TEXT_KEYS.cartTitle]: "Košík",
  [STOREFRONT_TEXT_KEYS.cartTitleWithCount]: "Košík ({count})",
  [STOREFRONT_TEXT_KEYS.cartTotalInclTax]: "Spolu s DPH",
  [STOREFRONT_TEXT_KEYS.cartUpdateFailed]: "Úprava košíka zlyhala.",
} as const satisfies Record<StorefrontTextKey, string>
