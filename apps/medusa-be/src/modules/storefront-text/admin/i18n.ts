import type {
  StorefrontTextMarket,
  StorefrontTextStatus,
} from "../configuration"

export type StorefrontTextAdminI18nNamespace = {
  actions: Record<
    | "cancel"
    | "edit"
    | "export"
    | "import"
    | "resetDefault"
    | "save"
    | "sync",
    string
  >
  catalog: Record<"description" | "file" | "title", string>
  description: string
  drawer: Record<"description" | "title", string>
  errors: Record<
    | "exportFailed"
    | "importFailed"
    | "invalidCatalog"
    | "missingCatalog"
    | "missingText"
    | "saveFailed"
    | "selectMarket"
    | "syncFailed",
    string
  >
  fields: Record<
    | "defaultValue"
    | "key"
    | "locale"
    | "market"
    | "namespace"
    | "overrideValue"
    | "status",
    string
  >
  filters: Record<
    | "allMarkets"
    | "allNamespaces"
    | "allStatuses"
    | "onlyValues"
    | "searchAll"
    | "searchValues",
    string
  >
  markets: Record<StorefrontTextMarket, string>
  menuItem: string
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  statuses: Record<StorefrontTextStatus, string>
  table: Record<
    | "empty"
    | "internalName"
    | "loading"
    | "locale"
    | "market"
    | "namespace"
    | "status"
    | "value",
    string
  >
  toasts: Record<
    "exported" | "imported" | "reset" | "saved" | "synchronized",
    string
  >
}

export const storefrontTextAdminI18n = {
  cs: {
    actions: {
      cancel: "Zrušit",
      edit: "Upravit text",
      export: "Exportovat JSON",
      import: "Importovat JSON",
      resetDefault: "Obnovit výchozí",
      save: "Uložit",
      sync: "Synchronizovat klíče",
    },
    catalog: {
      description: "Import storefront překladového katalogu.",
      file: "JSON katalog",
      title: "Importovat překlady",
    },
    description: "Editace storefront UI textů řízených backendem.",
    drawer: {
      description: "Úprava storefront textu a jeho publikačního statusu.",
      title: "Upravit text",
    },
    errors: {
      exportFailed: "Katalog se nepodařilo exportovat.",
      importFailed: "Katalog se nepodařilo importovat.",
      invalidCatalog: "Soubor neobsahuje platný JSON katalog.",
      missingCatalog: "Vyberte market a JSON katalog.",
      missingText: "Storefront text je povinný.",
      saveFailed: "Text se nepodařilo uložit.",
      selectMarket: "Nejprve vyberte market.",
      syncFailed: "Synchronizace se nepodařila.",
    },
    fields: {
      defaultValue: "Výchozí hodnota",
      key: "Klíč",
      locale: "Locale",
      market: "Market",
      namespace: "Namespace",
      overrideValue: "Vlastní hodnota",
      status: "Status",
    },
    filters: {
      allMarkets: "Všechny markety",
      allNamespaces: "Všechny namespace",
      allStatuses: "Všechny statusy",
      onlyValues: "Pouze v hodnotách",
      searchAll: "Hledat ve všem",
      searchValues: "Hledat v hodnotách",
    },
    markets: {
      cz: "Česko",
      hu: "Maďarsko",
      ro: "Rumunsko",
      sk: "Slovensko",
    },
    menuItem: "Jazyky",
    pagination: {
      next: "Další",
      of: "z",
      pages: "stran",
      previous: "Předchozí",
      results: "výsledků",
    },
    statuses: {
      active: "Aktivní",
      draft: "Koncept",
    },
    table: {
      empty: "Žádné texty nenalezeny.",
      internalName: "Interní jméno",
      loading: "Načítám...",
      locale: "Locale",
      market: "Market",
      namespace: "Namespace",
      status: "Status",
      value: "Hodnota",
    },
    toasts: {
      exported: "Katalog byl exportován.",
      imported:
        "Katalog importován: upravené: {{updated}}, beze změny: {{unchanged}}.",
      reset: "Text obnoven na výchozí hodnotu.",
      saved: "Text uložen.",
      synchronized:
        "Synchronizováno: nové: {{created}}, upravené: {{updated}}.",
    },
  },
  en: {
    actions: {
      cancel: "Cancel",
      edit: "Edit text",
      export: "Export JSON",
      import: "Import JSON",
      resetDefault: "Restore default",
      save: "Save",
      sync: "Synchronize keys",
    },
    catalog: {
      description: "Import a storefront translation catalog.",
      file: "JSON catalog",
      title: "Import translations",
    },
    description: "Edit storefront UI texts managed by the backend.",
    drawer: {
      description: "Edit the storefront text and its publication status.",
      title: "Edit text",
    },
    errors: {
      exportFailed: "Failed to export the catalog.",
      importFailed: "Failed to import the catalog.",
      invalidCatalog: "The file does not contain a valid JSON catalog.",
      missingCatalog: "Select a market and JSON catalog.",
      missingText: "Storefront text is required.",
      saveFailed: "Failed to save the text.",
      selectMarket: "Select a market first.",
      syncFailed: "Failed to synchronize the keys.",
    },
    fields: {
      defaultValue: "Default value",
      key: "Key",
      locale: "Locale",
      market: "Market",
      namespace: "Namespace",
      overrideValue: "Custom value",
      status: "Status",
    },
    filters: {
      allMarkets: "All markets",
      allNamespaces: "All namespaces",
      allStatuses: "All statuses",
      onlyValues: "Values only",
      searchAll: "Search all fields",
      searchValues: "Search values",
    },
    markets: {
      cz: "Czechia",
      hu: "Hungary",
      ro: "Romania",
      sk: "Slovakia",
    },
    menuItem: "Languages",
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    statuses: {
      active: "Active",
      draft: "Draft",
    },
    table: {
      empty: "No texts found.",
      internalName: "Internal name",
      loading: "Loading...",
      locale: "Locale",
      market: "Market",
      namespace: "Namespace",
      status: "Status",
      value: "Value",
    },
    toasts: {
      exported: "Catalog exported.",
      imported:
        "Catalog imported: updated: {{updated}}, unchanged: {{unchanged}}.",
      reset: "Text restored to its default value.",
      saved: "Text saved.",
      synchronized:
        "Synchronized: new: {{created}}, updated: {{updated}}.",
    },
  },
} satisfies Record<"cs" | "en", StorefrontTextAdminI18nNamespace>
