export type MeasurementUnitAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "clear"
    | "create"
    | "delete"
    | "edit"
    | "remove"
    | "restore"
    | "save"
    | "select"
    | "view",
    string
  >
  columns: Record<
    | "actions"
    | "baseQuantity"
    | "code"
    | "handle"
    | "name"
    | "product"
    | "quantity"
    | "status"
    | "symbol"
    | "usedBy",
    string
  >
  createMissing: Record<
    "deletedDescription" | "deletedTitle" | "description" | "title",
    string
  >
  detail: Record<
    | "assignedProducts"
    | "assignedProductsDescription"
    | "backToUnits"
    | "details"
    | "removeAssignmentDescription",
    string
  >
  deletePrompt: Record<"assignedDescription" | "description", string>
  errors: Record<
    | "createFailed"
    | "deleteFailed"
    | "loadDetailFailed"
    | "loadFailed"
    | "removeAssignmentFailed"
    | "restoreFailed"
    | "saveFailed",
    string
  >
  fields: Record<
    "baseQuantity" | "code" | "description" | "name" | "quantity" | "symbol",
    string
  >
  filters: Record<"activeOnly" | "allStatuses" | "deletedOnly", string>
  menuItem: string
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  placeholders: Record<
    | "baseQuantity"
    | "code"
    | "description"
    | "name"
    | "productSearch"
    | "quantity"
    | "search"
    | "symbol",
    string
  >
  status: Record<"active" | "deleted" | "loading" | "selected", string>
  title: string
  toasts: Record<
    | "created"
    | "deleted"
    | "productMeasurementCleared"
    | "productMeasurementUpdated"
    | "productVariantMeasurementCleared"
    | "productVariantMeasurementUpdated"
    | "restored"
    | "updated",
    string
  >
  units: Record<"assignedProductsEmpty" | "empty" | "none", string>
  validation: Record<"quantityPositive", string>
  widget: Record<
    | "deletedUnit"
    | "empty"
    | "loadFailed"
    | "manageTitle"
    | "selectedUnit"
    | "title"
    | "variantDeletedUnit"
    | "variantEmpty"
    | "variantLoadFailed"
    | "variantManageTitle"
    | "variantRequiresProductUnit"
    | "variantTitle",
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
      remove: "Odebrat",
      restore: "Obnovit",
      save: "Uložit",
      select: "Vybrat",
      view: "Zobrazit",
    },
    columns: {
      actions: "Akce",
      baseQuantity: "Základní množství",
      code: "Kód",
      handle: "Handle",
      name: "Název",
      product: "Produkt",
      quantity: "Množství produktu",
      status: "Stav",
      symbol: "Symbol",
      usedBy: "Přiřazené produkty",
    },
    createMissing: {
      deletedDescription:
        "Měrná jednotka s kódem {{code}} už existuje ve smazaném stavu. Před přiřazením ji obnovte v detailu měrné jednotky.",
      deletedTitle: "Měrná jednotka už existuje",
      description:
        "Měrná jednotka s tímto názvem nebo kódem neexistuje. Vytvořit ji a přiřadit k produktu?",
      title: "Vytvořit novou měrnou jednotku?",
    },
    detail: {
      assignedProducts: "Přiřazené produkty",
      assignedProductsDescription:
        "Produkty, které používají tuto měrnou jednotku.",
      backToUnits: "Zpět na měrné jednotky",
      details: "Detail",
      removeAssignmentDescription: "Odebrat měrnou jednotku z tohoto produktu?",
    },
    deletePrompt: {
      assignedDescription:
        "Tato měrná jednotka je přiřazena k {{count}} aktivním produktům. Smazáním se označí jako smazaná, ale existující přiřazení zůstanou viditelná jako smazaná jednotka.",
      description: "Měrná jednotka bude označena jako smazaná.",
    },
    errors: {
      createFailed: "Měrnou jednotku se nepodařilo vytvořit",
      deleteFailed: "Měrnou jednotku se nepodařilo smazat",
      loadDetailFailed: "Detail měrné jednotky se nepodařilo načíst",
      loadFailed: "Měrné jednotky se nepodařilo načíst",
      removeAssignmentFailed: "Přiřazení produktu se nepodařilo odebrat",
      restoreFailed: "Měrnou jednotku se nepodařilo obnovit",
      saveFailed: "Měrnou jednotku se nepodařilo uložit",
    },
    fields: {
      baseQuantity: "Základní množství",
      code: "Kód",
      description: "Popis",
      name: "Název",
      quantity: "Množství produktu",
      symbol: "Symbol",
    },
    filters: {
      activeOnly: "Pouze aktivní",
      allStatuses: "Všechny stavy",
      deletedOnly: "Pouze smazané",
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
      baseQuantity: "1 nebo 100",
      code: "kg",
      description: "Volitelný popis",
      name: "Kilogram",
      productSearch: "Hledat produkty",
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
      productVariantMeasurementCleared: "Množství varianty vymazáno",
      productVariantMeasurementUpdated: "Množství varianty uloženo",
      restored: "Měrná jednotka obnovena",
      updated: "Měrná jednotka uložena",
    },
    units: {
      assignedProductsEmpty:
        "Tato měrná jednotka není přiřazena k žádným produktům.",
      empty: "Žádné měrné jednotky nenalezeny.",
      none: "Bez měrné jednotky",
    },
    validation: {
      quantityPositive: "Množství musí být větší než nula.",
    },
    widget: {
      deletedUnit: "Přiřazená měrná jednotka je smazaná.",
      empty: "Produkt nemá nastavenou měrnou jednotku.",
      loadFailed: "Měrnou jednotku produktu se nepodařilo načíst.",
      manageTitle: "Nastavit měrnou jednotku",
      selectedUnit: "Vybraná jednotka",
      title: "Měrná jednotka",
      variantDeletedUnit: "Množství je navázané na smazanou měrnou jednotku.",
      variantEmpty: "Varianta nemá nastavené množství.",
      variantLoadFailed: "Množství varianty se nepodařilo načíst.",
      variantManageTitle: "Nastavit množství varianty",
      variantRequiresProductUnit:
        "Nejprve nastavte měrnou jednotku na produktu.",
      variantTitle: "Množství varianty",
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
      remove: "Remove",
      restore: "Restore",
      save: "Save",
      select: "Select",
      view: "View",
    },
    columns: {
      actions: "Actions",
      baseQuantity: "Base quantity",
      code: "Code",
      handle: "Handle",
      name: "Name",
      product: "Product",
      quantity: "Product quantity",
      status: "Status",
      symbol: "Symbol",
      usedBy: "Assigned products",
    },
    createMissing: {
      deletedDescription:
        "A measurement unit with code {{code}} already exists in deleted state. Restore it from the measurement unit detail before assigning it.",
      deletedTitle: "Measurement unit already exists",
      description:
        "No measurement unit exists for this name or code. Create it and assign it to the product?",
      title: "Create new measurement unit?",
    },
    detail: {
      assignedProducts: "Assigned products",
      assignedProductsDescription:
        "Products currently using this measurement unit.",
      backToUnits: "Back to measurement units",
      details: "Details",
      removeAssignmentDescription:
        "Remove the measurement unit from this product?",
    },
    deletePrompt: {
      assignedDescription:
        "This measurement unit is assigned to {{count}} active products. Deleting it will mark the unit as deleted, but existing assignments will remain visible as a deleted unit.",
      description: "This measurement unit will be marked as deleted.",
    },
    errors: {
      createFailed: "Failed to create measurement unit",
      deleteFailed: "Failed to delete measurement unit",
      loadDetailFailed: "Failed to load measurement unit detail",
      loadFailed: "Failed to load measurement units",
      removeAssignmentFailed: "Failed to remove product assignment",
      restoreFailed: "Failed to restore measurement unit",
      saveFailed: "Failed to save measurement unit",
    },
    fields: {
      baseQuantity: "Base quantity",
      code: "Code",
      description: "Description",
      name: "Name",
      quantity: "Product quantity",
      symbol: "Symbol",
    },
    filters: {
      activeOnly: "Active only",
      allStatuses: "All statuses",
      deletedOnly: "Deleted only",
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
      baseQuantity: "1 or 100",
      code: "kg",
      description: "Optional description",
      name: "Kilogram",
      productSearch: "Search products",
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
      productVariantMeasurementCleared: "Variant quantity cleared",
      productVariantMeasurementUpdated: "Variant quantity saved",
      restored: "Measurement unit restored",
      updated: "Measurement unit saved",
    },
    units: {
      assignedProductsEmpty:
        "This measurement unit is not assigned to any products.",
      empty: "No measurement units found.",
      none: "No measurement unit",
    },
    validation: {
      quantityPositive: "Quantity must be greater than zero.",
    },
    widget: {
      deletedUnit: "The assigned measurement unit is deleted.",
      empty: "This product has no measurement unit.",
      loadFailed: "Failed to load product measurement.",
      manageTitle: "Set measurement unit",
      selectedUnit: "Selected unit",
      title: "Measurement unit",
      variantDeletedUnit:
        "This quantity is tied to a deleted measurement unit.",
      variantEmpty: "This variant has no measurement quantity.",
      variantLoadFailed: "Failed to load variant measurement quantity.",
      variantManageTitle: "Set variant quantity",
      variantRequiresProductUnit:
        "Set the product measurement unit before entering variant quantity.",
      variantTitle: "Variant quantity",
    },
  },
} satisfies Record<"cs" | "en", MeasurementUnitAdminI18nNamespace>
