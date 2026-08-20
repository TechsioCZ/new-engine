import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_NAVIGATION_TEXT_DEFINITIONS = [
  {
    description: "Přístupný název hlavní navigace.",
    key: "navigation.primary_aria",
    namespace: "navigation",
  },
  {
    description: "Stav načítání podkategorií v navigačním podmenu.",
    key: "navigation.submenu.loading",
    namespace: "navigation",
  },
  {
    description: "Otevírací doba uvedená u telefonu v hlavičce.",
    key: "navigation.contact.hours",
    namespace: "navigation",
  },
  {
    description: "Telefonní číslo zobrazené v hlavičce.",
    key: "navigation.contact.phone_display",
    namespace: "navigation",
  },
  {
    description: "Odkaz pro vytočení telefonního čísla v hlavičce.",
    key: "navigation.contact.phone_href",
    namespace: "navigation",
  },
  {
    description: "E-mailová adresa zobrazená v kontaktních prvcích.",
    key: "navigation.contact.email_display",
    namespace: "navigation",
  },
  {
    description: "Odkaz pro odeslání e-mailu z kontaktních prvků.",
    key: "navigation.contact.email_href",
    namespace: "navigation",
  },
  {
    description: "Text autorských práv v patičce.",
    key: "navigation.footer.copyright",
    namespace: "navigation",
  },
  {
    description: "Odkaz pro úpravu nastavení cookies v patičce.",
    key: "navigation.footer.cookie_settings",
    namespace: "navigation",
  },
  {
    description: "Krátký claim pod logem v patičce.",
    key: "navigation.footer.tagline",
    namespace: "navigation",
  },
  {
    description: "Nadpis informačního sloupce v patičce.",
    key: "navigation.footer.columns.information.title",
    namespace: "navigation",
  },
  {
    description: "Odkaz na blog v patičce.",
    key: "navigation.footer.columns.information.blog",
    namespace: "navigation",
  },
  {
    description: "Odkaz na stránku o značce v patičce.",
    key: "navigation.footer.columns.information.about",
    namespace: "navigation",
  },
  {
    description: "Odkaz na často kladené otázky v patičce.",
    key: "navigation.footer.columns.information.faq",
    namespace: "navigation",
  },
  {
    description: "Odkaz na dárkové poukázky v patičce.",
    key: "navigation.footer.columns.information.gift_voucher",
    namespace: "navigation",
  },
  {
    description: "Odkaz na přehled výrobců a značek v patičce.",
    key: "navigation.footer.columns.information.brands",
    namespace: "navigation",
  },
  {
    description: "Odkaz na zákaznické recenze v patičce.",
    key: "navigation.footer.columns.information.reviews",
    namespace: "navigation",
  },
  {
    description: "Nadpis sloupce důležitých informací v patičce.",
    key: "navigation.footer.columns.important.title",
    namespace: "navigation",
  },
  {
    description: "Odkaz na informace o dopravě a platbě v patičce.",
    key: "navigation.footer.columns.important.shipping_payment",
    namespace: "navigation",
  },
  {
    description: "Odkaz na reklamace a vrácení v patičce.",
    key: "navigation.footer.columns.important.claims_returns",
    namespace: "navigation",
  },
  {
    description: "Odkaz na obchodní podmínky v patičce.",
    key: "navigation.footer.columns.important.terms",
    namespace: "navigation",
  },
  {
    description: "Odkaz na ochranu osobních údajů v patičce.",
    key: "navigation.footer.columns.important.privacy",
    namespace: "navigation",
  },
  {
    description: "Odkaz na informace o cookies v patičce.",
    key: "navigation.footer.columns.important.cookies",
    namespace: "navigation",
  },
  {
    description: "Nadpis partnerského sloupce v patičce.",
    key: "navigation.footer.columns.partners.title",
    namespace: "navigation",
  },
  {
    description: "Odkaz na partnerský program v patičce.",
    key: "navigation.footer.columns.partners.affiliate",
    namespace: "navigation",
  },
  {
    description: "Odkaz na velkoobchod v patičce.",
    key: "navigation.footer.columns.partners.wholesale",
    namespace: "navigation",
  },
  {
    description: "Odkaz na dropshipping v patičce.",
    key: "navigation.footer.columns.partners.dropshipping",
    namespace: "navigation",
  },
  {
    description: "Odkaz na privátní značku v patičce.",
    key: "navigation.footer.columns.partners.private_label",
    namespace: "navigation",
  },
  {
    description: "Přístupný název drobečkové navigace.",
    key: "navigation.breadcrumbs.root_aria",
    namespace: "navigation",
  },
  {
    description: "Odkaz na domovskou stránku v drobečkové navigaci.",
    key: "navigation.breadcrumbs.home",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupné stránky účtu.",
    key: "navigation.page_errors.account",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupné poradny nebo článku.",
    key: "navigation.page_errors.advice",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného přihlášení nebo registrace.",
    key: "navigation.page_errors.authentication",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného košíku.",
    key: "navigation.page_errors.cart",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného katalogu.",
    key: "navigation.page_errors.catalog",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupné pokladny.",
    key: "navigation.page_errors.checkout",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného informačního obsahu.",
    key: "navigation.page_errors.content",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupné objednávky.",
    key: "navigation.page_errors.order",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného hodnocení produktu.",
    key: "navigation.page_errors.review",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nenalezené globální stránky.",
    key: "navigation.page_errors.not_found",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupného vyhledávání.",
    key: "navigation.page_errors.search",
    namespace: "navigation",
  },
  {
    description: "Chybový stav nedostupné domovské stránky obchodu.",
    key: "navigation.page_errors.storefront",
    namespace: "navigation",
  },
  {
    description: "Chybový stav dočasně nedostupné globální stránky.",
    key: "navigation.page_errors.unavailable",
    namespace: "navigation",
  },
] as const satisfies readonly StorefrontTextDefinition[]
