import { approvalAdminI18n } from "../../modules/approval/admin/i18n"
import type { ApprovalAdminI18nNamespace } from "../../modules/approval/admin/i18n"
import { brandAdminI18n } from "../../modules/brand/admin/i18n"
import type { BrandAdminI18nNamespace } from "../../modules/brand/admin/i18n"
import { companyAdminI18n } from "../../modules/company/admin/i18n"
import type { CompanyAdminI18nNamespace } from "../../modules/company/admin/i18n"
import { measurementUnitAdminI18n } from "../../modules/measurement-unit/admin/i18n"
import type { MeasurementUnitAdminI18nNamespace } from "../../modules/measurement-unit/admin/i18n"
import { productAttributeAdminI18n } from "../../modules/product-attribute/admin/i18n"
import type { ProductAttributeAdminI18nNamespace } from "../../modules/product-attribute/admin/i18n"
import { quoteAdminI18n } from "../../modules/quote/admin/i18n"
import type { QuoteAdminI18nNamespace } from "../../modules/quote/admin/i18n"
import { storefrontTextAdminI18n } from "../../modules/storefront-text/admin/i18n"
import type { StorefrontTextAdminI18nNamespace } from "../../modules/storefront-text/admin/i18n"
import type { OrderBusinessStatusId } from "../../utils/order-business-status"
import type { ProductContentSectionKey } from "../lib/product-content-sections"

type AdminLocale = "cs" | "en"

interface OrderCommercialValuesNamespace {
  actions: Record<"cancel" | "confirm" | "edit", string>
  blockers: Record<
    "activeOrderChangeExists" | "orderStatusNotEditable" | "unknown",
    string
  >
  discount: Record<"amount" | "none", string>
  errors: Record<
    "invalidValues" | "loadFailed" | "recalculateFailed" | "saveFailed",
    string
  >
  fields: Record<
    | "internalNote"
    | "itemDiscount"
    | "orderDiscount"
    | "shipping"
    | "shippingDiscount"
    | "shippingMethods"
    | "unitPrice",
    string
  >
  item: Record<"fallbackName" | "line" | "quantity" | "sku", string>
  status: Record<"confirmed" | "loading" | "locked" | "requested", string>
  title: string
  totals: Record<"delta" | "new" | "orderDiscount" | "original", string>
}

interface ProductContentSectionsNamespace {
  actions: Record<"save", string>
  errors: Record<"saveFailed", string>
  sections: Record<
    ProductContentSectionKey,
    Record<"ariaLabel" | "title", string>
  >
  title: string
  toasts: Record<"saved", string>
}

interface AdminDefaultTranslationNamespace {
  fields: Record<"date" | "product", string>
  filters: {
    addFilter: string
    clearAll: string
    search: string
    compare: Record<
      | "andLabel"
      | "exact"
      | "greaterThan"
      | "greaterThanLabel"
      | "lessThan"
      | "lessThanLabel"
      | "range",
      string
    >
  }
  general: Record<
    | "countSelected"
    | "is"
    | "next"
    | "noRecordsMessage"
    | "noRecordsTitle"
    | "noResultsMessage"
    | "noResultsTitle"
    | "of"
    | "pages"
    | "prev"
    | "results",
    string
  >
  orderCommercialValues: OrderCommercialValuesNamespace
  productContentSections: ProductContentSectionsNamespace
  routeModal: Record<
    "cancel" | "continue" | "leaveDescription" | "leaveTitle",
    string
  >
}

interface OrderBusinessStatusesNamespace {
  columns: Record<
    | "businessStatus"
    | "created"
    | "customer"
    | "manualStatus"
    | "order"
    | "total",
    string
  >
  manualStatus: Record<"clear" | "placeholder" | "saving", string>
  menuItem: string
  pagination: Record<"next" | "of" | "pages" | "previous" | "results", string>
  statuses: Record<OrderBusinessStatusId, string>
  table: Record<"empty" | "loading", string>
  title: string
  toast: Record<"saveError" | "saveSuccess", string>
}

