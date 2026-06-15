import {
  type ApprovalAdminI18nNamespace,
  approvalAdminI18n,
} from "../../modules/approval/admin/i18n"
import {
  type CompanyAdminI18nNamespace,
  companyAdminI18n,
} from "../../modules/company/admin/i18n"
import {
  type MeasurementUnitAdminI18nNamespace,
  measurementUnitAdminI18n,
} from "../../modules/measurement-unit/admin/i18n"
import {
  type ProducerAdminI18nNamespace,
  producerAdminI18n,
} from "../../modules/producer/admin/i18n"
import {
  type QuoteAdminI18nNamespace,
  quoteAdminI18n,
} from "../../modules/quote/admin/i18n"
import type { OrderBusinessStatusId } from "../../utils/order-business-status"

type AdminLocale = "cs" | "en"

type OrderCommercialValuesNamespace = {
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

type AdminDefaultTranslationNamespace = {
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
  routeModal: Record<
    "cancel" | "continue" | "leaveDescription" | "leaveTitle",
    string
  >
}

type OrderBusinessStatusesNamespace = {
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

type AdminI18nResources = Record<
  AdminLocale,
  {
    approvals: ApprovalAdminI18nNamespace
    companies: CompanyAdminI18nNamespace
    measurementUnits: MeasurementUnitAdminI18nNamespace
    orderBusinessStatuses: OrderBusinessStatusesNamespace
    producers: ProducerAdminI18nNamespace
    quotes: QuoteAdminI18nNamespace
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

const defaultTranslation = {
  cs: {
    fields: {
      date: "Datum",
      product: "Produkt",
    },
    filters: {
      addFilter: "Přidat filtr",
      clearAll: "Vymazat vše",
      search: "Hledat",
      compare: {
        andLabel: "a",
        exact: "Přesná hodnota",
        greaterThan: "Větší než",
        greaterThanLabel: "více než {{value}}",
        lessThan: "Menší než",
        lessThanLabel: "méně než {{value}}",
        range: "Rozsah",
      },
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
      search: "Search",
      compare: {
        andLabel: "and",
        exact: "Exact",
        greaterThan: "Greater than",
        greaterThanLabel: "greater than {{value}}",
        lessThan: "Less than",
        lessThanLabel: "less than {{value}}",
        range: "Range",
      },
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
    companies: companyAdminI18n.cs,
    measurementUnits: measurementUnitAdminI18n.cs,
    orderBusinessStatuses: orderBusinessStatuses.cs,
    producers: producerAdminI18n.cs,
    quotes: quoteAdminI18n.cs,
    translation: defaultTranslation.cs,
  },
  en: {
    approvals: approvalAdminI18n.en,
    companies: companyAdminI18n.en,
    measurementUnits: measurementUnitAdminI18n.en,
    orderBusinessStatuses: orderBusinessStatuses.en,
    producers: producerAdminI18n.en,
    quotes: quoteAdminI18n.en,
    translation: defaultTranslation.en,
  },
} satisfies AdminI18nResources

export default resources
