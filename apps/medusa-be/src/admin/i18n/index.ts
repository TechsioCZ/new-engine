import type { OrderBusinessStatusId } from "../../utils/order-business-status"

type AdminLocale = "cs" | "en"

type OrderCommercialValuesNamespace = {
  actions: Record<"cancel" | "confirm" | "edit" | "preview", string>
  blockers: Record<
    "activeOrderChangeExists" | "orderStatusNotEditable" | "unknown",
    string
  >
  discount: Record<"amount" | "none", string>
  errors: Record<
    "invalidValues" | "loadFailed" | "previewFailed" | "saveFailed",
    string
  >
  fields: Record<
    "internalNote" | "itemDiscount" | "orderDiscount" | "unitPrice",
    string
  >
  item: Record<"fallbackName" | "line" | "quantity" | "sku", string>
  status: Record<"confirmed" | "loading" | "locked" | "requested", string>
  title: string
  totals: Record<"delta" | "new" | "orderDiscount" | "original", string>
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
    orderBusinessStatuses: OrderBusinessStatusesNamespace
    translation: {
      orderCommercialValues: OrderCommercialValuesNamespace
    }
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
      preview: "Přepočítat",
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
      previewFailed: "Přepočet se nepodařil.",
      saveFailed: "Uložení se nepodařilo.",
    },
    fields: {
      internalNote: "Interní poznámka",
      itemDiscount: "Sleva na položku",
      orderDiscount: "Sleva na objednávku",
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
      preview: "Preview",
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
      previewFailed: "Preview failed.",
      saveFailed: "Save failed.",
    },
    fields: {
      internalNote: "Internal note",
      itemDiscount: "Item discount",
      orderDiscount: "Order discount",
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

const resources = {
  cs: {
    orderBusinessStatuses: orderBusinessStatuses.cs,
    translation: {
      orderCommercialValues: orderCommercialValues.cs,
    },
  },
  en: {
    orderBusinessStatuses: orderBusinessStatuses.en,
    translation: {
      orderCommercialValues: orderCommercialValues.en,
    },
  },
} satisfies AdminI18nResources

export default resources
