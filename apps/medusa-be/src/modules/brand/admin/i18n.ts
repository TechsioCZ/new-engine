export interface BrandAdminI18nNamespace {
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
    | "saveProductsFailed"
    | "euResponsiblePersonRequired",
    string
  >
  fields: Record<
    | "attribute"
    | "gpsr"
    | "gpsr_contact_email"
    | "gpsr_european_reseller_contact_email"
    | "gpsr_european_reseller_manufacturing_company_name"
    | "gpsr_european_reseller_postal_address"
    | "gpsr_manufactured_outside_eu"
    | "gpsr_manufacturing_company_name"
    | "gpsr_postal_address"
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
    | "restoreAttributeTitle",
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
    "active" | "deleted" | "inactive" | "loading" | "no" | "selected" | "yes",
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
    | "brandProductsUpdated"
    | "brandRestored"
    | "brandUpdated"
    | "productBrandUpdated"
    | "productRemoved",
    string
  >
  widget: Record<
    | "empty"
    | "inactiveSelectionWarning"
    | "loadFailed"
    | "manageTitle"
    | "none"
    | "productDetailsDescription"
    | "productDetailsTitle"
    | "selectedBrand"
    | "title",
    string
  >
  validation: Record<
    "invalidEmail" | "mustBeEmpty" | "required" | "summary",
    string
  >
}