interface ProductSalesRegionsNamespace {
  badge: Record<"channel_few" | "channel_one" | "channel_other", string>
  description: string
  empty: string
  loadFailed: string
  loading: string
  title: string
}

export interface MeilisearchAdminI18nNamespace {
  actions: Record<
    | "addProfile"
    | "cancel"
    | "delete"
    | "deleteProfile"
    | "editProfile"
    | "full"
    | "fullRebuildAll"
    | "inspect"
    | "saveProfile"
    | "sync"
    | "syncAll"
    | "testSearch",
    string
  >
  availability: Record<"all" | "inStock", string>
  badges: Record<
    "groupedVariants" | "loose" | "separateVariants" | "strict",
    string
  >
  columns: Record<
    | "actions"
    | "behavior"
    | "document"
    | "lastSynchronization"
    | "profile"
    | "rankingScore"
    | "result"
    | "salesChannels",
    string
  >
  connection: Record<
    "checking" | "connected" | "disabled" | "unavailable",
    string
  >
  errors: Record<
    | "confirmDeletion"
    | "deleteProfile"
    | "saveProfile"
    | "searchTest"
    | "synchronization",
    string
  >
  fields: Record<
    | "availability"
    | "domain"
    | "fullSearchCandidates"
    | "language"
    | "minimumRankingScore"
    | "popularProducts"
    | "profileKey"
    | "query"
    | "resultsPerPage"
    | "searchIndexType"
    | "searchProfile"
    | "shop",
    string
  >
  form: {
    autocomplete: Record<"description" | "label", string>
    rankingScore: Record<"automatic" | "effective", string>
    resultLimits: Record<"description" | "title", string>
    salesChannels: Record<"description" | "empty" | "title", string>
    searchBehavior: Record<"description" | "title", string>
    separateVariants: Record<"description" | "label", string>
    storefrontScope: Record<"description" | "title", string>
    strictSearch: Record<"description" | "label", string>
    title: Record<"create" | "edit", string>
  }
  indexTypes: Record<"brand" | "category" | "content" | "product", string>
  menuItem: string
  page: Record<"description" | "title", string>
  placeholders: Record<"query" | "selectProfile", string>
  prompts: {
    deleteProfile: Record<"description" | "title", string>
  }
  resultLimitDescriptions: Record<
    "fullSearchCandidates" | "popularProducts" | "resultsPerPage",
    string
  >
  statuses: Record<"failed" | "never" | "running" | "succeeded", string>
  syncModes: Record<"full" | "normal", string>
  table: Record<
    "description" | "empty" | "loading" | "notAssigned" | "title",
    string
  >
  test: Record<
    | "acceptedSummary"
    | "description"
    | "empty"
    | "minimumScore"
    | "processingTime"
    | "title"
    | "untitledResult",
    string
  >
  toasts: Record<
    | "created"
    | "deleted"
    | "searchResults"
    | "syncCompleted"
    | "syncSkippedDisabled"
    | "syncSkippedLockContended"
    | "updated",
    string
  >
}

type AdminI18nResources = Record<
  AdminLocale,
  {
    approvals: ApprovalAdminI18nNamespace
    companies: CompanyAdminI18nNamespace
    measurementUnits: MeasurementUnitAdminI18nNamespace
    meilisearch: MeilisearchAdminI18nNamespace
    orderBusinessStatuses: OrderBusinessStatusesNamespace
    productSalesRegions: ProductSalesRegionsNamespace
    productAttributes: ProductAttributeAdminI18nNamespace
    brands: BrandAdminI18nNamespace
    quotes: QuoteAdminI18nNamespace
    storefrontTexts: StorefrontTextAdminI18nNamespace
    translation: AdminDefaultTranslationNamespace
  }
>

