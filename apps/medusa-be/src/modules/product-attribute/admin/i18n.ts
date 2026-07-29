export type ProductAttributeAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "clear"
    | "collapse"
    | "create"
    | "delete"
    | "deletePermanently"
    | "edit"
    | "expand"
    | "restore"
    | "save"
    | "select"
    | "view",
    string
  >
  columns: Record<
    | "handle"
    | "key"
    | "label"
    | "product"
    | "public"
    | "status"
    | "type"
    | "usedBy",
    string
  >
  deletePrompt: Record<"definition" | "option", string>
  permanentDeletePrompt: Record<"definition" | "option", string>
  description: string
  errors: Record<
    | "deleteFailed"
    | "loadFailed"
    | "loadProductsFailed"
    | "restoreFailed"
    | "saveFailed",
    string
  >
  fields: Record<"inputType" | "isPublic" | "key" | "label", string>
  filters: Record<"activeOnly" | "allStatuses" | "deletedOnly", string>
  menuItem: string
  options: Record<
    | "assignedProducts"
    | "assignedProductsDescription"
    | "empty"
    | "noProducts"
    | "title",
    string
  >
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  placeholders: Record<
    | "key"
    | "label"
    | "productSearch"
    | "search"
    | "searchOptions"
    | "textValue",
    string
  >
  status: Record<
    "active" | "deleted" | "loading" | "no" | "selected" | "yes",
    string
  >
  title: string
  toasts: Record<"created" | "deleted" | "restored" | "saved", string>
  types: Record<"select" | "text", string>
  widget: Record<
    | "description"
    | "empty"
    | "loadFailed"
    | "manageTitle"
    | "optionSearch"
    | "title",
    string
  >
}