const CZECH_BRAND_LOAD_FAILED = "Výrobce se nepodařilo načíst."

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
    brands: {
      count: "{{count}} výrobců",
      empty: "Nebyli nalezeni žádní výrobci.",
      title: "Výrobci",
      widgetTitle: "Výrobce",
    },
    columns: {
      actions: "Akce",
      attributes: "Atributy",
      brand: "Výrobce",
      handle: "Handle",
      name: "Název",
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
      brandIdRequired: "ID výrobce je povinné",
      checkAttributeFailed: "Kontrola atributu selhala",
      createAttributeFailed: "Atribut se nepodařilo vytvořit",
      deleteAttributeFailed: "Atribut se nepodařilo smazat",
      deleteBrandFailed: "Výrobce se nepodařilo smazat",
      euResponsiblePersonRequired:
        "Odpovědná osoba v EU musí mít vyplněnou společnost, adresu a e-mail.",
      loadAttributeFailed: "Atribut se nepodařilo načíst.",
      loadBrandFailed: CZECH_BRAND_LOAD_FAILED,
      loadBrandsFailed: CZECH_BRAND_LOAD_FAILED,
      productIdRequired: "ID produktu je povinné",
      removeProductFailed: "Produkt se nepodařilo odebrat",
      restoreAttributeFailed: "Atribut se nepodařilo obnovit",
      restoreBrandFailed: "Výrobce se nepodařilo obnovit",
      saveBrandFailed: "Výrobce se nepodařilo uložit",
      saveProductsFailed: "Produkty se nepodařilo uložit",
    },
    fields: {
      attribute: "Atribut",
      gpsr: "GPSR",
      gpsr_contact_email: "E-mail výrobce pro GPSR",
      gpsr_european_reseller_contact_email: "E-mail odpovědné osoby v EU",
      gpsr_european_reseller_manufacturing_company_name: "Odpovědná osoba v EU",
      gpsr_european_reseller_postal_address: "Adresa odpovědné osoby v EU",
      gpsr_manufactured_outside_eu: "Vyrobeno mimo EU",
      gpsr_manufacturing_company_name: "Výrobce pro GPSR",
      gpsr_postal_address: "Adresa výrobce pro GPSR",
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
      brandAsc: "Výrobce A-Z",
      brandDesc: "Výrobce Z-A",
      handleAsc: "Handle A-Z",
      newest: "Nejnovější",
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
      no: "Ne",
      selected: "Vybráno",
      yes: "Ano",
    },
    toasts: {
      attributeAlreadyExists: "Atribut už existuje",
      attributeCreated: "Atribut vytvořen",
      attributeDeleted: "Atribut smazán",
      attributeExistsError: 'Atribut "{{name}}" už existuje',
      attributeRestored: "Atribut obnoven",
      brandCreated: "Výrobce vytvořen",
      brandDeleted: "Výrobce smazán",
      brandProductsUpdated: "Produkty výrobce upraveny",
      brandRestored: "Výrobce obnoven",
      brandUpdated: "Výrobce upraven",
      productBrandUpdated: "Výrobce produktu upraven",
      productRemoved: "Produkt odebrán",
    },
    validation: {
      invalidEmail: "Zadejte platnou e-mailovou adresu.",
      mustBeEmpty: "Pro výrobce z EU musí toto pole zůstat prázdné.",
      required: "Toto pole je povinné.",
      summary: "Opravte označená pole.",
    },
    widget: {
      empty: "Žádný výrobce není propojen.",
      inactiveSelectionWarning:
        "Aktuálně propojený výrobce je neaktivní. Propojení zůstane zachováno a nahradí se pouze výběrem nového aktivního výrobce.",
      loadFailed: CZECH_BRAND_LOAD_FAILED,
      manageTitle: "Spravovat výrobce",
      none: "Žádný",
      productDetailsDescription:
        "Spravujte výrobce a doplňující informace produktu.",
      productDetailsTitle: "Výrobce a doplňující informace",
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
    brands: {
      count: "{{count}} brands",
      empty: "No brands found.",
      title: "Brands",
      widgetTitle: "Brand",
    },
    columns: {
      actions: "Actions",
      attributes: "Attributes",
      brand: "Brand",
      handle: "Handle",
      name: "Name",
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
      brandIdRequired: "Brand id is required",
      checkAttributeFailed: "Failed to check attribute",
      createAttributeFailed: "Failed to create attribute",
      deleteAttributeFailed: "Failed to delete attribute",
      deleteBrandFailed: "Failed to delete brand",
      euResponsiblePersonRequired:
        "EU responsible person company, address, and email are required.",
      loadAttributeFailed: "Failed to load attribute.",
      loadBrandFailed: "Failed to load brand.",
      loadBrandsFailed: "Failed to load brands.",
      productIdRequired: "Product id is required",
      removeProductFailed: "Failed to remove product",
      restoreAttributeFailed: "Failed to restore attribute",
      restoreBrandFailed: "Failed to restore brand",
      saveBrandFailed: "Failed to save brand",
      saveProductsFailed: "Failed to save products",
    },
    fields: {
      attribute: "Attribute",
      gpsr: "GPSR",
      gpsr_contact_email: "Manufacturer GPSR email",
      gpsr_european_reseller_contact_email: "EU responsible person email",
      gpsr_european_reseller_manufacturing_company_name:
        "EU responsible person company",
      gpsr_european_reseller_postal_address: "EU responsible person address",
      gpsr_manufactured_outside_eu: "Manufactured outside the EU",
      gpsr_manufacturing_company_name: "Manufacturer GPSR company",
      gpsr_postal_address: "Manufacturer GPSR address",
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
      brandAsc: "Brand A-Z",
      brandDesc: "Brand Z-A",
      handleAsc: "Handle A-Z",
      newest: "Newest",
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
      no: "No",
      selected: "Selected",
      yes: "Yes",
    },
    toasts: {
      attributeAlreadyExists: "Attribute already exists",
      attributeCreated: "Attribute created",
      attributeDeleted: "Attribute deleted",
      attributeExistsError: 'Attribute "{{name}}" already exists',
      attributeRestored: "Attribute restored",
      brandCreated: "Brand created",
      brandDeleted: "Brand deleted",
      brandProductsUpdated: "Brand products updated",
      brandRestored: "Brand restored",
      brandUpdated: "Brand updated",
      productBrandUpdated: "Product brand updated",
      productRemoved: "Product removed",
    },
    validation: {
      invalidEmail: "Enter a valid email address.",
      mustBeEmpty: "This field must be empty for an EU manufacturer.",
      required: "This field is required.",
      summary: "Correct the highlighted fields.",
    },
    widget: {
      empty: "No brand linked.",
      inactiveSelectionWarning:
        "The currently linked brand is inactive. The link is retained unless you select a new active brand.",
      loadFailed: "Failed to load brand.",
      manageTitle: "Manage Brand",
      none: "None",
      productDetailsDescription:
        "Manage the product brand and additional information.",
      productDetailsTitle: "Brand and additional information",
      selectedBrand: "Selected brand",
      title: "Brand",
    },
  },
} satisfies Record<"cs" | "en", BrandAdminI18nNamespace>