const orderBusinessStatuses = {
  cs: {
    columns: {
      businessStatus: "Stav objednávky",
      created: "Vytvořeno",
      customer: "Zákazník",
      manualStatus: "Ruční stav",
      order: "Objednávka",
      total: "Celkem",
    },
    manualStatus: {
      clear: "Vymazat ruční stav",
      placeholder: "Upravit stav",
      saving: "Ukládám...",
    },
    menuItem: "Stavy objednávek",
    pagination: {
      next: "Další",
      of: "z",
      pages: "stránek",
      previous: "Předchozí",
      results: "výsledků",
    },
    statuses: {
      awaiting_payment: "Čeká na platbu",
      canceled: "Storno",
      delivered: "Doručená",
      new: "Nová",
      paid: "Zaplacená",
      processing: "Zpracovává se",
      shipped: "Expedovaná",
      waiting_for_supplier: "Čeká na dodavatele",
    },
    table: {
      empty: "Žádné objednávky nenalezeny.",
      loading: "Načítám...",
    },
    title: "Stavy objednávek",
    toast: {
      saveError: "Nepodařilo se uložit stav objednávky",
      saveSuccess: "Stav objednávky uložen",
    },
  },
  en: {
    columns: {
      businessStatus: "Order status",
      created: "Created",
      customer: "Customer",
      manualStatus: "Manual status",
      order: "Order",
      total: "Total",
    },
    manualStatus: {
      clear: "Clear manual status",
      placeholder: "Update status",
      saving: "Saving...",
    },
    menuItem: "Order statuses",
    pagination: {
      next: "Next",
      of: "of",
      pages: "pages",
      previous: "Previous",
      results: "results",
    },
    statuses: {
      awaiting_payment: "Awaiting payment",
      canceled: "Canceled",
      delivered: "Delivered",
      new: "New",
      paid: "Paid",
      processing: "Processing",
      shipped: "Shipped",
      waiting_for_supplier: "Waiting for supplier",
    },
    table: {
      empty: "No orders found.",
      loading: "Loading...",
    },
    title: "Order statuses",
    toast: {
      saveError: "Failed to save order status",
      saveSuccess: "Order status saved",
    },
  },
} satisfies Record<AdminLocale, OrderBusinessStatusesNamespace>

const productSalesRegions = {
  cs: {
    badge: {
      channel_few: "{{count}} kanály",
      channel_one: "{{count}} kanál",
      channel_other: "{{count}} kanálů",
    },
    description:
      "Regiony, ve kterých se tento produkt prodává, a jejich sazba DPH.",
    empty:
      "Pro prodejní regiony tohoto produktu nebyly nalezeny žádné sazby DPH.",
    loadFailed: "Prodejní regiony se nepodařilo načíst.",
    loading: "Načítám prodejní regiony…",
    title: "Prodejní regiony",
  },
  en: {
    badge: {
      channel_few: "{{count}} channels",
      channel_one: "{{count}} channel",
      channel_other: "{{count}} channels",
    },
    description: "Regions where this product is sold and their VAT rate.",
    empty: "No VAT rates found for this product's sales regions.",
    loadFailed: "Failed to load sales regions.",
    loading: "Loading sales regions…",
    title: "Sales regions",
  },
} satisfies Record<AdminLocale, ProductSalesRegionsNamespace>