export const productAttributeAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      clear: "Vymazat",
      collapse: "Sbalit",
      create: "Vytvořit",
      delete: "Smazat",
      deletePermanently: "Trvale odstranit",
      edit: "Upravit",
      expand: "Rozbalit",
      restore: "Obnovit",
      save: "Uložit",
      select: "Vybrat",
      view: "Zobrazit",
    },
    columns: {
      handle: "Handle",
      key: "Klíč",
      label: "Název",
      product: "Produkt",
      public: "Store API",
      status: "Stav",
      type: "Typ",
      usedBy: "Přiřazené produkty",
    },
    deletePrompt: {
      definition:
        "Definice „{{label}}“ je přiřazena k {{count}} aktivním produktům. Bude označena jako smazaná; přiřazení zůstanou zachována.",
      option:
        "Možnost „{{label}}“ je přiřazena k {{count}} aktivním produktům. Bude označena jako smazaná; přiřazení zůstanou zachována.",
    },
    permanentDeletePrompt: {
      definition:
        "Definice „{{label}}“, všechny její možnosti a přiřazení budou trvale odstraněny. Aktivních přiřazení: {{count}}. Tuto akci nelze vrátit zpět.",
      option:
        "Možnost „{{label}}“ a všechna její přiřazení budou trvale odstraněny. Aktivních přiřazení: {{count}}. Tuto akci nelze vrátit zpět.",
    },
    description:
      "Definujte doplňující informace, které lze přiřazovat k produktům.",
    errors: {
      deleteFailed: "Záznam se nepodařilo smazat.",
      loadFailed: "Produktové atributy se nepodařilo načíst.",
      loadProductsFailed: "Přiřazené produkty se nepodařilo načíst.",
      restoreFailed: "Záznam se nepodařilo obnovit.",
      saveFailed: "Produktové atributy se nepodařilo uložit.",
    },
    fields: {
      inputType: "Typ vstupu",
      isPublic: "Zpřístupnit ve Store API",
      key: "Neměnný klíč",
      label: "Název",
    },
    filters: {
      activeOnly: "Pouze aktivní",
      allStatuses: "Všechny stavy",
      deletedOnly: "Pouze smazané",
    },
    menuItem: "Produktové atributy",
    options: {
      assignedProducts: "Přiřazené produkty",
      assignedProductsDescription:
        "Produkty, které aktuálně používají tuto možnost.",
      empty: "Žádné možnosti.",
      noProducts: "Tuto možnost nepoužívá žádný produkt.",
      title: "Možnosti",
    },
    pagination: {
      next: "Další",
      of: "z",
      pages: "stránek",
      previous: "Předchozí",
      results: "výsledků",
    },
    placeholders: {
      key: "např. supplier",
      label: "Název atributu",
      productSearch: "Hledat produkty",
      search: "Hledat atributy",
      searchOptions: "Hledat možnosti",
      textValue: "Zadejte hodnotu",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      loading: "Načítám...",
      no: "Ne",
      selected: "Vybráno",
      yes: "Ano",
    },
    title: "Produktové atributy",
    toasts: {
      created: "Záznam byl vytvořen.",
      deleted: "Záznam byl smazán.",
      restored: "Záznam byl obnoven.",
      saved: "Změny byly uloženy.",
    },
    types: {
      select: "Jedna možnost",
      text: "Text",
    },
    widget: {
      description: "Dodavatel, záruka a další vlastnosti produktu.",
      empty: "Produkt nemá vyplněné žádné doplňující informace.",
      loadFailed: "Doplňující informace se nepodařilo načíst.",
      manageTitle: "Upravit doplňující informace",
      optionSearch: "Hledat možnosti: {{label}}",
      title: "Doplňující informace",
    },
  },
  en: {
    actions: {
      add: "Add",
      cancel: "Cancel",
      clear: "Clear",
      collapse: "Collapse",
      create: "Create",
      delete: "Delete",
      deletePermanently: "Delete permanently",
      edit: "Edit",
      expand: "Expand",
      restore: "Restore",
      save: "Save",
      select: "Select",
      view: "View",
    },
    columns: {
      handle: "Handle",
      key: "Key",
      label: "Label",
      product: "Product",
      public: "Store API",
      status: "Status",
      type: "Type",
      usedBy: "Assigned products",
    },
    deletePrompt: {
      definition:
        "Definition “{{label}}” is assigned to {{count}} active products. It will be soft-deleted and its assignments will be preserved.",
      option:
        "Option “{{label}}” is assigned to {{count}} active products. It will be soft-deleted and its assignments will be preserved.",
    },
    permanentDeletePrompt: {
      definition:
        "Definition “{{label}}”, all its options, and all assignments will be permanently deleted. Active assignments: {{count}}. This action cannot be undone.",
      option:
        "Option “{{label}}” and all its assignments will be permanently deleted. Active assignments: {{count}}. This action cannot be undone.",
    },
    description:
      "Define additional information that can be assigned to products.",
    errors: {
      deleteFailed: "Failed to delete the record.",
      loadFailed: "Failed to load Product Attributes.",
      loadProductsFailed: "Failed to load assigned products.",
      restoreFailed: "Failed to restore the record.",
      saveFailed: "Failed to save Product Attributes.",
    },
    fields: {
      inputType: "Input type",
      isPublic: "Expose in Store API",
      key: "Immutable key",
      label: "Label",
    },
    filters: {
      activeOnly: "Active only",
      allStatuses: "All statuses",
      deletedOnly: "Deleted only",
    },
    menuItem: "Product Attributes",
    options: {
      assignedProducts: "Assigned products",
      assignedProductsDescription: "Products that currently use this option.",
      empty: "No options.",
      noProducts: "No products use this option.",
      title: "Options",
    },
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    placeholders: {
      key: "for example supplier",
      label: "Attribute label",
      productSearch: "Search products",
      search: "Search attributes",
      searchOptions: "Search options",
      textValue: "Enter a value",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      loading: "Loading...",
      no: "No",
      selected: "Selected",
      yes: "Yes",
    },
    title: "Product Attributes",
    toasts: {
      created: "Record created.",
      deleted: "Record deleted.",
      restored: "Record restored.",
      saved: "Changes saved.",
    },
    types: {
      select: "Single select",
      text: "Text",
    },
    widget: {
      description: "Supplier, warranty, and other product properties.",
      empty: "This product has no additional information assigned.",
      loadFailed: "Failed to load additional information.",
      manageTitle: "Edit additional information",
      optionSearch: "Search {{label}} options",
      title: "Additional information",
    },
  },
} satisfies Record<"cs" | "en", ProductAttributeAdminI18nNamespace>
