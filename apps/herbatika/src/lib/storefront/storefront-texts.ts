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
  checkoutBackToCart: "checkout.back_to_cart",
  checkoutBackToShippingPayment: "checkout.back_to_shipping_payment",
  checkoutCartEmpty: "checkout.cart_empty",
  checkoutCartNotReady: "checkout.cart_not_ready",
  checkoutCompleteFailed: "checkout.complete_failed",
  checkoutCompleteOrder: "checkout.complete_order",
  checkoutCompletedAria: "checkout.completed_aria",
  checkoutContinueToCustomerDetails:
    "checkout.continue_to_customer_details",
  checkoutContinueToShippingPayment:
    "checkout.continue_to_shipping_payment",
  checkoutContinueToSummary: "checkout.continue_to_summary",
  checkoutCustomerDetails: "checkout.customer_details",
  checkoutEdit: "checkout.edit",
  checkoutFree: "checkout.free",
  checkoutItemQuantity: "checkout.item_quantity",
  checkoutNoPaymentMethods: "checkout.no_payment_methods",
  checkoutNoShippingOptions: "checkout.no_shipping_options",
  checkoutOrderSummary: "checkout.order_summary",
  checkoutPayment: "checkout.payment",
  checkoutPaymentNotSelected: "checkout.payment_not_selected",
  checkoutPaymentUpdateFailed: "checkout.payment_update_failed",
  checkoutPickupSelectionRequired:
    "checkout.pickup_selection_required",
  checkoutSelectPickupBeforePayment:
    "checkout.select_pickup_before_payment",
  checkoutSelectPaymentBeforeCompletion:
    "checkout.select_payment_before_completion",
  checkoutSelectShippingBeforeCompletion:
    "checkout.select_shipping_before_completion",
  checkoutSelectShippingBeforePayment:
    "checkout.select_shipping_before_payment",
  checkoutSelectedPayment: "checkout.selected_payment",
  checkoutSelectedShipping: "checkout.selected_shipping",
  checkoutShipping: "checkout.shipping",
  checkoutShippingExclTaxWithName:
    "checkout.shipping_excl_tax_with_name",
  checkoutShippingNotSelected: "checkout.shipping_not_selected",
  checkoutShippingPayment: "checkout.shipping_payment",
  checkoutShippingUpdateFailed: "checkout.shipping_update_failed",
  checkoutSummary: "checkout.summary",
  checkoutTotalExclTax: "checkout.total_excl_tax",
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

export const formatStorefrontText = (
  template: string,
  values: Record<string, number | string>
) =>
  Object.entries(values).reduce(
    (message, [key, value]) =>
      message.replaceAll(`{${key}}`, () => String(value)),
    template
  )

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
  [STOREFRONT_TEXT_KEYS.checkoutBackToCart]: "Späť na košík",
  [STOREFRONT_TEXT_KEYS.checkoutBackToShippingPayment]:
    "Späť na dopravu a platbu",
  [STOREFRONT_TEXT_KEYS.checkoutCartEmpty]:
    "Košík je prázdny. Pridajte najprv produkty.",
  [STOREFRONT_TEXT_KEYS.checkoutCartNotReady]: "Košík nie je pripravený.",
  [STOREFRONT_TEXT_KEYS.checkoutCompleteFailed]:
    "Dokončenie objednávky zlyhalo.",
  [STOREFRONT_TEXT_KEYS.checkoutCompleteOrder]: "Dokončiť objednávku",
  [STOREFRONT_TEXT_KEYS.checkoutCompletedAria]: "Dokončené",
  [STOREFRONT_TEXT_KEYS.checkoutContinueToCustomerDetails]:
    "Pokračovať na vaše údaje",
  [STOREFRONT_TEXT_KEYS.checkoutContinueToShippingPayment]:
    "Pokračovať na dopravu a platbu",
  [STOREFRONT_TEXT_KEYS.checkoutContinueToSummary]:
    "Pokračovať na súhrn",
  [STOREFRONT_TEXT_KEYS.checkoutCustomerDetails]: "Vaše údaje",
  [STOREFRONT_TEXT_KEYS.checkoutEdit]: "Upraviť",
  [STOREFRONT_TEXT_KEYS.checkoutFree]: "Zadarmo",
  [STOREFRONT_TEXT_KEYS.checkoutItemQuantity]: "{quantity} ks",
  [STOREFRONT_TEXT_KEYS.checkoutNoPaymentMethods]:
    "Nie sú dostupné žiadne platobné metódy.",
  [STOREFRONT_TEXT_KEYS.checkoutNoShippingOptions]:
    "Nie sú dostupné žiadne možnosti dopravy.",
  [STOREFRONT_TEXT_KEYS.checkoutOrderSummary]: "Súhrn objednávky",
  [STOREFRONT_TEXT_KEYS.checkoutPayment]: "Platba",
  [STOREFRONT_TEXT_KEYS.checkoutPaymentNotSelected]:
    "Platba nie je vybraná",
  [STOREFRONT_TEXT_KEYS.checkoutPaymentUpdateFailed]:
    "Nastavenie platby zlyhalo.",
  [STOREFRONT_TEXT_KEYS.checkoutPickupSelectionRequired]:
    "Vyberte výdajné miesto, aby sa odomkla platba.",
  [STOREFRONT_TEXT_KEYS.checkoutSelectPickupBeforePayment]:
    "Pre voľbu platby najprv vyberte výdajné miesto.",
  [STOREFRONT_TEXT_KEYS.checkoutSelectPaymentBeforeCompletion]:
    "Vyberte platobnú metódu pred dokončením objednávky.",
  [STOREFRONT_TEXT_KEYS.checkoutSelectShippingBeforeCompletion]:
    "Vyberte dopravu pred dokončením objednávky.",
  [STOREFRONT_TEXT_KEYS.checkoutSelectShippingBeforePayment]:
    "Pre voľbu platby najprv vyberte dopravu.",
  [STOREFRONT_TEXT_KEYS.checkoutSelectedPayment]: "Zvolená platba",
  [STOREFRONT_TEXT_KEYS.checkoutSelectedShipping]: "Zvolená doprava",
  [STOREFRONT_TEXT_KEYS.checkoutShipping]: "Doprava",
  [STOREFRONT_TEXT_KEYS.checkoutShippingExclTaxWithName]:
    "{shippingName} bez DPH",
  [STOREFRONT_TEXT_KEYS.checkoutShippingNotSelected]:
    "Doprava nie je vybraná",
  [STOREFRONT_TEXT_KEYS.checkoutShippingPayment]: "Doprava a platba",
  [STOREFRONT_TEXT_KEYS.checkoutShippingUpdateFailed]:
    "Nastavenie dopravy zlyhalo.",
  [STOREFRONT_TEXT_KEYS.checkoutSummary]: "Súhrn",
  [STOREFRONT_TEXT_KEYS.checkoutTotalExclTax]: "bez DPH",
} as const satisfies Record<StorefrontTextKey, string>
