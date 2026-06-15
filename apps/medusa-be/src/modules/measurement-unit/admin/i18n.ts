export type MeasurementUnitAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "clear"
    | "create"
    | "delete"
    | "edit"
    | "restore"
    | "save"
    | "select",
    string
  >
  columns: Record<
    "actions" | "code" | "name" | "quantity" | "status" | "symbol" | "usedBy",
    string
  >
  createMissing: Record<"description" | "title", string>
  errors: Record<
    | "createFailed"
    | "deleteFailed"
    | "loadFailed"
    | "restoreFailed"
    | "saveFailed",
    string
  >
  fields: Record<
    "code" | "description" | "name" | "quantity" | "symbol",
    string
  >
  filters: Record<"activeOnly" | "allStatuses", string>
  menuItem: string
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  placeholders: Record<
    "code" | "description" | "name" | "quantity" | "search" | "symbol",
    string
  >
  status: Record<"active" | "deleted" | "loading" | "selected", string>
  title: string
  toasts: Record<
    | "created"
    | "deleted"
    | "productMeasurementCleared"
    | "productMeasurementUpdated"
    | "restored"
    | "updated",
    string
  >
  units: Record<"empty" | "none", string>
  widget: Record<
    | "empty"
    | "loadFailed"
    | "manageTitle"
    | "selectedUnit"
    | "title"
    | "unitPricePreview",
    string
  >
}

export const measurementUnitAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      clear: "Vymazat",
      create: "Vytvořit",
      delete: "Smazat",
      edit: "Upravit",
      restore: "Obnovit",
      save: "Uložit",
      select: "Vybrat",
    },
    columns: {
      actions: "Akce",
      code: "Kód",
      name: "Název",
      quantity: "Množství produktu",
      status: "Stav",
      symbol: "Symbol",
      usedBy: "Aktivní produkty",
    },
    createMissing: {
      description:
        "Měrná jednotka s tímto názvem nebo kódem neexistuje. Vytvořit ji a přiřadit k produktu?",
      title: "Vytvořit novou měrnou jednotku?",
    },
    errors: {
      createFailed: "Měrnou jednotku se nepodařilo vytvořit",
      deleteFailed: "Měrnou jednotku se nepodařilo smazat",
      loadFailed: "Měrné jednotky se nepodařilo načíst",
      restoreFailed: "Měrnou jednotku se nepodařilo obnovit",
      saveFailed: "Měrnou jednotku se nepodařilo uložit",
    },
    fields: {
      code: "Kód",
      description: "Popis",
      name: "Název",
      quantity: "Množství produktu",
      symbol: "Symbol",
    },
    filters: {
      activeOnly: "Pouze aktivní",
      allStatuses: "Všechny stavy",
    },
    menuItem: "Měrné jednotky",
    pagination: {
      next: "Další",
      of: "z",
      pages: "stránek",
      previous: "Předchozí",
      results: "výsledků",
    },
    placeholders: {
      code: "kg",
      description: "Volitelný popis",
      name: "Kilogram",
      quantity: "0.5",
      search: "Hledat měrné jednotky",
      symbol: "kg",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      loading: "Načítám...",
      selected: "Vybráno",
    },
    title: "Měrné jednotky",
    toasts: {
      created: "Měrná jednotka vytvořena",
      deleted: "Měrná jednotka smazána",
      productMeasurementCleared: "Měrná jednotka produktu vymazána",
      productMeasurementUpdated: "Měrná jednotka produktu uložena",
      restored: "Měrná jednotka obnovena",
      updated: "Měrná jednotka uložena",
    },
    units: {
      empty: "Žádné měrné jednotky nenalezeny.",
      none: "Bez měrné jednotky",
    },
    widget: {
      empty: "Produkt nemá nastavenou měrnou jednotku.",
      loadFailed: "Měrnou jednotku produktu se nepodařilo načíst.",
      manageTitle: "Nastavit měrnou jednotku",
      selectedUnit: "Vybraná jednotka",
      title: "Měrná jednotka",
      unitPricePreview:
        "Cena za jednotku se počítá ze zobrazené ceny varianty.",
    },
  },
  en: {
    actions: {
      add: "Add",
      cancel: "Cancel",
      clear: "Clear",
      create: "Create",
      delete: "Delete",
      edit: "Edit",
      restore: "Restore",
      save: "Save",
      select: "Select",
    },
    columns: {
      actions: "Actions",
      code: "Code",
      name: "Name",
      quantity: "Product quantity",
      status: "Status",
      symbol: "Symbol",
      usedBy: "Active products",
    },
    createMissing: {
      description:
        "No measurement unit exists for this name or code. Create it and assign it to the product?",
      title: "Create new measurement unit?",
    },
    errors: {
      createFailed: "Failed to create measurement unit",
      deleteFailed: "Failed to delete measurement unit",
      loadFailed: "Failed to load measurement units",
      restoreFailed: "Failed to restore measurement unit",
      saveFailed: "Failed to save measurement unit",
    },
    fields: {
      code: "Code",
      description: "Description",
      name: "Name",
      quantity: "Product quantity",
      symbol: "Symbol",
    },
    filters: {
      activeOnly: "Active only",
      allStatuses: "All statuses",
    },
    menuItem: "Measurement units",
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    placeholders: {
      code: "kg",
      description: "Optional description",
      name: "Kilogram",
      quantity: "0.5",
      search: "Search measurement units",
      symbol: "kg",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      loading: "Loading...",
      selected: "Selected",
    },
    title: "Measurement units",
    toasts: {
      created: "Measurement unit created",
      deleted: "Measurement unit deleted",
      productMeasurementCleared: "Product measurement cleared",
      productMeasurementUpdated: "Product measurement saved",
      restored: "Measurement unit restored",
      updated: "Measurement unit saved",
    },
    units: {
      empty: "No measurement units found.",
      none: "No measurement unit",
    },
    widget: {
      empty: "This product has no measurement unit.",
      loadFailed: "Failed to load product measurement.",
      manageTitle: "Set measurement unit",
      selectedUnit: "Selected unit",
      title: "Measurement unit",
      unitPricePreview:
        "Unit price is calculated from the displayed variant price.",
    },
  },
} satisfies Record<"cs" | "en", MeasurementUnitAdminI18nNamespace>
