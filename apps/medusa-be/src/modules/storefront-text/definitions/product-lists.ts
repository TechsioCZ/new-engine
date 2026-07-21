import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_PRODUCT_LIST_TEXT_DEFINITIONS = [
  {
    description: "Nadpis zákaznických seznamů produktů.",
    key: "auth.product_lists.title",
    namespace: "auth",
  },
  {
    description: "Popis zákaznických seznamů produktů.",
    key: "auth.product_lists.description",
    namespace: "auth",
  },
  {
    description: "Prázdný stav zákaznických seznamů produktů.",
    key: "auth.product_lists.empty_description",
    namespace: "auth",
  },
  {
    description: "Akce pro vytvoření nového seznamu produktů.",
    key: "auth.product_lists.new_list",
    namespace: "auth",
  },
  {
    description: "Akce pro přechod z prázdného seznamu do katalogu.",
    key: "auth.product_lists.browse_products",
    namespace: "auth",
  },
  {
    description: "Akce pro opakování načtení seznamů produktů.",
    key: "auth.product_lists.retry",
    namespace: "auth",
  },
  {
    description: "Chyba při načítání zákaznických seznamů produktů.",
    key: "auth.product_lists.errors.lists_load_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při načítání jednoho seznamu produktů.",
    key: "auth.product_lists.errors.list_load_failed",
    namespace: "auth",
  },
  {
    description: "Prázdný stav vybraného seznamu produktů.",
    key: "auth.product_lists.list_empty",
    namespace: "auth",
  },
  {
    description: "Přístupný stav načítání produktů vybraného seznamu.",
    key: "auth.product_lists.loading_items_aria",
    namespace: "auth",
  },
  {
    description: "Nadpis dialogu pro vytvoření seznamu produktů.",
    key: "auth.product_lists.create_dialog_title",
    namespace: "auth",
  },
  {
    description: "Popisek pole pro název nového seznamu.",
    key: "auth.product_lists.new_list_name",
    namespace: "auth",
  },
  {
    description: "Placeholder pole pro název seznamu.",
    key: "auth.product_lists.new_list_placeholder",
    namespace: "auth",
  },
  {
    description: "Akce pro zrušení dialogu seznamu produktů.",
    key: "auth.product_lists.actions.cancel",
    namespace: "auth",
  },
  {
    description: "Akce pro uložení seznamu produktů.",
    key: "auth.product_lists.actions.save",
    namespace: "auth",
  },
  {
    description: "Akce pro potvrzení v pickeru seznamů.",
    key: "auth.product_lists.actions.confirm",
    namespace: "auth",
  },
  {
    description: "Akce pro smazání seznamu produktů.",
    key: "auth.product_lists.actions.delete_list",
    namespace: "auth",
  },
  {
    description: "Popis následků smazání seznamu produktů.",
    key: "auth.product_lists.delete_description",
    namespace: "auth",
  },
  {
    description: "Nadpis potvrzení smazání pojmenovaného seznamu.",
    key: "auth.product_lists.delete_title",
    namespace: "auth",
  },
  {
    description: "Přístupný popisek smazání pojmenovaného seznamu.",
    key: "auth.product_lists.delete_list_aria",
    namespace: "auth",
  },
  {
    description: "Přístupný popisek vytvoření nového seznamu.",
    key: "auth.product_lists.create_list_aria",
    namespace: "auth",
  },
  {
    description: "Výchozí název seznamu oblíbených produktů.",
    key: "auth.product_lists.favorite_title",
    namespace: "auth",
  },
  {
    description: "Výchozí název nepojmenovaného seznamu produktů.",
    key: "auth.product_lists.untitled_list",
    namespace: "auth",
  },
  {
    description: "Nadpis pickeru seznamů produktů.",
    key: "auth.product_lists.picker.title",
    namespace: "auth",
  },
  {
    description: "Přístupný popisek otevření pickeru seznamů.",
    key: "auth.product_lists.picker.trigger_aria",
    namespace: "auth",
  },
  {
    description: "Výzva k přihlášení před uložením produktu do seznamu.",
    key: "auth.product_lists.picker.auth_required",
    namespace: "auth",
  },
  {
    description: "Přístupný stav produktu již uloženého v seznamu.",
    key: "auth.product_lists.picker.contains_product_aria",
    namespace: "auth",
  },
  {
    description: "Přístupná akce přidání produktu do pojmenovaného seznamu.",
    key: "auth.product_lists.picker.add_to_list_aria",
    namespace: "auth",
  },
  {
    description: "Přístupná akce otevření pojmenovaného seznamu.",
    key: "auth.product_lists.picker.open_list_aria",
    namespace: "auth",
  },
  {
    description: "Přístupný stav přidávání produktu do seznamu.",
    key: "auth.product_lists.picker.adding_product",
    namespace: "auth",
  },
  {
    description: "Formát množství položky seznamu.",
    key: "auth.product_lists.item.quantity",
    namespace: "auth",
  },
  {
    description: "Přístupný popisek pole množství položky seznamu.",
    key: "auth.product_lists.item.quantity_aria",
    namespace: "auth",
  },
  {
    description: "Přístupná akce odstranění produktu ze seznamu.",
    key: "auth.product_lists.item.remove_aria",
    namespace: "auth",
  },
  {
    description: "Stav odstraňování produktu ze seznamu.",
    key: "auth.product_lists.item.removing",
    namespace: "auth",
  },
  {
    description: "Stav produktu, který již není dostupný.",
    key: "auth.product_lists.availability.product_unavailable",
    namespace: "auth",
  },
  {
    description: "Stav produktu, který momentálně není skladem.",
    key: "auth.product_lists.availability.out_of_stock",
    namespace: "auth",
  },
  {
    description: "Stav produktu s omezeným dostupným množstvím.",
    key: "auth.product_lists.availability.limited_stock",
    namespace: "auth",
  },
  {
    description: "Tlačítko seznamu bez položek dostupných ke koupi.",
    key: "auth.product_lists.availability.none_available",
    namespace: "auth",
  },
  {
    description: "Akce přidání všech položek seznamu do košíku.",
    key: "auth.product_lists.availability.add_all",
    namespace: "auth",
  },
  {
    description: "Akce přidání dostupných položek seznamu do košíku.",
    key: "auth.product_lists.availability.add_available",
    namespace: "auth",
  },
  {
    description: "Zástupný text nedostupné ceny položek seznamu.",
    key: "auth.product_lists.price_unavailable",
    namespace: "auth",
  },
  {
    description: "Validace prázdného názvu seznamu.",
    key: "auth.product_lists.validation.title_required",
    namespace: "auth",
  },
  {
    description: "Chyba při vytvoření seznamu produktů.",
    key: "auth.product_lists.errors.create_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při přidání produktu do seznamu.",
    key: "auth.product_lists.errors.add_product_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při přidání celého seznamu do košíku.",
    key: "auth.product_lists.errors.add_list_to_cart_failed",
    namespace: "auth",
  },
  {
    description: "Chyba seznamu obsahujícího produkt bez zvolené varianty.",
    key: "auth.product_lists.errors.missing_variant",
    namespace: "auth",
  },
  {
    description: "Chyba při nepovedeném přidání všech dostupných položek.",
    key: "auth.product_lists.errors.add_available_all_failed",
    namespace: "auth",
  },
  {
    description: "Upozornění při nepovedeném přidání části dostupných položek.",
    key: "auth.product_lists.errors.add_available_partial_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při změně množství položky seznamu.",
    key: "auth.product_lists.errors.quantity_update_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při smazání seznamu produktů.",
    key: "auth.product_lists.errors.delete_list_failed",
    namespace: "auth",
  },
  {
    description: "Chyba při odstranění produktu ze seznamu.",
    key: "auth.product_lists.errors.remove_product_failed",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]