const orderCommercialValues = {
  cs: {
    actions: {
      cancel: "Zrušit",
      confirm: "Potvrdit",
      edit: "Upravit",
    },
    blockers: {
      activeOrderChangeExists:
        "Objednávka už má aktivní změnu {{orderChangeId}}.",
      orderStatusNotEditable: "Stav objednávky {{status}} neumožňuje úpravu.",
      unknown: "Objednávku teď nelze upravit.",
    },
    discount: {
      amount: "Částka",
      none: "Žádná",
    },
    errors: {
      invalidValues: "Zadané obchodní hodnoty nejsou platné.",
      loadFailed: "Obchodní hodnoty se nepodařilo načíst.",
      recalculateFailed: "Přepočet se nepodařil.",
      saveFailed: "Uložení se nepodařilo.",
    },
    fields: {
      internalNote: "Interní poznámka",
      itemDiscount: "Sleva na položku",
      orderDiscount: "Sleva na objednávku",
      shipping: "Doprava",
      shippingDiscount: "Sleva na dopravu",
      shippingMethods: "Doprava",
      unitPrice: "Jednotková cena",
    },
    item: {
      fallbackName: "Položka objednávky",
      line: "Řádek",
      quantity: "Množství",
      sku: "SKU {{sku}}",
    },
    status: {
      confirmed: "Změna objednávky byla potvrzena.",
      loading: "Načítání...",
      locked: "Zamčeno",
      requested: "Změna objednávky byla vyžádána.",
    },
    title: "Obchodní hodnoty",
    totals: {
      delta: "Rozdíl",
      new: "Nový total",
      orderDiscount: "Celková sleva na objednávku",
      original: "Původní total",
    },
  },
  en: {
    actions: {
      cancel: "Cancel",
      confirm: "Confirm",
      edit: "Edit",
    },
    blockers: {
      activeOrderChangeExists:
        "The order already has active order change {{orderChangeId}}.",
      orderStatusNotEditable: "Order status {{status}} does not allow editing.",
      unknown: "The order cannot be edited right now.",
    },
    discount: {
      amount: "Amount",
      none: "None",
    },
    errors: {
      invalidValues: "The commercial values are invalid.",
      loadFailed: "Failed to load commercial values.",
      recalculateFailed: "Recalculation failed.",
      saveFailed: "Save failed.",
    },
    fields: {
      internalNote: "Internal note",
      itemDiscount: "Item discount",
      orderDiscount: "Order discount",
      shipping: "Shipping",
      shippingDiscount: "Shipping discount",
      shippingMethods: "Shipping",
      unitPrice: "Unit price",
    },
    item: {
      fallbackName: "Order item",
      line: "Line",
      quantity: "Qty",
      sku: "SKU {{sku}}",
    },
    status: {
      confirmed: "Order edit confirmed.",
      loading: "Loading...",
      locked: "Locked",
      requested: "Order edit requested.",
    },
    title: "Commercial values",
    totals: {
      delta: "Delta",
      new: "New total",
      orderDiscount: "Order discount total",
      original: "Original total",
    },
  },
} satisfies Record<AdminLocale, OrderCommercialValuesNamespace>

const productContentSections = {
  cs: {
    actions: {
      save: "Uložit",
    },
    errors: {
      saveFailed: "Sekce produktu se nepodařilo uložit.",
    },
    sections: {
      composition: {
        ariaLabel: "Složení produktu",
        title: "Složení",
      },
      description: {
        ariaLabel: "Popis produktu",
        title: "Popis",
      },
      other: {
        ariaLabel: "Ostatní informace o produktu",
        title: "Ostatní informace",
      },
      usage: {
        ariaLabel: "Použití produktu",
        title: "Použití",
      },
      warning: {
        ariaLabel: "Upozornění k produktu",
        title: "Upozornění",
      },
    },
    title: "Produktové sekce",
    toasts: {
      saved: "Produktové sekce byly uloženy.",
    },
  },
  en: {
    actions: {
      save: "Save",
    },
    errors: {
      saveFailed: "Failed to save product sections.",
    },
    sections: {
      composition: {
        ariaLabel: "Product composition",
        title: "Composition",
      },
      description: {
        ariaLabel: "Product description",
        title: "Description",
      },
      other: {
        ariaLabel: "Product other information",
        title: "Other information",
      },
      usage: {
        ariaLabel: "Product usage",
        title: "Usage",
      },
      warning: {
        ariaLabel: "Product warning",
        title: "Warning",
      },
    },
    title: "Product sections",
    toasts: {
      saved: "Product sections saved.",
    },
  },
} satisfies Record<AdminLocale, ProductContentSectionsNamespace>

