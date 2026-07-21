import { STOREFRONT_ACCOUNT_ORDERS_TEXT_DEFINITIONS } from "./definitions/account-orders"
import { STOREFRONT_AUTH_TEXT_DEFINITIONS } from "./definitions/auth"
import { STOREFRONT_CATALOG_PRODUCT_TEXT_DEFINITIONS } from "./definitions/catalog-product"
import { STOREFRONT_CATALOG_TEXT_DEFINITIONS } from "./definitions/catalog"
import { STOREFRONT_CHECKOUT_CART_TEXT_DEFINITIONS } from "./definitions/checkout-cart"
import { STOREFRONT_CHECKOUT_COMPLETED_ORDER_TEXT_DEFINITIONS } from "./definitions/checkout-completed-order"
import { STOREFRONT_CHECKOUT_ENTRY_TEXT_DEFINITIONS } from "./definitions/checkout-entry"
import { STOREFRONT_CHECKOUT_DETAILS_TEXT_DEFINITIONS } from "./definitions/checkout-details"
import { STOREFRONT_CHECKOUT_PAYMENT_TEXT_DEFINITIONS } from "./definitions/checkout-payment"
import { STOREFRONT_CHECKOUT_PAYMENT_RETURN_TEXT_DEFINITIONS } from "./definitions/checkout-payment-return"
import { STOREFRONT_CHECKOUT_PICKUP_TEXT_DEFINITIONS } from "./definitions/checkout-pickup"
import { STOREFRONT_CHECKOUT_REVIEW_TEXT_DEFINITIONS } from "./definitions/checkout-review"
import { STOREFRONT_CHECKOUT_SIDEBAR_TEXT_DEFINITIONS } from "./definitions/checkout-sidebar"
import { STOREFRONT_CONTENT_TEXT_DEFINITIONS } from "./definitions/content"
import { STOREFRONT_FORM_TEXT_DEFINITIONS } from "./definitions/form"
import { STOREFRONT_NAVIGATION_TEXT_DEFINITIONS } from "./definitions/navigation"
import { STOREFRONT_PRODUCT_LIST_TEXT_DEFINITIONS } from "./definitions/product-lists"
import { STOREFRONT_SEARCH_TEXT_DEFINITIONS } from "./definitions/search"
import { STOREFRONT_SEARCH_RESULTS_TEXT_DEFINITIONS } from "./definitions/search-results"
import {
  flattenStorefrontTextCatalog,
  getFlatStorefrontTextCatalog,
  STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
  type StorefrontTextCatalogEnvelope,
} from "./catalog"
import {
  isStorefrontTextLocale,
  isStorefrontTextMarket,
  isStorefrontTextMarketLocalePair,
  STOREFRONT_TEXT_MARKETS,
  type StorefrontTextDefinition,
  type StorefrontTextLocale,
  type StorefrontTextMarket,
  type StorefrontTextNamespace,
  type StorefrontTextStatus,
} from "./configuration"

export * from "./configuration"

