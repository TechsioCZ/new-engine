export type ProductAttributeAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "create"
    | "delete"
    | "edit"
    | "restore"
    | "save"
    | "select",
    string
  >
  columns: Record<
    "key" | "label" | "public" | "status" | "type" | "usedBy",
    string
  >
  deletePrompt: Record<"definition" | "option", string>
  errors: Record<
    "deleteFailed" | "loadFailed" | "restoreFailed" | "saveFailed",
    string
  >
  fields: Record<"inputType" | "isPublic" | "key" | "label", string>
  filters: Record<"activeOnly" | "allStatuses" | "deletedOnly", string>
  menuItem: string
  options: Record<"empty" | "title", string>
  placeholders: Record<
    "key" | "label" | "search" | "searchOptions" | "textValue",
    string
  >
  status: Record<"active" | "deleted" | "loading" | "no" | "yes", string>
  title: string
  toasts: Record<"created" | "deleted" | "restored" | "saved", string>
  types: Record<"select" | "text", string>
  widget: Record<
    "empty" | "loadFailed" | "manageTitle" | "supplierSearch" | "title",
    string
  >
}

export const productAttributeAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      create: "Vytvořit",
      delete: "Smazat",
      edit: "Upravit",
      restore: "Obnovit",
      save: "Uložit",
      select: "Vybrat",
    },
    columns: {
      key: "Klíč",
      label: "Název",
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
    errors: {
      deleteFailed: "Záznam se nepodařilo smazat.",
      loadFailed: "Produktové atributy se nepodařilo načíst.",
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
      empty: "Žádné možnosti.",
      title: "Možnosti",
    },
    placeholders: {
      key: "např. supplier",
      label: "Název atributu",
      search: "Hledat atributy",
      searchOptions: "Hledat možnosti",
      textValue: "Zadejte hodnotu",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      loading: "Načítám...",
      no: "Ne",
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
      empty: "Produkt nemá vyplněné žádné doplňující informace.",
      loadFailed: "Doplňující informace se nepodařilo načíst.",
      manageTitle: "Upravit doplňující informace",
      supplierSearch: "Hledat dodavatele",
      title: "Doplňující informace",
    },
  },
  en: {
    actions: {
      add: "Add",
      cancel: "Cancel",
      create: "Create",
      delete: "Delete",
      edit: "Edit",
      restore: "Restore",
      save: "Save",
      select: "Select",
    },
    columns: {
      key: "Key",
      label: "Label",
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
    errors: {
      deleteFailed: "Failed to delete the record.",
      loadFailed: "Failed to load Product Attributes.",
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
      empty: "No options.",
      title: "Options",
    },
    placeholders: {
      key: "for example supplier",
      label: "Attribute label",
      search: "Search attributes",
      searchOptions: "Search options",
      textValue: "Enter a value",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      loading: "Loading...",
      no: "No",
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
      empty: "This product has no additional information assigned.",
      loadFailed: "Failed to load additional information.",
      manageTitle: "Edit additional information",
      supplierSearch: "Search suppliers",
      title: "Additional information",
    },
  },
} satisfies Record<"cs" | "en", ProductAttributeAdminI18nNamespace>