const meilisearch = {
  cs: {
    actions: {
      addProfile: "Přidat profil",
      cancel: "Zrušit",
      delete: "Smazat",
      deleteProfile: "Smazat profil {{key}}",
      editProfile: "Upravit profil {{key}}",
      full: "Úplné znovusestavení",
      fullRebuildAll: "Úplně znovu sestavit vše",
      inspect: "Prohlédnout",
      saveProfile: "Uložit profil",
      sync: "Synchronizovat",
      syncAll: "Synchronizovat vše",
      testSearch: "Otestovat vyhledávání",
    },
    availability: {
      all: "Všechny publikované produkty, které lze objednat",
      inStock: "Pouze produkty skladem",
    },
    badges: {
      groupedVariants: "Seskupené varianty",
      loose: "Volné",
      separateVariants: "Samostatné varianty",
      strict: "Přísné",
    },
    columns: {
      actions: "Akce",
      behavior: "Chování",
      document: "Dokument",
      lastSynchronization: "Poslední synchronizace",
      profile: "Profil",
      rankingScore: "Skóre relevance",
      result: "Výsledek",
      salesChannels: "Prodejní kanály",
    },
    connection: {
      checking: "Ověřování",
      connected: "Připojeno",
      disabled: "Vypnuto",
      unavailable: "Nedostupné",
    },
    errors: {
      confirmDeletion: "Potvrzení smazání se nezdařilo.",
      deleteProfile: "Profil se nepodařilo smazat.",
      saveProfile: "Profil se nepodařilo uložit.",
      searchTest: "Test vyhledávání se nezdařil.",
      synchronization: "Synchronizace se nezdařila.",
    },
    fields: {
      availability: "Dostupnost",
      domain: "ID domény",
      fullSearchCandidates: "Kandidáti úplného vyhledávání",
      language: "Jazyk",
      minimumRankingScore: "Minimální skóre relevance",
      popularProducts: "Oblíbené produkty",
      profileKey: "Klíč profilu",
      query: "Dotaz",
      resultsPerPage: "Výsledků na stránku",
      searchIndexType: "Typ indexu",
      searchProfile: "Profil",
      shop: "Obchod",
    },
    form: {
      autocomplete: {
        description: "Návrhy typu {{type}}.",
        label: "Automatické doplňování: {{type}}",
      },
      rankingScore: {
        automatic: "Automaticky: {{score}}",
        effective:
          "Použité skóre: {{score}}. Ponechte prázdné, aby se použila výchozí hodnota přísného nebo volného vyhledávání.",
      },
      resultLimits: {
        description:
          "Omezte datové přenosy do prohlížeče a směrodatné načítání dat z Medusy u velkých obchodů.",
        title: "Limity výsledků",
      },
      salesChannels: {
        description:
          "Přiřaďte prodejní kanály, ve kterých tento profil zajišťuje vyhledávání. Profil bez přiřazeného prodejního kanálu je vypnutý.",
        empty: "Medusa nevrátila žádné prodejní kanály.",
        title: "Prodejní kanály",
      },
      searchBehavior: {
        description:
          "Tato nastavení se používají pro vyhledávání v katalogu, automatické doplňování i každé nové sestavení indexu.",
        title: "Chování vyhledávání",
      },
      separateVariants: {
        description:
          "Zobrazí každou odpovídající variantu na samostatné kartě produktu. Vypnutím se výsledky seskupí na jednu kartu produktu.",
        label: "Samostatné odpovídající varianty",
      },
      storefrontScope: {
        description:
          "Neměnné hodnoty Obchod, ID domény a Jazyk tvoří klíč profilu.",
        title: "Rozsah obchodu",
      },
      strictSearch: {
        description:
          "Používá vysoký práh relevance a vylučuje názvy produktů z dokumentů kategorií.",
        label: "Přísné vyhledávání",
      },
      title: {
        create: "Vytvořit vyhledávací profil",
        edit: "Upravit profil {{key}}",
      },
    },
    indexTypes: {
      brand: "Značka",
      category: "Kategorie",
      content: "Obsah",
      product: "Produkt",
    },
    menuItem: "Meilisearch",
    page: {
      description:
        "Vyhledávací profily pro jednotlivé domény jsou uložené v Meduse a používají se pro vyhledávání a automatické doplňování v obchodě i synchronizaci.",
      title: "Nastavení Meilisearch",
    },
    placeholders: {
      query: "Název produktu, uživatelský kód, SKU, EAN…",
      selectProfile: "Vyberte profil",
    },
    prompts: {
      deleteProfile: {
        description:
          "Profil se přestane používat pro směrování a synchronizaci. Existující indexy Meilisearch zůstanou záměrně zachované pro případ návratu změny.",
        title: "Smazat profil {{key}}?",
      },
    },
    resultLimitDescriptions: {
      fullSearchCandidates:
        "Nejvyšší počet kandidátů z Meilisearch načtených pro přesné řazení podle relevance a ceny.",
      popularProducts:
        "Produkty vrácené panelem oblíbených produktů při prázdném dotazu.",
      resultsPerPage: "Nejvyšší počet produktů na jedné stránce katalogu.",
    },
    statuses: {
      failed: "Nezdařilo se",
      never: "Nikdy",
      running: "Probíhá",
      succeeded: "Dokončeno",
    },
    syncModes: {
      full: "Úplné nové sestavení",
      normal: "Běžná synchronizace",
    },
    table: {
      description:
        "Jeden profil představuje jedinečnou kombinaci Obchodu, ID domény a Jazyka a propojuje ji s prodejními kanály Medusy.",
      empty: "Nejsou nastavené žádné vyhledávací profily.",
      loading: "Načítám profily…",
      notAssigned: "Nepřiřazeno",
      title: "Vyhledávací profily",
    },
    test: {
      acceptedSummary:
        "Přijato: {{accepted}}; nezpracovaných výsledků: {{raw}}",
      description:
        "Dotaz se odešle do přesného indexu s pravidly relevance vybraného profilu obchodu. Prázdný dotaz na produkty otestuje řazení oblíbených produktů.",
      empty: "Žádné přijaté výsledky.",
      minimumScore: "minimální skóre {{score}}",
      processingTime: "{{time}} ms",
      title: "Test vyhledávání",
      untitledResult: "Výsledek bez názvu",
    },
    toasts: {
      created: "Vyhledávací profil byl vytvořen.",
      deleted:
        "Vyhledávací profil byl smazán. Existující indexy zůstaly zachované.",
      searchResults: "Počet přijatých výsledků vyhledávání: {{count}}.",
      syncCompleted:
        "{{mode}} dokončena: indexováno {{indexed}}, smazáno {{deleted}}.",
      syncSkippedDisabled:
        "Synchronizace byla přeskočena, protože Meilisearch není povolený.",
      syncSkippedLockContended:
        "Synchronizace nebyla spuštěna, protože právě probíhá jiná synchronizace.",
      updated: "Vyhledávací profil byl aktualizován.",
    },
  },
  en: {
    actions: {
      addProfile: "Add profile",
      cancel: "Cancel",
      delete: "Delete",
      deleteProfile: "Delete profile {{key}}",
      editProfile: "Edit profile {{key}}",
      full: "Full rebuild",
      fullRebuildAll: "Full rebuild all",
      inspect: "Inspect",
      saveProfile: "Save profile",
      sync: "Sync",
      syncAll: "Sync all",
      testSearch: "Test search",
    },
    availability: {
      all: "All published and orderable products",
      inStock: "Only products in stock",
    },
    badges: {
      groupedVariants: "Grouped variants",
      loose: "Loose",
      separateVariants: "Separate variants",
      strict: "Strict",
    },
    columns: {
      actions: "Actions",
      behavior: "Behavior",
      document: "Document",
      lastSynchronization: "Last synchronization",
      profile: "Profile",
      rankingScore: "Ranking score",
      result: "Result",
      salesChannels: "Sales Channels",
    },
    connection: {
      checking: "Checking",
      connected: "Connected",
      disabled: "Disabled",
      unavailable: "Unavailable",
    },
    errors: {
      confirmDeletion: "Unable to confirm deletion.",
      deleteProfile: "Unable to delete profile.",
      saveProfile: "Unable to save profile.",
      searchTest: "Search testing failed.",
      synchronization: "Synchronization failed.",
    },
    fields: {
      availability: "Availability",
      domain: "Domain ID",
      fullSearchCandidates: "Full search candidates",
      language: "Language",
      minimumRankingScore: "Minimum ranking score",
      popularProducts: "Popular products",
      profileKey: "Profile key",
      query: "Query",
      resultsPerPage: "Results per page",
      searchIndexType: "Index type",
      searchProfile: "Profile",
      shop: "Shop",
    },
    form: {
      autocomplete: {
        description: "{{type}} suggestions.",
        label: "Autocomplete {{type}}",
      },
      rankingScore: {
        automatic: "Automatic: {{score}}",
        effective:
          "Effective score: {{score}}. Leave empty to follow the strict/loose default.",
      },
      resultLimits: {
        description:
          "Keep browser payloads and authoritative Medusa hydration bounded on large shops.",
        title: "Result limits",
      },
      salesChannels: {
        description:
          "Assign the Sales Channels where this profile provides search. A profile without an assigned Sales Channel is disabled.",
        empty: "No Sales Channels were returned by Medusa.",
        title: "Sales Channels",
      },
      searchBehavior: {
        description:
          "These settings are applied by catalog search, autocomplete, and every index rebuild.",
        title: "Search behavior",
      },
      separateVariants: {
        description:
          "Show every matching variant as its own product card. Disable to group matches into one product card.",
        label: "Separate matching variants",
      },
      storefrontScope: {
        description:
          "The stable Shop, Domain ID, and Language generate the profile key.",
        title: "Storefront scope",
      },
      strictSearch: {
        description:
          "Uses a high relevance threshold and excludes product titles from category documents.",
        label: "Strict search",
      },
      title: {
        create: "Create search profile",
        edit: "Edit {{key}}",
      },
    },
    indexTypes: {
      brand: "Brand",
      category: "Category",
      content: "Content",
      product: "Product",
    },
    menuItem: "Meilisearch",
    page: {
      description:
        "Domain-scoped search profiles are stored in Medusa and applied to storefront search, autocomplete, and synchronization.",
      title: "Meilisearch Configuration",
    },
    placeholders: {
      query: "Product name, user code, SKU, EAN…",
      selectProfile: "Select a profile",
    },
    prompts: {
      deleteProfile: {
        description:
          "The profile will stop resolving and synchronizing. Existing Meilisearch indexes are deliberately preserved for rollback.",
        title: "Delete {{key}}?",
      },
    },
    resultLimitDescriptions: {
      fullSearchCandidates:
        "Maximum Meilisearch candidates hydrated for exact ranking and price sorting.",
      popularProducts:
        "Products returned by an empty-query popular-products panel.",
      resultsPerPage: "Maximum products returned on one catalog page.",
    },
    statuses: {
      failed: "Failed",
      never: "Never",
      running: "Running",
      succeeded: "Succeeded",
    },
    syncModes: {
      full: "Full rebuild",
      normal: "Normal synchronization",
    },
    table: {
      description:
        "One profile represents a unique Shop + Domain ID + Language combination and maps it to Medusa Sales Channels.",
      empty: "No search profiles configured.",
      loading: "Loading profiles…",
      notAssigned: "Not assigned",
      title: "Search profiles",
    },
    test: {
      acceptedSummary: "Accepted: {{accepted}}; raw hits: {{raw}}",
      description:
        "Query the exact index and relevance policy selected for a storefront profile. An empty product query tests popular-product ordering.",
      empty: "No accepted results.",
      minimumScore: "min score {{score}}",
      processingTime: "{{time}} ms",
      title: "Search testing",
      untitledResult: "Untitled result",
    },
    toasts: {
      created: "Search profile created.",
      deleted: "Search profile deleted. Existing indexes were preserved.",
      searchResults: "Search returned {{count}} accepted result(s).",
      syncCompleted:
        "{{mode}} completed: {{indexed}} indexed, {{deleted}} deleted.",
      syncSkippedDisabled:
        "Synchronization was skipped because Meilisearch is disabled.",
      syncSkippedLockContended:
        "Synchronization did not start because another synchronization is running.",
      updated: "Search profile updated.",
    },
  },
} satisfies Record<AdminLocale, MeilisearchAdminI18nNamespace>

