import type { StorefrontTextDefinition } from "../configuration"

export const STOREFRONT_ACCOUNT_ADDRESSES_TEXT_DEFINITIONS = [
  {
    description: "Nadpis přehledu uložených adres.",
    key: "auth.account.addresses.title",
    namespace: "auth",
  },
  {
    description: "Popis správy doručovacích a fakturačních adres.",
    key: "auth.account.addresses.description",
    namespace: "auth",
  },
  {
    description: "Akce pro přidání uložené adresy.",
    key: "auth.account.addresses.add",
    namespace: "auth",
  },
  {
    description: "Nadpis prázdného seznamu uložených adres.",
    key: "auth.account.addresses.empty_title",
    namespace: "auth",
  },
  {
    description: "Popis prázdného seznamu uložených adres.",
    key: "auth.account.addresses.empty_description",
    namespace: "auth",
  },
  {
    description: "Nadpis formuláře nové adresy.",
    key: "auth.account.addresses.new_title",
    namespace: "auth",
  },
  {
    description: "Nadpis formuláře upravované adresy.",
    key: "auth.account.addresses.edit_title",
    namespace: "auth",
  },
  {
    description: "Popisek volitelného pole adresy s hodnotou {label}.",
    key: "auth.account.addresses.optional_label",
    namespace: "auth",
  },
  {
    description: "Označení výchozí doručovací adresy.",
    key: "auth.account.addresses.default_shipping",
    namespace: "auth",
  },
  {
    description: "Označení výchozí fakturační adresy.",
    key: "auth.account.addresses.default_billing",
    namespace: "auth",
  },
  {
    description: "Akce pro úpravu uložené adresy.",
    key: "auth.account.addresses.edit",
    namespace: "auth",
  },
  {
    description: "Akce pro odstranění uložené adresy.",
    key: "auth.account.addresses.delete",
    namespace: "auth",
  },
  {
    description: "Akce pro zrušení úpravy adresy.",
    key: "auth.account.addresses.cancel",
    namespace: "auth",
  },
  {
    description: "Akce pro uložení adresy.",
    key: "auth.account.addresses.save",
    namespace: "auth",
  },
  {
    description: "Akce pro opakované načtení adres.",
    key: "auth.account.addresses.retry",
    namespace: "auth",
  },
  {
    description: "Potvrzení vytvoření uložené adresy.",
    key: "auth.account.addresses.created",
    namespace: "auth",
  },
  {
    description: "Potvrzení aktualizace uložené adresy.",
    key: "auth.account.addresses.updated",
    namespace: "auth",
  },
  {
    description: "Potvrzení odstranění uložené adresy.",
    key: "auth.account.addresses.deleted",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při načítání uložených adres.",
    key: "auth.account.addresses.load_failed",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při vytváření uložené adresy.",
    key: "auth.account.addresses.create_failed",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při aktualizaci uložené adresy.",
    key: "auth.account.addresses.update_failed",
    namespace: "auth",
  },
  {
    description: "Záložní chyba při odstraňování uložené adresy.",
    key: "auth.account.addresses.delete_failed",
    namespace: "auth",
  },
  {
    description: "Nadpis potvrzení odstranění uložené adresy.",
    key: "auth.account.addresses.delete_title",
    namespace: "auth",
  },
  {
    description: "Popis potvrzení odstranění uložené adresy.",
    key: "auth.account.addresses.delete_description",
    namespace: "auth",
  },
] as const satisfies readonly StorefrontTextDefinition[]
