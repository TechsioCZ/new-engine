export type ProducerAdminI18nNamespace = {
  actions: Record<
    | "add"
    | "cancel"
    | "clear"
    | "create"
    | "delete"
    | "edit"
    | "manage"
    | "remove"
    | "restore"
    | "save"
    | "select",
    string
  >
  attributes: Record<
    | "count"
    | "empty"
    | "matchingProducerCount"
    | "newPlaceholder"
    | "title"
    | "usageCount",
    string
  >
  columns: Record<
    | "actions"
    | "attributes"
    | "handle"
    | "name"
    | "producer"
    | "product"
    | "products"
    | "status"
    | "title"
    | "updated"
    | "usedBy"
    | "value",
    string
  >
  detail: Record<
    | "activeProducts"
    | "backToProducers"
    | "details"
    | "id"
    | "linkedProductsCount",
    string
  >
  errors: Record<
    | "attributeIdRequired"
    | "checkAttributeFailed"
    | "createAttributeFailed"
    | "deleteAttributeFailed"
    | "deleteProducerFailed"
    | "loadAttributeFailed"
    | "loadProducerFailed"
    | "loadProducersFailed"
    | "productIdRequired"
    | "producerIdRequired"
    | "removeProductFailed"
    | "restoreAttributeFailed"
    | "restoreProducerFailed"
    | "saveProducerFailed"
    | "saveProductsFailed",
    string
  >
  fields: Record<"attribute" | "handle" | "title" | "value", string>
  filters: Record<"activeOnly" | "allStatuses", string>
  form: Record<"createProducer" | "editProducer" | "handlePlaceholder", string>
  menuItem: string
  orderOptions: Record<
    | "handleAsc"
    | "newest"
    | "producerAsc"
    | "producerDesc"
    | "recentlyUpdated"
    | "statusAsc"
    | "titleAsc"
    | "titleDesc"
    | "valueAsc",
    string
  >
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  prompts: Record<
    | "deleteAttributeDescription"
    | "deleteAttributeUsage"
    | "deleteAttributeTitle"
    | "deleteProducerDescription"
    | "deleteProducerProducts"
    | "deleteProducerTitle"
    | "removeProductDescription"
    | "removeProductTitle"
    | "restoreAttributeDescription"
    | "restoreAttributeTitle",
    string
  >
  products: Record<
    | "alreadyLinkedTooltip"
    | "count"
    | "emptyLinked"
    | "emptyOptions"
    | "emptySearch"
    | "linked"
    | "manageTitle"
    | "notLinked"
    | "selectedCount"
    | "title",
    string
  >
  producers: Record<"count" | "empty" | "title" | "widgetTitle", string>
  search: Record<"attributes" | "producers" | "products", string>
  status: Record<"active" | "deleted" | "loading" | "selected", string>
  toasts: Record<
    | "attributeAlreadyExists"
    | "attributeCreated"
    | "attributeDeleted"
    | "attributeExistsError"
    | "attributeRestored"
    | "producerCreated"
    | "producerDeleted"
    | "producerProductsUpdated"
    | "producerRestored"
    | "producerUpdated"
    | "productProducerUpdated"
    | "productRemoved",
    string
  >
  widget: Record<
    | "empty"
    | "loadFailed"
    | "manageTitle"
    | "none"
    | "selectedProducer"
    | "title",
    string
  >
}

