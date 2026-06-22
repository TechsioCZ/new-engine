export type BrandAdminI18nNamespace = {
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
    | "matchingBrandCount"
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
    | "brand"
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
    | "backToBrands"
    | "details"
    | "id"
    | "linkedProductsCount"
    | "openBrand"
    | "openProduct",
    string
  >
  errors: Record<
    | "attributeIdRequired"
    | "checkAttributeFailed"
    | "createAttributeFailed"
    | "deleteAttributeFailed"
    | "deleteBrandFailed"
    | "loadAttributeFailed"
    | "loadBrandFailed"
    | "loadBrandsFailed"
    | "productIdRequired"
    | "brandIdRequired"
    | "removeProductFailed"
    | "restoreAttributeFailed"
    | "restoreBrandFailed"
    | "saveBrandFailed"
    | "saveProductsFailed",
    string
  >
  fields: Record<
    | "attribute"
    | "gpsrContactEmail"
    | "gpsrEuropeanResellerContactEmail"
    | "gpsrEuropeanResellerManufacturingCompanyName"
    | "gpsrEuropeanResellerPostalAddress"
    | "gpsrManufacturedOutsideEu"
    | "gpsrManufacturingCompanyName"
    | "gpsrPostalAddress"
    | "handle"
    | "supplier"
    | "title"
    | "value",
    string
  >
  filters: Record<"activeOnly" | "allStatuses", string>
  form: Record<"createBrand" | "editBrand" | "handlePlaceholder", string>
  menuItem: string
  orderOptions: Record<
    | "handleAsc"
    | "newest"
    | "brandAsc"
    | "brandDesc"
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
    | "deleteBrandDescription"
    | "deleteBrandProducts"
    | "deleteBrandTitle"
    | "removeProductDescription"
    | "removeProductTitle"
    | "restoreAttributeDescription"
    | "restoreAttributeTitle"
    | "restoreBrandDescription"
    | "restoreBrandTitle",
    string
  >
  products: Record<
    | "alreadyLinkedTooltip"
    | "count"
    | "emptyLinked"
    | "emptyOptions"
    | "emptySearch"
    | "inactiveLinked"
    | "linked"
    | "manageTitle"
    | "notLinked"
    | "selectedCount"
    | "title",
    string
  >
  brands: Record<"count" | "empty" | "title" | "widgetTitle", string>
  search: Record<"attributes" | "brands" | "products", string>
  status: Record<
    "active" | "deleted" | "inactive" | "loading" | "selected",
    string
  >
  toasts: Record<
    | "attributeAlreadyExists"
    | "attributeCreated"
    | "attributeDeleted"
    | "attributeExistsError"
    | "attributeRestored"
    | "brandCreated"
    | "brandDeleted"
    | "brandExistsError"
    | "brandProductsUpdated"
    | "brandReactivated"
    | "brandRestored"
    | "brandUpdated"
    | "productBrandUpdated"
    | "productRemoved",
    string
  >
  widget: Record<
    "empty" | "loadFailed" | "manageTitle" | "none" | "selectedBrand" | "title",
    string
  >
}

