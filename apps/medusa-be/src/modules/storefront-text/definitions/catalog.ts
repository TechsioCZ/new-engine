import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_CATALOG_TEXT_DEFINITIONS = [
  {
    description: "Název odkazu na přehled značek.",
    key: "catalog.brands.label",
    namespace: "catalog",
  },
  {
    description: "Nadpis abecedního přehledu všech značek.",
    key: "catalog.brands.all_title",
    namespace: "catalog",
  },
  {
    description: "Přístupný název abecedního seznamu značek.",
    key: "catalog.brands.list_aria",
    namespace: "catalog",
  },
  {
    description: "SEO titulek abecedního přehledu všech značek.",
    key: "catalog.brands.metadata.index_title",
    namespace: "catalog",
  },
  {
    description: "SEO popis abecedního přehledu všech značek.",
    key: "catalog.brands.metadata.index_description",
    namespace: "catalog",
  },
  {
    description: "SEO titulek detailu značky.",
    key: "catalog.brands.metadata.detail_title",
    namespace: "catalog",
  },
  {
    description: "SEO popis detailu značky.",
    key: "catalog.brands.metadata.detail_description",
    namespace: "catalog",
  },
  {
    description: "Label ovládání katalogových filtrů s počtem aktivních filtrů.",
    key: "catalog.filters.toggle",
    namespace: "catalog",
  },
  {
    description: "Nadpis filtru ceny.",
    key: "catalog.filters.price",
    namespace: "catalog",
  },
  {
    description: "Nadpis filtru formy produktu.",
    key: "catalog.filters.form",
    namespace: "catalog",
  },
  {
    description: "Nadpis filtru značky.",
    key: "catalog.filters.brand",
    namespace: "catalog",
  },
  {
    description: "Nadpis filtru účinné látky.",
    key: "catalog.filters.active_ingredient",
    namespace: "catalog",
  },
  {
    description: "Akce pro vymazání všech katalogových filtrů.",
    key: "catalog.filters.clear",
    namespace: "catalog",
  },
  {
    description: "Akce pro rozbalení dalších hodnot filtru.",
    key: "catalog.filters.show_more",
    namespace: "catalog",
  },
  {
    description: "Akce pro sbalení dalších hodnot filtru.",
    key: "catalog.filters.show_less",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav při načítání forem produktu.",
    key: "catalog.filters.form_loading",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav filtru forem produktu.",
    key: "catalog.filters.form_empty",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav při načítání značek.",
    key: "catalog.filters.brand_loading",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav filtru značek.",
    key: "catalog.filters.brand_empty",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav při načítání účinných látek.",
    key: "catalog.filters.ingredient_loading",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav filtru účinných látek.",
    key: "catalog.filters.ingredient_empty",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů skladem.",
    key: "catalog.filters.status.in_stock",
    namespace: "catalog",
  },
  {
    description: "Label filtru akčních produktů.",
    key: "catalog.filters.status.action",
    namespace: "catalog",
  },
  {
    description: "Label filtru nových produktů.",
    key: "catalog.filters.status.new",
    namespace: "catalog",
  },
  {
    description: "Label filtru doporučených produktů.",
    key: "catalog.filters.status.tip",
    namespace: "catalog",
  },
  {
    description: "Label filtru veganských produktů.",
    key: "catalog.filters.status.vegan",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě kapslí.",
    key: "catalog.filters.form_values.capsules",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě tablet.",
    key: "catalog.filters.form_values.tablets",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě měkkých kapslí.",
    key: "catalog.filters.form_values.softgel",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů v prášku.",
    key: "catalog.filters.form_values.powder",
    namespace: "catalog",
  },
  {
    description: "Label filtru tekutých produktů.",
    key: "catalog.filters.form_values.liquid",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě nápoje.",
    key: "catalog.filters.form_values.drink",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě kapek.",
    key: "catalog.filters.form_values.drops",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve spreji.",
    key: "catalog.filters.form_values.spray",
    namespace: "catalog",
  },
  {
    description: "Label filtru produktů ve formě sirupu.",
    key: "catalog.filters.form_values.syrup",
    namespace: "catalog",
  },
  {
    description: "Přístupný název stránkování katalogu.",
    key: "catalog.pagination.root_aria",
    namespace: "catalog",
  },
  {
    description: "Přístupný label navigace na předchozí stránku katalogu.",
    key: "catalog.pagination.previous_aria",
    namespace: "catalog",
  },
  {
    description: "Přístupný label navigace na další stránku katalogu.",
    key: "catalog.pagination.next_aria",
    namespace: "catalog",
  },
  {
    description: "Přístupný label konkrétní stránky katalogu.",
    key: "catalog.pagination.page_aria",
    namespace: "catalog",
  },
  {
    description: "Popisek řazení produktů podle doporučení.",
    key: "catalog.sort.recommended",
    namespace: "catalog",
  },
  {
    description: "Popisek řazení produktů od nejlevnějších.",
    key: "catalog.sort.price_asc",
    namespace: "catalog",
  },
  {
    description: "Popisek řazení produktů od nejdražších.",
    key: "catalog.sort.price_desc",
    namespace: "catalog",
  },
  {
    description: "Popisek řazení produktů podle prodejnosti.",
    key: "catalog.sort.best_selling",
    namespace: "catalog",
  },
  {
    description: "Popisek řazení produktů od nejnovějších.",
    key: "catalog.sort.newest",
    namespace: "catalog",
  },
  {
    description: "Popisek celkového počtu produktů ve výpisu.",
    key: "catalog.results.items_total",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav kategorie pro zvolený filtr.",
    key: "catalog.results.empty_category",
    namespace: "catalog",
  },
  {
    description: "Prázdný stav značky pro zvolený filtr.",
    key: "catalog.results.empty_brand",
    namespace: "catalog",
  },
  {
    description: "Chybová hláška pro nenalezenou kategorii.",
    key: "catalog.results.category_not_found",
    namespace: "catalog",
  },
  {
    description: "Chybová hláška při načítání produktů.",
    key: "catalog.errors.products_load_failed",
    namespace: "catalog",
  },
  {
    description: "Chybová hláška při načítání kategorií.",
    key: "catalog.errors.categories_load_failed",
    namespace: "catalog",
  },
] as const satisfies readonly StorefrontTextDefinition[]