export const producerAdminI18n = {
  cs: {
    actions: {
      add: "Přidat",
      cancel: "Zrušit",
      clear: "Vymazat",
      create: "Vytvořit",
      delete: "Smazat",
      edit: "Upravit",
      manage: "Spravovat",
      remove: "Odebrat",
      restore: "Obnovit",
      save: "Uložit",
      select: "Vybrat",
    },
    attributes: {
      count: "{{count}} atributů",
      empty: "Žádné atributy.",
      matchingProducerCount: "{{count}} odpovídajících výrobců",
      newPlaceholder: "Nový atribut",
      title: "Atributy",
      usageCount: "Používá {{count}} aktivních výrobců",
    },
    columns: {
      actions: "Akce",
      attributes: "Atributy",
      handle: "Handle",
      name: "Název",
      producer: "Výrobce",
      product: "Produkt",
      products: "Produkty",
      status: "Stav",
      title: "Název",
      updated: "Upraveno",
      usedBy: "Používá",
      value: "Hodnota",
    },
    detail: {
      activeProducts: "Aktivní produkty",
      backToProducers: "Zpět na výrobce",
      details: "Detaily",
      id: "ID",
      linkedProductsCount: "{{count}} propojených produktů",
    },
    errors: {
      attributeIdRequired: "ID atributu je povinné",
      checkAttributeFailed: "Kontrola atributu selhala",
      createAttributeFailed: "Atribut se nepodařilo vytvořit",
      deleteAttributeFailed: "Atribut se nepodařilo smazat",
      deleteProducerFailed: "Výrobce se nepodařilo smazat",
      loadAttributeFailed: "Atribut se nepodařilo načíst.",
      loadProducerFailed: "Výrobce se nepodařilo načíst.",
      loadProducersFailed: "Výrobce se nepodařilo načíst.",
      productIdRequired: "ID produktu je povinné",
      producerIdRequired: "ID výrobce je povinné",
      removeProductFailed: "Produkt se nepodařilo odebrat",
      restoreAttributeFailed: "Atribut se nepodařilo obnovit",
      restoreProducerFailed: "Výrobce se nepodařilo obnovit",
      saveProducerFailed: "Výrobce se nepodařilo uložit",
      saveProductsFailed: "Produkty se nepodařilo uložit",
    },
    fields: {
      attribute: "Atribut",
      handle: "Handle",
      title: "Název",
      value: "Hodnota",
    },
    filters: {
      activeOnly: "Pouze aktivní",
      allStatuses: "Všechny stavy",
    },
    form: {
      createProducer: "Vytvořit výrobce",
      editProducer: "Upravit výrobce",
      handlePlaceholder: "automaticky z názvu",
    },
    menuItem: "Výrobci",
    orderOptions: {
      handleAsc: "Handle A-Z",
      newest: "Nejnovější",
      producerAsc: "Výrobce A-Z",
      producerDesc: "Výrobce Z-A",
      recentlyUpdated: "Naposledy upravené",
      statusAsc: "Stav A-Z",
      titleAsc: "Název A-Z",
      titleDesc: "Název Z-A",
      valueAsc: "Hodnota A-Z",
    },
    pagination: {
      next: "Další",
      of: "z",
      pages: "stránek",
      previous: "Předchozí",
      results: "výsledků",
    },
    prompts: {
      deleteAttributeDescription:
        'Soft-smazat atribut "{{name}}"?{{usageText}}',
      deleteAttributeTitle: "Smazat atribut",
      deleteAttributeUsage: " Aktuálně ho používá {{count}} aktivních výrobců.",
      deleteProducerDescription: 'Smazat výrobce "{{title}}"?{{linkedText}}',
      deleteProducerProducts: " Je propojen s {{count}} aktivními produkty.",
      deleteProducerTitle: "Smazat výrobce",
      removeProductDescription: 'Odebrat "{{title}}" od tohoto výrobce?',
      removeProductTitle: "Odebrat produkt",
      restoreAttributeDescription:
        'Atribut "{{name}}" už existuje, ale je smazaný. Obnovit ho místo vytvoření nového?',
      restoreAttributeTitle: "Obnovit atribut",
    },
    products: {
      alreadyLinkedTooltip: 'Už je propojen s výrobcem "{{title}}"',
      count: "{{count}} produktů",
      emptyLinked: "Žádné propojené produkty.",
      emptyOptions: "Nebyly nalezeny žádné produkty bez výrobce.",
      emptySearch: "Nebyly nalezeny žádné produkty.",
      linked: "Propojeno",
      manageTitle: "Spravovat produkty",
      notLinked: "Není propojeno",
      selectedCount: "{{count}} vybráno",
      title: "Produkty",
    },
    producers: {
      count: "{{count}} výrobců",
      empty: "Nebyli nalezeni žádní výrobci.",
      title: "Výrobci",
      widgetTitle: "Výrobce",
    },
    search: {
      attributes: "Hledat atributy",
      producers: "Hledat výrobce",
      products: "Hledat produkty",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      loading: "Načítání...",
      selected: "Vybráno",
    },
    toasts: {
      attributeAlreadyExists: "Atribut už existuje",
      attributeCreated: "Atribut vytvořen",
      attributeDeleted: "Atribut smazán",
      attributeExistsError: 'Atribut "{{name}}" už existuje',
      attributeRestored: "Atribut obnoven",
      producerCreated: "Výrobce vytvořen",
      producerDeleted: "Výrobce smazán",
      producerProductsUpdated: "Produkty výrobce upraveny",
      producerRestored: "Výrobce obnoven",
      producerUpdated: "Výrobce upraven",
      productProducerUpdated: "Výrobce produktu upraven",
      productRemoved: "Produkt odebrán",
    },
    widget: {
      empty: "Žádný výrobce není propojen.",
      loadFailed: "Výrobce se nepodařilo načíst.",
      manageTitle: "Spravovat výrobce",
      none: "Žádný",
      selectedProducer: "Vybraný výrobce",
      title: "Výrobce",
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
      manage: "Manage",
      remove: "Remove",
      restore: "Restore",
      save: "Save",
      select: "Select",
    },
    attributes: {
      count: "{{count}} attributes",
      empty: "No attributes.",
      matchingProducerCount: "{{count}} matching producers",
      newPlaceholder: "New attribute",
      title: "Attributes",
      usageCount: "Used by {{count}} active producers",
    },
    columns: {
      actions: "Actions",
      attributes: "Attributes",
      handle: "Handle",
      name: "Name",
      producer: "Producer",
      product: "Product",
      products: "Products",
      status: "Status",
      title: "Title",
      updated: "Updated",
      usedBy: "Used by",
      value: "Value",
    },
    detail: {
      activeProducts: "Active products",
      backToProducers: "Back to producers",
      details: "Details",
      id: "ID",
      linkedProductsCount: "{{count}} linked products",
    },
    errors: {
      attributeIdRequired: "Attribute id is required",
      checkAttributeFailed: "Failed to check attribute",
      createAttributeFailed: "Failed to create attribute",
      deleteAttributeFailed: "Failed to delete attribute",
      deleteProducerFailed: "Failed to delete producer",
      loadAttributeFailed: "Failed to load attribute.",
      loadProducerFailed: "Failed to load producer.",
      loadProducersFailed: "Failed to load producers.",
      productIdRequired: "Product id is required",
      producerIdRequired: "Producer id is required",
      removeProductFailed: "Failed to remove product",
      restoreAttributeFailed: "Failed to restore attribute",
      restoreProducerFailed: "Failed to restore producer",
      saveProducerFailed: "Failed to save producer",
      saveProductsFailed: "Failed to save products",
    },
    fields: {
      attribute: "Attribute",
      handle: "Handle",
      title: "Title",
      value: "Value",
    },
    filters: {
      activeOnly: "Active only",
      allStatuses: "All statuses",
    },
    form: {
      createProducer: "Create Producer",
      editProducer: "Edit Producer",
      handlePlaceholder: "auto-generated from title",
    },
    menuItem: "Producers",
    orderOptions: {
      handleAsc: "Handle A-Z",
      newest: "Newest",
      producerAsc: "Producer A-Z",
      producerDesc: "Producer Z-A",
      recentlyUpdated: "Recently updated",
      statusAsc: "Status A-Z",
      titleAsc: "Title A-Z",
      titleDesc: "Title Z-A",
      valueAsc: "Value A-Z",
    },
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    prompts: {
      deleteAttributeDescription:
        'Soft-delete attribute "{{name}}"?{{usageText}}',
      deleteAttributeTitle: "Delete attribute",
      deleteAttributeUsage:
        " It is currently used by {{count}} active producers.",
      deleteProducerDescription: 'Delete producer "{{title}}"?{{linkedText}}',
      deleteProducerProducts: " It is linked to {{count}} active products.",
      deleteProducerTitle: "Delete producer",
      removeProductDescription: 'Remove "{{title}}" from this producer?',
      removeProductTitle: "Remove product",
      restoreAttributeDescription:
        'Attribute "{{name}}" already exists but is deleted. Restore it instead?',
      restoreAttributeTitle: "Restore attribute",
    },
    products: {
      alreadyLinkedTooltip: 'Already linked to producer "{{title}}"',
      count: "{{count}} products",
      emptyLinked: "No linked products.",
      emptyOptions: "No products without a producer found.",
      emptySearch: "No products found.",
      linked: "Linked",
      manageTitle: "Manage Products",
      notLinked: "Not linked",
      selectedCount: "{{count}} selected",
      title: "Products",
    },
    producers: {
      count: "{{count}} producers",
      empty: "No producers found.",
      title: "Producers",
      widgetTitle: "Producer",
    },
    search: {
      attributes: "Search attributes",
      producers: "Search producers",
      products: "Search products",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      loading: "Loading...",
      selected: "Selected",
    },
    toasts: {
      attributeAlreadyExists: "Attribute already exists",
      attributeCreated: "Attribute created",
      attributeDeleted: "Attribute deleted",
      attributeExistsError: 'Attribute "{{name}}" already exists',
      attributeRestored: "Attribute restored",
      producerCreated: "Producer created",
      producerDeleted: "Producer deleted",
      producerProductsUpdated: "Producer products updated",
      producerRestored: "Producer restored",
      producerUpdated: "Producer updated",
      productProducerUpdated: "Product producer updated",
      productRemoved: "Product removed",
    },
    widget: {
      empty: "No producer linked.",
      loadFailed: "Failed to load producer.",
      manageTitle: "Manage Producer",
      none: "None",
      selectedProducer: "Selected producer",
      title: "Producer",
    },
  },
} satisfies Record<"cs" | "en", ProducerAdminI18nNamespace>