export const STOREFRONT_TEXT_DEFINITIONS = [
  {
    description: "Label tlačítka pro přidání produktu do košíku.",
    key: "cart.add_to_cart",
    namespace: "cart",
  },
  {
    description: "Text tlačítka během přidávání produktu do košíku.",
    key: "cart.adding_to_cart",
    namespace: "cart",
  },
  {
    description: "Toast po úspěšném přidání produktu do košíku.",
    key: "cart.added_to_cart",
    namespace: "cart",
  },
  {
    description: "Chybová hláška při neúspěšném přidání do košíku.",
    key: "cart.failed",
    namespace: "cart",
  },
  {
    description: "Chybová hláška pro nedostatečné skladové množství.",
    key: "cart.insufficient_quantity",
    namespace: "cart",
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s dostupným množstvím.",
    key: "cart.insufficient_quantity_available",
    namespace: "cart",
  },
  {
    description:
      "Chybová hláška pro nedostatečné množství s množstvím v košíku.",
    key: "cart.insufficient_quantity_in_cart",
    namespace: "cart",
  },
  {
    description: "Chybová hláška při načítání regionu košíku.",
    key: "cart.missing_region",
    namespace: "cart",
  },
  {
    description: "Chybová hláška pro produkt bez dostupné varianty.",
    key: "cart.missing_variant",
    namespace: "cart",
  },
  {
    description: "Chybová hláška pro produkt bez skladové dostupnosti.",
    key: "cart.out_of_stock",
    namespace: "cart",
  },
  {
    description: "Chybová hláška pro produkt nedostupný ve vybraném regionu.",
    key: "cart.unavailable_in_region",
    namespace: "cart",
  },
  {
    description: "Text počtu dalších položek skrytých v mini košíku.",
    key: "cart.additional_items",
    namespace: "cart",
  },
  {
    description: "Label tlačítka pro pokračování z mini košíku k pokladně.",
    key: "cart.continue_to_checkout",
    namespace: "cart",
  },
  {
    description: "Label slevy v souhrnu košíku.",
    key: "cart.discount",
    namespace: "cart",
  },
  {
    description: "Doplňující text prázdného mini košíku.",
    key: "cart.empty_description",
    namespace: "cart",
  },
  {
    description: "Titulek prázdného mini košíku.",
    key: "cart.empty_title",
    namespace: "cart",
  },
  {
    description: "Upozornění na nízké skladové množství položky.",
    key: "cart.low_stock",
    namespace: "cart",
  },
  {
    description: "Label ceny produktů bez daně v souhrnu košíku.",
    key: "cart.products_subtotal_excl_tax",
    namespace: "cart",
  },
  {
    description: "Přístupný label pole pro množství položky.",
    key: "cart.quantity_aria",
    namespace: "cart",
  },
  {
    description: "Chybová hláška při odstranění položky z košíku.",
    key: "cart.remove_failed",
    namespace: "cart",
  },
  {
    description: "Přístupný label tlačítka pro odstranění položky.",
    key: "cart.remove_item_aria",
    namespace: "cart",
  },
  {
    description: "Label dopravy bez daně v souhrnu košíku.",
    key: "cart.shipping_excl_tax",
    namespace: "cart",
  },
  {
    description: "Label daně v souhrnu košíku.",
    key: "cart.tax",
    namespace: "cart",
  },
  {
    description: "Titulek košíku bez počtu položek.",
    key: "cart.title",
    namespace: "cart",
  },
  {
    description: "Titulek košíku s počtem položek.",
    key: "cart.title_with_count",
    namespace: "cart",
  },
  {
    description: "Label celkové ceny s daní v souhrnu košíku.",
    key: "cart.total_incl_tax",
    namespace: "cart",
  },
  {
    description: "Chybová hláška při úpravě množství v košíku.",
    key: "cart.update_failed",
    namespace: "cart",
  },
  {
    description: "Navigace zpět do košíku.",
    key: "checkout.back_to_cart",
    namespace: "checkout",
  },
  {
    description: "Navigace zpět na dopravu a platbu.",
    key: "checkout.back_to_shipping_payment",
    namespace: "checkout",
  },
  {
    description: "Tlačítko pro dokončení objednávky.",
    key: "checkout.complete_order",
    namespace: "checkout",
  },
  {
    description: "Přístupný popisek dokončeného kroku checkoutu.",
    key: "checkout.completed_aria",
    namespace: "checkout",
  },
  {
    description: "Navigace k zákaznickým údajům.",
    key: "checkout.continue_to_customer_details",
    namespace: "checkout",
  },
  {
    description: "Navigace k dopravě a platbě.",
    key: "checkout.continue_to_shipping_payment",
    namespace: "checkout",
  },
  {
    description: "Navigace k souhrnu objednávky.",
    key: "checkout.continue_to_summary",
    namespace: "checkout",
  },
  {
    description: "Název kroku a sekce zákaznických údajů.",
    key: "checkout.customer_details",
    namespace: "checkout",
  },
  {
    description: "Label akce pro úpravu části objednávky.",
    key: "checkout.edit",
    namespace: "checkout",
  },
  {
    description: "Label bezplatné dopravy nebo platby.",
    key: "checkout.free",
    namespace: "checkout",
  },
  {
    description: "Formát množství položky v souhrnu objednávky.",
    key: "checkout.item_quantity",
    namespace: "checkout",
  },
  {
    description: "Prázdný stav dostupných platebních metod.",
    key: "checkout.no_payment_methods",
    namespace: "checkout",
  },
  {
    description: "Prázdný stav dostupných možností dopravy.",
    key: "checkout.no_shipping_options",
    namespace: "checkout",
  },
  {
    description: "Nadpis finálního souhrnu objednávky.",
    key: "checkout.order_summary",
    namespace: "checkout",
  },
  {
    description: "Label platby v checkoutu.",
    key: "checkout.payment",
    namespace: "checkout",
  },
  {
    description: "Stav, kdy není vybraná platba.",
    key: "checkout.payment_not_selected",
    namespace: "checkout",
  },
  {
    description: "Instrukce k dokončení výběru výdejního místa.",
    key: "checkout.pickup_selection_required",
    namespace: "checkout",
  },
  {
    description: "Výzva k výběru výdejního místa před platbou.",
    key: "checkout.select_pickup_before_payment",
    namespace: "checkout",
  },
  {
    description: "Výzva k výběru dopravy před platbou.",
    key: "checkout.select_shipping_before_payment",
    namespace: "checkout",
  },
  {
    description: "Výchozí label zvolené platby.",
    key: "checkout.selected_payment",
    namespace: "checkout",
  },
  {
    description: "Výchozí label zvolené dopravy.",
    key: "checkout.selected_shipping",
    namespace: "checkout",
  },
  {
    description: "Label dopravy v checkoutu.",
    key: "checkout.shipping",
    namespace: "checkout",
  },
  {
    description: "Label zvolené dopravy bez daně.",
    key: "checkout.shipping_excl_tax_with_name",
    namespace: "checkout",
  },
  {
    description: "Stav, kdy není vybraná doprava.",
    key: "checkout.shipping_not_selected",
    namespace: "checkout",
  },
  {
    description: "Název kroku souhrnu checkoutu.",
    key: "checkout.summary",
    namespace: "checkout",
  },
  {
    description: "Label celkové ceny bez daně.",
    key: "checkout.total_excl_tax",
    namespace: "checkout",
  },
  {
    description: "Název kroku dopravy a platby.",
    key: "checkout.shipping_payment",
    namespace: "checkout",
  },
  {
    description: "Chybová hláška pro prázdný košík v checkoutu.",
    key: "checkout.cart_empty",
    namespace: "checkout",
  },
  {
    description: "Chybová hláška pro nepřipravený košík.",
    key: "checkout.cart_not_ready",
    namespace: "checkout",
  },
  {
    description: "Chybová hláška při neúspěšném dokončení objednávky.",
    key: "checkout.complete_failed",
    namespace: "checkout",
  },
  {
    description: "Chybová hláška při neúspěšném nastavení platby.",
    key: "checkout.payment_update_failed",
    namespace: "checkout",
  },
  {
    description: "Výzva k výběru platby před dokončením objednávky.",
    key: "checkout.select_payment_before_completion",
    namespace: "checkout",
  },
  {
    description: "Výzva k výběru dopravy před dokončením objednávky.",
    key: "checkout.select_shipping_before_completion",
    namespace: "checkout",
  },
  {
    description: "Chybová hláška při neúspěšném nastavení dopravy.",
    key: "checkout.shipping_update_failed",
    namespace: "checkout",
  },
  ...STOREFRONT_AUTH_TEXT_DEFINITIONS,
  ...STOREFRONT_ACCOUNT_ORDERS_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_CART_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_COMPLETED_ORDER_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_ENTRY_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_DETAILS_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_PAYMENT_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_PAYMENT_RETURN_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_PICKUP_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_REVIEW_TEXT_DEFINITIONS,
  ...STOREFRONT_CHECKOUT_SIDEBAR_TEXT_DEFINITIONS,
  ...STOREFRONT_CONTENT_TEXT_DEFINITIONS,
  ...STOREFRONT_FORM_TEXT_DEFINITIONS,
  ...STOREFRONT_CATALOG_TEXT_DEFINITIONS,
  ...STOREFRONT_CATALOG_PRODUCT_TEXT_DEFINITIONS,
  ...STOREFRONT_NAVIGATION_TEXT_DEFINITIONS,
  ...STOREFRONT_PRODUCT_LIST_TEXT_DEFINITIONS,
  ...STOREFRONT_SEARCH_TEXT_DEFINITIONS,
  ...STOREFRONT_SEARCH_RESULTS_TEXT_DEFINITIONS,
] as const satisfies readonly StorefrontTextDefinition[]

