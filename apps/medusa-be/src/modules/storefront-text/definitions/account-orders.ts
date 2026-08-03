import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_ACCOUNT_ORDERS_TEXT_DEFINITIONS = [
  {
    description: "Nadpis při přesměrování nepřihlášeného zákazníka.",
    key: "auth.account.redirect.title",
    namespace: "auth",
  },
  {
    description: "Vysvětlení přístupu k účtu pouze po přihlášení.",
    key: "auth.account.redirect.description",
    namespace: "auth",
  },
  {
    description: "Navigační položka přehledu zákaznického účtu.",
    key: "auth.account.navigation.overview",
    namespace: "auth",
  },
  {
    description: "Navigační položka objednávek zákazníka.",
    key: "auth.account.navigation.orders",
    namespace: "auth",
  },
  {
    description: "Navigační položka produktových seznamů zákazníka.",
    key: "auth.account.navigation.lists",
    namespace: "auth",
  },
  {
    description: "Navigační položka nastavení zákaznického účtu.",
    key: "auth.account.navigation.settings",
    namespace: "auth",
  },
  {
    description: "Akce pro odhlášení zákazníka.",
    key: "auth.account.logout",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při neúspěšném odhlášení.",
    key: "auth.account.logout_failed",
    namespace: "auth",
  },
  {
    description: "Nadpis přehledu zákaznického účtu.",
    key: "auth.account.overview.title",
    namespace: "auth",
  },
  {
    description: "Popis přehledu zákaznického účtu.",
    key: "auth.account.overview.description",
    namespace: "auth",
  },
  {
    description: "Popisek zákazníka v přehledu účtu.",
    key: "auth.account.overview.customer",
    namespace: "auth",
  },
  {
    description: "Záložní označení zákazníka bez jména.",
    key: "auth.account.overview.customer_fallback",
    namespace: "auth",
  },
  {
    description: "Nadpis nastavení zákaznického účtu.",
    key: "auth.account.settings.title",
    namespace: "auth",
  },
  {
    description: "Zpráva při nedostupných údajích zákaznického účtu.",
    key: "auth.account.settings.unavailable",
    namespace: "auth",
  },
  {
    description: "Popis formuláře nastavení zákaznického účtu.",
    key: "auth.account.settings.description",
    namespace: "auth",
  },
  {
    description: "Potvrzení uložení nastavení zákaznického účtu.",
    key: "auth.account.settings.saved",
    namespace: "auth",
  },
  {
    description: "Akce pro uložení nastavení zákaznického účtu.",
    key: "auth.account.settings.save",
    namespace: "auth",
  },
  {
    description: "Popisek pole e-mailu, které nelze upravit.",
    key: "auth.account.settings.email_read_only",
    namespace: "auth",
  },
  {
    description: "Popisek volitelného pole firmy.",
    key: "auth.account.settings.company_optional",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při ukládání nastavení účtu.",
    key: "auth.account.settings.update_failed",
    namespace: "auth",
  },
  {
    description: "Akce pro opakované načtení objednávek.",
    key: "auth.account.orders.retry",
    namespace: "auth",
  },
  {
    description: "Popis prázdné historie objednávek.",
    key: "auth.account.orders.empty_description",
    namespace: "auth",
  },
  {
    description: "Akce z prázdné historie objednávek do katalogu.",
    key: "auth.account.orders.browse_products",
    namespace: "auth",
  },
  {
    description: "Popis historie objednávek.",
    key: "auth.account.orders.description",
    namespace: "auth",
  },
  {
    description: "Souhrn počtu objednávek a aktuální stránky.",
    key: "auth.account.orders.pagination_summary",
    namespace: "auth",
  },
  {
    description: "Akce pro návrat do historie objednávek.",
    key: "auth.account.orders.back",
    namespace: "auth",
  },
  {
    description: "Nadpis nenalezeného detailu objednávky.",
    key: "auth.account.orders.not_found_title",
    namespace: "auth",
  },
  {
    description: "Popis nenalezeného detailu objednávky.",
    key: "auth.account.orders.not_found_description",
    namespace: "auth",
  },
  {
    description: "Počet položek v objednávce.",
    key: "auth.account.orders.item_count",
    namespace: "auth",
  },
  {
    description: "Popisek celkové částky objednávky.",
    key: "auth.account.orders.total_amount",
    namespace: "auth",
  },
  {
    description: "Akce pro zobrazení faktury objednávky.",
    key: "auth.account.orders.view_invoice",
    namespace: "auth",
  },
  {
    description: "Akce pro zobrazení detailu objednávky.",
    key: "auth.account.orders.view_order",
    namespace: "auth",
  },
  {
    description: "Popisek produktu v položkách objednávky.",
    key: "auth.account.orders.product",
    namespace: "auth",
  },
  {
    description: "Popisek ceny v položkách objednávky.",
    key: "auth.account.orders.price",
    namespace: "auth",
  },
  {
    description: "Popisek informačního sloupce v položkách objednávky.",
    key: "auth.account.orders.info",
    namespace: "auth",
  },
  {
    description: "Záložní název produktu v objednávce.",
    key: "auth.account.orders.product_fallback",
    namespace: "auth",
  },
  {
    description: "Popisek množství položky objednávky s hodnotou.",
    key: "auth.account.orders.quantity_value",
    namespace: "auth",
  },
  {
    description: "Akce pro zobrazení detailu produktu z objednávky.",
    key: "auth.account.orders.product_detail",
    namespace: "auth",
  },
  {
    description: "Zpráva pro objednávku bez položek.",
    key: "auth.account.orders.no_items",
    namespace: "auth",
  },
  {
    description: "Nadpis detailu objednávky s číslem objednávky.",
    key: "auth.account.orders.detail.order_title",
    namespace: "auth",
  },
  {
    description: "Datum vytvoření objednávky.",
    key: "auth.account.orders.detail.created",
    namespace: "auth",
  },
  {
    description: "Krátký label faktury objednávky.",
    key: "auth.account.orders.invoice",
    namespace: "auth",
  },
  {
    description: "Nadpis cenového souhrnu objednávky.",
    key: "auth.account.orders.detail.payment_summary",
    namespace: "auth",
  },
  {
    description: "Nadpis technických detailů objednávky.",
    key: "auth.account.orders.detail.order_details",
    namespace: "auth",
  },
  {
    description: "Identifikátor objednávky v technických detailech.",
    key: "auth.account.orders.detail.order_id",
    namespace: "auth",
  },
  {
    description: "Popisek počtu položek v technických detailech.",
    key: "auth.account.orders.detail.items",
    namespace: "auth",
  },
  {
    description: "Datum poslední aktualizace objednávky.",
    key: "auth.account.orders.detail.updated",
    namespace: "auth",
  },
  {
    description: "Nadpis doručovací adresy objednávky.",
    key: "auth.account.orders.detail.shipping_address",
    namespace: "auth",
  },
  {
    description: "Nadpis fakturační adresy objednávky.",
    key: "auth.account.orders.detail.billing_address",
    namespace: "auth",
  },
  {
    description: "Zpráva při chybějící adrese objednávky.",
    key: "auth.account.orders.detail.address_unavailable",
    namespace: "auth",
  },
  {
    description: "Nadpis dopravy v detailu objednávky.",
    key: "auth.account.orders.detail.shipping",
    namespace: "auth",
  },
  {
    description: "Zpráva při chybějícím způsobu dopravy.",
    key: "auth.account.orders.detail.shipping_unavailable",
    namespace: "auth",
  },
  {
    description: "Nadpis platby v detailu objednávky.",
    key: "auth.account.orders.detail.payment",
    namespace: "auth",
  },
  {
    description: "Zpráva při chybějícím způsobu platby.",
    key: "auth.account.orders.detail.payment_unavailable",
    namespace: "auth",
  },
  {
    description: "Nadpis sledování zásilky v detailu objednávky.",
    key: "auth.account.orders.detail.tracking",
    namespace: "auth",
  },
  {
    description: "Zpráva při chybějícím kódu pro sledování zásilky.",
    key: "auth.account.orders.detail.tracking_unavailable",
    namespace: "auth",
  },
  {
    description: "Popisek stavu dopravy nebo platby.",
    key: "auth.account.orders.detail.status",
    namespace: "auth",
  },
  {
    description: "Nadpis seznamu položek objednávky.",
    key: "auth.account.orders.detail.items_title",
    namespace: "auth",
  },
  {
    description: "Popisek varianty položky objednávky.",
    key: "auth.account.orders.variant",
    namespace: "auth",
  },
  {
    description: "Popisek množství položky objednávky.",
    key: "auth.account.orders.quantity",
    namespace: "auth",
  },
  {
    description: "Popisek jednotkové ceny položky objednávky.",
    key: "auth.account.orders.unit_price",
    namespace: "auth",
  },
  {
    description: "Popisek celkové ceny položky objednávky.",
    key: "auth.account.orders.total",
    namespace: "auth",
  },
  {
    description: "Jednotková cena položky objednávky s hodnotou.",
    key: "auth.account.orders.unit_price_value",
    namespace: "auth",
  },
  {
    description: "Lokalizovaný stav životního cyklu objednávky.",
    key: "auth.account.orders.status.lifecycle",
    namespace: "auth",
  },
  {
    description: "Lokalizovaný stav platby objednávky.",
    key: "auth.account.orders.status.payment",
    namespace: "auth",
  },
  {
    description: "Lokalizovaný stav doručení objednávky.",
    key: "auth.account.orders.status.fulfillment",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]