const defaultTranslation = {
  cs: {
    fields: {
      date: "Datum",
      product: "Produkt",
    },
    filters: {
      addFilter: "Přidat filtr",
      clearAll: "Vymazat vše",
      compare: {
        andLabel: "a",
        exact: "Přesná hodnota",
        greaterThan: "Větší než",
        greaterThanLabel: "více než {{value}}",
        lessThan: "Menší než",
        lessThanLabel: "méně než {{value}}",
        range: "Rozsah",
      },
      search: "Hledat",
    },
    general: {
      countSelected: "{{count}} vybráno",
      is: "je",
      next: "Další",
      noRecordsMessage: "Zatím nejsou k dispozici žádné záznamy.",
      noRecordsTitle: "Žádné záznamy",
      noResultsMessage: "Upravte hledání nebo filtry a zkuste to znovu.",
      noResultsTitle: "Žádné výsledky",
      of: "z",
      pages: "stránek",
      prev: "Předchozí",
      results: "výsledků",
    },
    orderCommercialValues: orderCommercialValues.cs,
    productContentSections: productContentSections.cs,
    routeModal: {
      cancel: "Zrušit",
      continue: "Pokračovat",
      leaveDescription:
        "Máte neuložené změny, které se při opuštění formuláře ztratí.",
      leaveTitle: "Opravdu chcete tento formulář opustit?",
    },
  },
  en: {
    fields: {
      date: "Date",
      product: "Product",
    },
    filters: {
      addFilter: "Add filter",
      clearAll: "Clear all",
      compare: {
        andLabel: "and",
        exact: "Exact",
        greaterThan: "Greater than",
        greaterThanLabel: "greater than {{value}}",
        lessThan: "Less than",
        lessThanLabel: "less than {{value}}",
        range: "Range",
      },
      search: "Search",
    },
    general: {
      countSelected: "{{count}} selected",
      is: "is",
      next: "Next",
      noRecordsMessage: "There are no records to show yet.",
      noRecordsTitle: "No records",
      noResultsMessage: "Adjust your search or filters and try again.",
      noResultsTitle: "No results",
      of: "of",
      pages: "pages",
      prev: "Previous",
      results: "results",
    },
    orderCommercialValues: orderCommercialValues.en,
    productContentSections: productContentSections.en,
    routeModal: {
      cancel: "Cancel",
      continue: "Continue",
      leaveDescription:
        "You have unsaved changes that will be lost if you exit this form.",
      leaveTitle: "Are you sure you want to leave this form?",
    },
  },
} satisfies Record<AdminLocale, AdminDefaultTranslationNamespace>

const resources = {
  cs: {
    approvals: approvalAdminI18n.cs,
    brands: brandAdminI18n.cs,
    companies: companyAdminI18n.cs,
    measurementUnits: measurementUnitAdminI18n.cs,
    meilisearch: meilisearch.cs,
    orderBusinessStatuses: orderBusinessStatuses.cs,
    productAttributes: productAttributeAdminI18n.cs,
    productSalesRegions: productSalesRegions.cs,
    quotes: quoteAdminI18n.cs,
    storefrontTexts: storefrontTextAdminI18n.cs,
    translation: defaultTranslation.cs,
  },
  en: {
    approvals: approvalAdminI18n.en,
    brands: brandAdminI18n.en,
    companies: companyAdminI18n.en,
    measurementUnits: measurementUnitAdminI18n.en,
    meilisearch: meilisearch.en,
    orderBusinessStatuses: orderBusinessStatuses.en,
    productAttributes: productAttributeAdminI18n.en,
    productSalesRegions: productSalesRegions.en,
    quotes: quoteAdminI18n.en,
    storefrontTexts: storefrontTextAdminI18n.en,
    translation: defaultTranslation.en,
  },
} satisfies AdminI18nResources

export default resources