export type StorefrontTextKey =
  (typeof STOREFRONT_TEXT_DEFINITIONS)[number]["key"]

export type StorefrontTextMessages = Partial<Record<StorefrontTextKey, string>>

const STOREFRONT_TEXT_KEYS = new Set<string>(
  STOREFRONT_TEXT_DEFINITIONS.map((definition) => definition.key)
)

const validateCatalogKeys = (
  messages: Record<string, string>,
  label: string
): Record<StorefrontTextKey, string> => {
  const missingKeys = STOREFRONT_TEXT_DEFINITIONS.filter(
    (definition) => messages[definition.key] === undefined
  ).map((definition) => definition.key)
  const unknownKeys = Object.keys(messages).filter(
    (key) => !STOREFRONT_TEXT_KEYS.has(key)
  )

  if (missingKeys.length || unknownKeys.length) {
    throw new Error(
      [
        `${label} does not match the storefront text registry.`,
        missingKeys.length
          ? `Missing keys: ${missingKeys.join(", ")}.`
          : "",
        unknownKeys.length
          ? `Unknown keys: ${unknownKeys.join(", ")}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
  }

  return messages as Record<StorefrontTextKey, string>
}

const STOREFRONT_TEXT_DEFAULT_MESSAGES = Object.fromEntries(
  STOREFRONT_TEXT_MARKETS.map((market) => [
    market.market,
    validateCatalogKeys(
      getFlatStorefrontTextCatalog(market.locale),
      market.locale
    ),
  ])
) as Record<StorefrontTextMarket, Record<StorefrontTextKey, string>>

export const parseStorefrontTextCatalog = (
  catalog: unknown
): Record<StorefrontTextKey, string> =>
  validateCatalogKeys(
    flattenStorefrontTextCatalog(catalog),
    "Imported catalog"
  )

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const parseStorefrontTextCatalogEnvelope = ({
  catalog,
  targetMarket,
}: {
  catalog: unknown
  targetMarket: StorefrontTextMarket
}): StorefrontTextCatalogEnvelope & {
  messages: Record<StorefrontTextKey, string>
} => {
  if (!isRecord(catalog)) {
    throw new Error("Storefront text catalog must be a JSON object")
  }

  const envelopeKeys = new Set([
    "locale",
    "market",
    "messages",
    "schema_version",
  ])
  const unknownEnvelopeKeys = Object.keys(catalog).filter(
    (key) => !envelopeKeys.has(key)
  )

  if (unknownEnvelopeKeys.length) {
    throw new Error(
      `Unknown storefront text catalog fields: ${unknownEnvelopeKeys.join(", ")}`
    )
  }

  if (catalog.schema_version !== STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported storefront text catalog schema version "${String(catalog.schema_version)}"`
    )
  }

  if (!isStorefrontTextMarket(catalog.market)) {
    throw new Error(`Unsupported storefront text market "${catalog.market}"`)
  }

  if (catalog.market !== targetMarket) {
    throw new Error(
      `Catalog market "${catalog.market}" does not match target market "${targetMarket}"`
    )
  }

  if (!isStorefrontTextLocale(catalog.locale)) {
    throw new Error(`Unsupported storefront text locale "${catalog.locale}"`)
  }

  if (!isStorefrontTextMarketLocalePair(catalog.market, catalog.locale)) {
    throw new Error(
      `Locale "${catalog.locale}" does not belong to market "${catalog.market}"`
    )
  }

  return {
    locale: catalog.locale,
    market: catalog.market,
    messages: parseStorefrontTextCatalog(catalog.messages),
    schema_version: STOREFRONT_TEXT_CATALOG_SCHEMA_VERSION,
  }
}

export type StorefrontTextSeedRow = {
  country: string
  default_value: string
  description: string
  domain: string
  key: StorefrontTextKey
  locale: StorefrontTextLocale
  market: StorefrontTextMarket
  namespace: StorefrontTextNamespace
  override_value: null
  status: StorefrontTextStatus
}

export const getStorefrontTextSeedRows = (
  { market }: { market?: StorefrontTextMarket } = {}
): StorefrontTextSeedRow[] =>
  STOREFRONT_TEXT_DEFINITIONS.flatMap((definition) =>
    STOREFRONT_TEXT_MARKETS.filter(
      (configuration) => !market || configuration.market === market
    ).map((configuration) => ({
      country: configuration.country,
      default_value:
        STOREFRONT_TEXT_DEFAULT_MESSAGES[configuration.market][definition.key],
      description: definition.description,
      domain: configuration.domain,
      key: definition.key,
      locale: configuration.locale,
      market: configuration.market,
      namespace: definition.namespace,
      override_value: null,
      status: "active",
    }))
  )

export const getStorefrontTextDefaultMessages = ({
  market,
  namespace,
}: {
  market: StorefrontTextMarket
  namespace?: StorefrontTextNamespace
}): StorefrontTextMessages => {
  const messages: StorefrontTextMessages = {}

  for (const definition of STOREFRONT_TEXT_DEFINITIONS) {
    if (namespace && definition.namespace !== namespace) {
      continue
    }

    messages[definition.key] =
      STOREFRONT_TEXT_DEFAULT_MESSAGES[market][definition.key]
  }

  return messages
}

export const findStorefrontTextDefault = ({
  key,
  locale,
  market,
}: {
  key: string
  locale: unknown
  market: unknown
}) => {
  if (
    !isStorefrontTextMarket(market) ||
    !isStorefrontTextLocale(locale) ||
    !isStorefrontTextMarketLocalePair(market, locale) ||
    !STOREFRONT_TEXT_KEYS.has(key)
  ) {
    return
  }

  return {
    locale,
    market,
    value: STOREFRONT_TEXT_DEFAULT_MESSAGES[market][key as StorefrontTextKey],
  }
}