export const brandAdminI18n = {
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
      matchingBrandCount: "{{count}} odpovídajících výrobců",
      newPlaceholder: "Nový atribut",
      title: "Atributy",
      usageCount: "Používá {{count}} aktivních výrobců",
    },
    columns: {
      actions: "Akce",
      attributes: "Atributy",
      handle: "Handle",
      name: "Název",
      brand: "Výrobce",
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
      backToBrands: "Zpět na výrobce",
      details: "Detaily",
      id: "ID",
      linkedProductsCount: "{{count}} propojených produktů",
      openBrand: "Otevřít výrobce {{title}}",
      openProduct: "Otevřít produkt {{title}}",
    },
    errors: {
      attributeIdRequired: "ID atributu je povinné",
      checkAttributeFailed: "Kontrola atributu selhala",
      createAttributeFailed: "Atribut se nepodařilo vytvořit",
      deleteAttributeFailed: "Atribut se nepodařilo smazat",
      deleteBrandFailed: "Výrobce se nepodařilo smazat",
      loadAttributeFailed: "Atribut se nepodařilo načíst.",
      loadBrandFailed: "Výrobce se nepodařilo načíst.",
      loadBrandsFailed: "Výrobce se nepodařilo načíst.",
      productIdRequired: "ID produktu je povinné",
      brandIdRequired: "ID výrobce je povinné",
      removeProductFailed: "Produkt se nepodařilo odebrat",
      restoreAttributeFailed: "Atribut se nepodařilo obnovit",
      restoreBrandFailed: "Výrobce se nepodařilo obnovit",
      saveBrandFailed: "Výrobce se nepodařilo uložit",
      saveProductsFailed: "Produkty se nepodařilo uložit",
    },
    fields: {
      attribute: "Atribut",
      gpsrContactEmail: "E-mail výrobce pro GPSR",
      gpsrEuropeanResellerContactEmail: "E-mail zástupce v EU",
      gpsrEuropeanResellerManufacturingCompanyName: "Zástupce výrobce v EU",
      gpsrEuropeanResellerPostalAddress: "Adresa zástupce v EU",
      gpsrManufacturedOutsideEu: "Vyrobeno mimo EU",
      gpsrManufacturingCompanyName: "Výrobce pro GPSR",
      gpsrPostalAddress: "Adresa výrobce pro GPSR",
      handle: "Handle",
      supplier: "Dodavatel",
      title: "Název",
      value: "Hodnota",
    },
    filters: {
      activeOnly: "Pouze aktivní",
      allStatuses: "Všechny stavy",
    },
    form: {
      createBrand: "Vytvořit výrobce",
      editBrand: "Upravit výrobce",
      handlePlaceholder: "automaticky z názvu",
    },
    menuItem: "Výrobci",
    orderOptions: {
      handleAsc: "Handle A-Z",
      newest: "Nejnovější",
      brandAsc: "Výrobce A-Z",
      brandDesc: "Výrobce Z-A",
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
      deleteBrandDescription: 'Smazat výrobce "{{title}}"?{{linkedText}}',
      deleteBrandProducts: " Je propojen s {{count}} aktivními produkty.",
      deleteBrandTitle: "Smazat výrobce",
      removeProductDescription: 'Odebrat "{{title}}" od tohoto výrobce?',
      removeProductTitle: "Odebrat produkt",
      restoreAttributeDescription:
        'Atribut "{{name}}" už existuje, ale je smazaný. Obnovit ho místo vytvoření nového?',
      restoreAttributeTitle: "Obnovit atribut",
      restoreBrandDescription:
        'Výrobce "{{title}}" s handlem "{{handle}}" už existuje, ale je smazaný. Tato akce ho obnoví a upraví místo vytvoření nového výrobce.',
      restoreBrandTitle: "Obnovit výrobce",
    },
    products: {
      alreadyLinkedTooltip: 'Už je propojen s výrobcem "{{title}}"',
      count: "{{count}} produktů",
      emptyLinked: "Žádné propojené produkty.",
      emptyOptions: "Nebyly nalezeny žádné produkty bez výrobce.",
      emptySearch: "Nebyly nalezeny žádné produkty.",
      inactiveLinked: "Propojeno s neaktivním výrobcem",
      linked: "Propojeno",
      manageTitle: "Spravovat produkty",
      notLinked: "Není propojeno",
      selectedCount: "{{count}} vybráno",
      title: "Produkty",
    },
    brands: {
      count: "{{count}} výrobců",
      empty: "Nebyli nalezeni žádní výrobci.",
      title: "Výrobci",
      widgetTitle: "Výrobce",
    },
    search: {
      attributes: "Hledat atributy",
      brands: "Hledat výrobce",
      products: "Hledat produkty",
    },
    status: {
      active: "Aktivní",
      deleted: "Smazáno",
      inactive: "Neaktivní",
      loading: "Načítání...",
      selected: "Vybráno",
    },
    toasts: {
      attributeAlreadyExists: "Atribut už existuje",
      attributeCreated: "Atribut vytvořen",
      attributeDeleted: "Atribut smazán",
      attributeExistsError: 'Atribut "{{name}}" už existuje',
      attributeRestored: "Atribut obnoven",
      brandCreated: "Výrobce vytvořen",
      brandDeleted: "Výrobce smazán",
      brandExistsError: 'Výrobce s handlem "{{handle}}" už existuje',
      brandProductsUpdated: "Produkty výrobce upraveny",
      brandReactivated: "Výrobce obnoven a upraven",
      brandRestored: "Výrobce obnoven",
      brandUpdated: "Výrobce upraven",
      productBrandUpdated: "Výrobce produktu upraven",
      productRemoved: "Produkt odebrán",
    },
    widget: {
      empty: "Žádný výrobce není propojen.",
      loadFailed: "Výrobce se nepodařilo načíst.",
      manageTitle: "Spravovat výrobce",
      none: "Žádný",
      selectedBrand: "Vybraný výrobce",
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
      matchingBrandCount: "{{count}} matching brands",
      newPlaceholder: "New attribute",
      title: "Attributes",
      usageCount: "Used by {{count}} active brands",
    },
    columns: {
      actions: "Actions",
      attributes: "Attributes",
      handle: "Handle",
      name: "Name",
      brand: "Brand",
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
      backToBrands: "Back to brands",
      details: "Details",
      id: "ID",
      linkedProductsCount: "{{count}} linked products",
      openBrand: "Open brand {{title}}",
      openProduct: "Open product {{title}}",
    },
    errors: {
      attributeIdRequired: "Attribute id is required",
      checkAttributeFailed: "Failed to check attribute",
      createAttributeFailed: "Failed to create attribute",
      deleteAttributeFailed: "Failed to delete attribute",
      deleteBrandFailed: "Failed to delete brand",
      loadAttributeFailed: "Failed to load attribute.",
      loadBrandFailed: "Failed to load brand.",
      loadBrandsFailed: "Failed to load brands.",
      productIdRequired: "Product id is required",
      brandIdRequired: "Brand id is required",
      removeProductFailed: "Failed to remove product",
      restoreAttributeFailed: "Failed to restore attribute",
      restoreBrandFailed: "Failed to restore brand",
      saveBrandFailed: "Failed to save brand",
      saveProductsFailed: "Failed to save products",
    },
    fields: {
      attribute: "Attribute",
      gpsrContactEmail: "Manufacturer GPSR email",
      gpsrEuropeanResellerContactEmail: "EU representative email",
      gpsrEuropeanResellerManufacturingCompanyName: "EU representative company",
      gpsrEuropeanResellerPostalAddress: "EU representative address",
      gpsrManufacturedOutsideEu: "Manufactured outside the EU",
      gpsrManufacturingCompanyName: "Manufacturer GPSR company",
      gpsrPostalAddress: "Manufacturer GPSR address",
      handle: "Handle",
      supplier: "Supplier",
      title: "Title",
      value: "Value",
    },
    filters: {
      activeOnly: "Active only",
      allStatuses: "All statuses",
    },
    form: {
      createBrand: "Create Brand",
      editBrand: "Edit Brand",
      handlePlaceholder: "auto-generated from title",
    },
    menuItem: "Brands",
    orderOptions: {
      handleAsc: "Handle A-Z",
      newest: "Newest",
      brandAsc: "Brand A-Z",
      brandDesc: "Brand Z-A",
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
      deleteAttributeUsage: " It is currently used by {{count}} active brands.",
      deleteBrandDescription: 'Delete brand "{{title}}"?{{linkedText}}',
      deleteBrandProducts: " It is linked to {{count}} active products.",
      deleteBrandTitle: "Delete brand",
      removeProductDescription: 'Remove "{{title}}" from this brand?',
      removeProductTitle: "Remove product",
      restoreAttributeDescription:
        'Attribute "{{name}}" already exists but is deleted. Restore it instead?',
      restoreAttributeTitle: "Restore attribute",
      restoreBrandDescription:
        'Brand "{{title}}" with handle "{{handle}}" already exists but is deleted. This will restore and update it instead of creating a new brand.',
      restoreBrandTitle: "Restore brand",
    },
    products: {
      alreadyLinkedTooltip: 'Already linked to brand "{{title}}"',
      count: "{{count}} products",
      emptyLinked: "No linked products.",
      emptyOptions: "No products without a brand found.",
      emptySearch: "No products found.",
      inactiveLinked: "Linked to inactive brand",
      linked: "Linked",
      manageTitle: "Manage Products",
      notLinked: "Not linked",
      selectedCount: "{{count}} selected",
      title: "Products",
    },
    brands: {
      count: "{{count}} brands",
      empty: "No brands found.",
      title: "Brands",
      widgetTitle: "Brand",
    },
    search: {
      attributes: "Search attributes",
      brands: "Search brands",
      products: "Search products",
    },
    status: {
      active: "Active",
      deleted: "Deleted",
      inactive: "Inactive",
      loading: "Loading...",
      selected: "Selected",
    },
    toasts: {
      attributeAlreadyExists: "Attribute already exists",
      attributeCreated: "Attribute created",
      attributeDeleted: "Attribute deleted",
      attributeExistsError: 'Attribute "{{name}}" already exists',
      attributeRestored: "Attribute restored",
      brandCreated: "Brand created",
      brandDeleted: "Brand deleted",
      brandExistsError: 'Brand with handle "{{handle}}" already exists',
      brandProductsUpdated: "Brand products updated",
      brandReactivated: "Brand restored and updated",
      brandRestored: "Brand restored",
      brandUpdated: "Brand updated",
      productBrandUpdated: "Product brand updated",
      productRemoved: "Product removed",
    },
    widget: {
      empty: "No brand linked.",
      loadFailed: "Failed to load brand.",
      manageTitle: "Manage Brand",
      none: "None",
      selectedBrand: "Selected brand",
      title: "Brand",
    },
  },
} satisfies Record<"cs" | "en", BrandAdminI18nNamespace>
