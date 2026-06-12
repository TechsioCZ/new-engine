export type OrderDashboardAdminI18nNamespace = {
  actions: Record<
    | "apply"
    | "applyManualStatus"
    | "businessStatusPlaceholder"
    | "cancel"
    | "clearManualStatus"
    | "closeDetails"
    | "details"
    | "expeditionPdf"
    | "fulfillItems"
    | "labelFormat"
    | "packetaEligible"
    | "packetaLabels"
    | "selected"
    | "targetStatusPlaceholder",
    string
  >
  columns: Record<
    | "businessStatus"
    | "carrier"
    | "address"
    | "created"
    | "customer"
    | "details"
    | "fulfillment"
    | "manualStatus"
    | "order"
    | "payment"
    | "total",
    string
  >
  detail: Record<
    | "activeFulfillment"
    | "address"
    | "businessStatus"
    | "carrier"
    | "fulfillment"
    | "items"
    | "manualStatus"
    | "noActiveFulfillment"
    | "noItems"
    | "orderStatus"
    | "payment"
    | "quantity"
    | "title"
    | "total",
    string
  >
  filters: Record<"businessStatus" | "carrier", string>
  fulfillmentStatus: Record<
    | "canceled"
    | "delivered"
    | "fulfilled"
    | "not_fulfilled"
    | "partially_delivered"
    | "partially_fulfilled"
    | "partially_returned"
    | "partially_shipped"
    | "requires_action"
    | "returned"
    | "shipped",
    string
  >
  fulfillmentBlocker: Record<
    | "canceled"
    | "missingOrder"
    | "noFulfillableItems"
    | "noShippingOption"
    | "shippingOptionUnavailable"
    | "shippingProfileMismatch",
    string
  >
  fulfillmentModal: Record<
    | "confirm"
    | "description"
    | "eligible"
    | "eligibleMore"
    | "failed"
    | "failedCount"
    | "failedMore"
    | "fulfilled"
    | "fulfilledCount"
    | "fulfilledMore"
    | "items"
    | "loading"
    | "location"
    | "locationPlaceholder"
    | "noEligible"
    | "notifyCustomers"
    | "previewUnavailable"
    | "selected"
    | "skipped"
    | "skippedCount"
    | "skippedMore"
    | "stockLocationsUnavailable"
    | "title",
    string
  >
  labelFormats: Record<"a6" | "a7", string>
  manualStatus: Record<
    "canceled" | "clear" | "none" | "processing" | "waiting_for_supplier",
    string
  >
  manualStatusPrompt: Record<
    | "description"
    | "skipped"
    | "skippedMore"
    | "target"
    | "title"
    | "updated"
    | "updatedMore"
    | "willChange",
    string
  >
  menuItem: string
  manualStatusBlocker: Record<
    | "alreadyClear"
    | "alreadyStatus"
    | "canceledStayCanceled"
    | "higherPriority",
    string
  >
  packetaSkip: Record<"noActiveLabel" | "notPacketa" | "unchecked", string>
  queues: Record<"action_required" | "all", string>
  sidebar: Record<"actionRequiredOrders", string>
  statuses: Record<
    | "awaiting_payment"
    | "canceled"
    | "delivered"
    | "new"
    | "paid"
    | "processing"
    | "shipped"
    | "waiting_for_supplier",
    string
  >
  table: Record<
    | "blockedOrdersTitle"
    | "carrierFilterLimit"
    | "empty"
    | "filterTooltip"
    | "loading",
    string
  >
  tableMessages: Record<"blockedCount" | "moreBlocked", string>
  targetStatusBlocker: Record<
    | "activeFulfillmentCannotCanceled"
    | "alreadyStatus"
    | "archivedCannotChange"
    | "canceledOnlyArchived"
    | "completedCannotCanceled"
    | "completedOnlyArchived"
    | "selectedBlockedMany"
    | "selectedBlockedOne"
    | "targetNotAllowed"
    | "unknownStatus"
    | "unsupportedStatus",
    string
  >
  targetStatus: Record<
    | "archived"
    | "canceled"
    | "completed"
    | "draft"
    | "pending"
    | "requires_action",
    string
  >
  title: string
  toast: Record<
    | "businessStatusUpdated"
    | "businessStatusUpdatedWithSkipped"
    | "blockedOrderStatus"
    | "fulfillmentCreated"
    | "fulfillmentCreatedWithFailed"
    | "fulfillmentLimit"
    | "fulfillmentSkipped"
    | "manualStatusSkipped"
    | "missingBusinessStatus"
    | "missingOrderStatus"
    | "noPacketaSelection"
    | "noSelection"
    | "packetaEligibilityLoading"
    | "packetaLabelLimit"
    | "packetaLabelsReady"
    | "pdfReady"
    | "requestFailed"
    | "statusUpdated",
    string
  >
}

const englishOrderDashboardAdminI18n = {
  actions: {
    apply: "Apply",
    applyManualStatus: "Apply manual status",
    businessStatusPlaceholder: "Manual status",
    cancel: "Cancel",
    clearManualStatus: "Clear manual status",
    closeDetails: "Close",
    details: "Details",
    expeditionPdf: "Expedition PDF",
    fulfillItems: "Fulfill items",
    labelFormat: "Format",
    packetaEligible:
      "{{count}} Packeta printable from {{selectedCount}} selected",
    packetaLabels: "Packeta labels",
    selected: "{{count}} selected",
    targetStatusPlaceholder: "Order status",
  },
  columns: {
    address: "Address",
    businessStatus: "Status",
    carrier: "Carrier",
    created: "Created",
    customer: "Customer",
    details: "Details",
    fulfillment: "Fulfillment",
    manualStatus: "Manual status",
    order: "Order",
    payment: "Payment",
    total: "Total",
  },
  detail: {
    activeFulfillment: "Active fulfillment",
    address: "Address",
    businessStatus: "Business status",
    carrier: "Carrier",
    fulfillment: "Fulfillment",
    items: "Items",
    manualStatus: "Manual status",
    noActiveFulfillment: "No active fulfillment",
    noItems: "No items available.",
    orderStatus: "Medusa status",
    payment: "Payment",
    quantity: "{{count}} pcs",
    title: "{{order}} detail",
    total: "Total",
  },
  filters: {
    businessStatus: "Status",
    carrier: "Carrier",
  },
  fulfillmentStatus: {
    canceled: "Canceled",
    delivered: "Delivered",
    fulfilled: "Fulfilled",
    not_fulfilled: "Not fulfilled",
    partially_delivered: "Partially delivered",
    partially_fulfilled: "Partially fulfilled",
    partially_returned: "Partially returned",
    partially_shipped: "Partially shipped",
    requires_action: "Requires action",
    returned: "Returned",
    shipped: "Shipped",
  },
  fulfillmentBlocker: {
    canceled: "Canceled orders cannot be fulfilled",
    missingOrder: "Order details could not be loaded",
    noFulfillableItems: "No shipping items are awaiting fulfillment",
    noShippingOption: "Order has no shipping option",
    shippingOptionUnavailable:
      "Order shipping option is not available from the selected stock location",
    shippingProfileMismatch:
      "No fulfillable items match the order shipping profile",
  },
  fulfillmentModal: {
    confirm: "Fulfill eligible orders",
    description:
      "Eligible orders will be fulfilled from the selected stock location using each order's original shipping option.",
    eligible: "{{count}} eligible",
    eligibleMore: "{{count}} more eligible",
    failed: "{{order}}: failed - {{reason}}",
    failedCount: "{{count}} failed",
    failedMore: "{{count}} more failed",
    fulfilled: "{{order}}: fulfilled",
    fulfilledCount: "{{count}} fulfilled",
    fulfilledMore: "{{count}} more fulfilled",
    items: "{{count}} item(s)",
    loading: "Loading fulfillment preview...",
    location: "Stock location",
    locationPlaceholder: "Select stock location",
    noEligible: "No selected orders are eligible for fulfillment.",
    notifyCustomers: "Notify customers",
    previewUnavailable: "Select a stock location to preview eligibility.",
    selected: "{{count}} selected",
    skipped: "{{order}}: skipped - {{reason}}",
    skippedCount: "{{count}} skipped",
    skippedMore: "{{count}} more skipped",
    stockLocationsUnavailable: "No stock locations are available.",
    title: "Fulfill items",
  },
  labelFormats: {
    a6: "A6",
    a7: "A7",
  },
  manualStatus: {
    canceled: "Canceled",
    clear: "Clear manual status",
    none: "No manual status",
    processing: "Processing",
    waiting_for_supplier: "Waiting for supplier",
  },
  manualStatusPrompt: {
    description: "Only manually selected orders will be updated.",
    skipped: "{{order}}: skipped - {{reason}}",
    skippedMore: "{{count}} more will be skipped",
    target: "Target manual status: {{status}}",
    title: "Apply manual status",
    updated: "{{order}}: set manual status to {{status}}",
    updatedMore: "{{count}} more will be updated",
    willChange:
      "{{updatedCount}} order(s) will be updated. {{skippedCount}} order(s) will be skipped.",
  },
  menuItem: "Order dashboard",
  manualStatusBlocker: {
    alreadyClear: "Manual status is already clear",
    alreadyStatus: "Manual status is already {{status}}",
    canceledStayCanceled: "Canceled orders stay canceled",
    higherPriority: "{{status}} status has higher priority",
  },
  packetaSkip: {
    noActiveLabel: "No active Packeta packet label",
    notPacketa: "Carrier is {{carrier}}, not Packeta",
    unchecked: "Packeta label status could not be checked",
  },
  queues: {
    action_required: "Action required",
    all: "All",
  },
  sidebar: {
    actionRequiredOrders:
      "{{count}} orders waiting for admin confirmation without captured payment",
  },
  statuses: {
    awaiting_payment: "Awaiting payment",
    canceled: "Canceled",
    delivered: "Delivered",
    new: "Unhandled",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    waiting_for_supplier: "Waiting internally",
  },
  table: {
    blockedOrdersTitle: "Some orders could not be updated.",
    carrierFilterLimit:
      "The carrier filter scanned {{count}} orders. The result may be incomplete.",
    empty: "No orders found.",
    filterTooltip: "Add filter",
    loading: "Loading orders...",
  },
  tableMessages: {
    blockedCount: "{{count}} blocked",
    moreBlocked: "{{count}} more blocked",
  },
  targetStatusBlocker: {
    activeFulfillmentCannotCanceled:
      "Orders with active fulfillments cannot be canceled",
    alreadyStatus: "Order is already {{status}}",
    archivedCannotChange: "Archived orders cannot be changed",
    canceledOnlyArchived: "Canceled orders can only be archived",
    completedCannotCanceled: "Completed orders cannot be canceled",
    completedOnlyArchived: "Completed orders can only be archived",
    selectedBlockedMany:
      "{{status}} is blocked for {{count}} selected orders. Open the status menu for details.",
    selectedBlockedOne:
      "{{status}} is blocked for 1 selected order: {{order}} - {{reason}}.",
    targetNotAllowed:
      "{{currentStatus}} orders cannot be changed to {{targetStatus}}",
    unknownStatus: "Order status is unknown",
    unsupportedStatus: "Order status {{status}} cannot be changed",
  },
  targetStatus: {
    archived: "Archived",
    canceled: "Canceled",
    completed: "Completed",
    draft: "Draft",
    pending: "Pending",
    requires_action: "Requires action",
  },
  title: "Order dashboard",
  toast: {
    businessStatusUpdated: "Manual status updated for {{count}} orders",
    businessStatusUpdatedWithSkipped:
      "Manual status updated for {{count}} orders. {{skippedCount}} skipped.",
    blockedOrderStatus: "Selected orders do not support that status change.",
    fulfillmentCreated: "Fulfillment created for {{count}} orders",
    fulfillmentCreatedWithFailed:
      "Fulfillment created for {{count}} orders. {{failedCount}} failed.",
    fulfillmentLimit: "Select up to {{count}} orders for bulk fulfillment.",
    fulfillmentSkipped: "No selected orders can be fulfilled.",
    manualStatusSkipped: "Manual status was not changed",
    missingBusinessStatus: "Select a manual status.",
    missingOrderStatus: "Select a target order status.",
    noPacketaSelection: "No selected orders have printable Packeta labels.",
    noSelection: "Select at least one order.",
    packetaEligibilityLoading: "Packeta label eligibility is still loading.",
    packetaLabelLimit: "Select up to {{count}} orders.",
    packetaLabelsReady: "Packeta labels are ready",
    pdfReady: "Expedition PDF is ready",
    requestFailed: "Operation failed",
    statusUpdated: "Status updated for {{count}} orders",
  },
} satisfies OrderDashboardAdminI18nNamespace

const czechOrderDashboardAdminI18n = {
  actions: {
    apply: "Použít",
    applyManualStatus: "Použít ruční stav",
    businessStatusPlaceholder: "Ruční stav",
    cancel: "Zrušit",
    clearManualStatus: "Vymazat ruční stav",
    closeDetails: "Zavřít",
    details: "Detail",
    expeditionPdf: "Expediční PDF",
    fulfillItems: "Vyřídit položky",
    labelFormat: "Formát",
    packetaEligible:
      "{{count}} tisknutelných štítků Packeta z {{selectedCount}} vybraných",
    packetaLabels: "Štítky Packeta",
    selected: "{{count}} vybráno",
    targetStatusPlaceholder: "Stav objednávky",
  },
  columns: {
    address: "Adresa",
    businessStatus: "Stav",
    carrier: "Dopravce",
    created: "Vytvořeno",
    customer: "Zákazník",
    details: "Detail",
    fulfillment: "Vyřízení",
    manualStatus: "Ruční stav",
    order: "Objednávka",
    payment: "Platba",
    total: "Celkem",
  },
  detail: {
    activeFulfillment: "Aktivní vyřízení",
    address: "Adresa",
    businessStatus: "Provozní stav",
    carrier: "Dopravce",
    fulfillment: "Vyřízení",
    items: "Položky",
    manualStatus: "Ruční stav",
    noActiveFulfillment: "Žádné aktivní vyřízení",
    noItems: "Žádné položky nejsou dostupné.",
    orderStatus: "Stav v Meduse",
    payment: "Platba",
    quantity: "{{count}} ks",
    title: "Detail {{order}}",
    total: "Celkem",
  },
  filters: {
    businessStatus: "Stav",
    carrier: "Dopravce",
  },
  fulfillmentStatus: {
    canceled: "Zrušeno",
    delivered: "Doručeno",
    fulfilled: "Vyřízeno",
    not_fulfilled: "Nevyřízeno",
    partially_delivered: "Částečně doručeno",
    partially_fulfilled: "Částečně vyřízeno",
    partially_returned: "Částečně vráceno",
    partially_shipped: "Částečně expedováno",
    requires_action: "Vyžaduje akci",
    returned: "Vráceno",
    shipped: "Expedováno",
  },
  fulfillmentBlocker: {
    canceled: "Zrušené objednávky nelze vyřídit",
    missingOrder: "Detail objednávky se nepodařilo načíst",
    noFulfillableItems: "Žádné položky k odeslání nečekají na vyřízení",
    noShippingOption: "Objednávka nemá dopravní možnost",
    shippingOptionUnavailable:
      "Dopravní možnost objednávky není dostupná z vybraného skladu",
    shippingProfileMismatch:
      "Žádné vyříditelné položky neodpovídají dopravnímu profilu objednávky",
  },
  fulfillmentModal: {
    confirm: "Vyřídit způsobilé objednávky",
    description:
      "Způsobilé objednávky se vyřídí z vybraného skladu přes původní dopravní možnost každé objednávky.",
    eligible: "{{count}} způsobilých",
    eligibleMore: "{{count}} dalších způsobilých",
    failed: "{{order}}: selhalo - {{reason}}",
    failedCount: "{{count}} selhalo",
    failedMore: "{{count}} dalších selhalo",
    fulfilled: "{{order}}: vyřízeno",
    fulfilledCount: "{{count}} vyřízeno",
    fulfilledMore: "{{count}} dalších vyřízeno",
    items: "{{count}} položek",
    loading: "Načítám náhled vyřízení...",
    location: "Sklad",
    locationPlaceholder: "Vyberte sklad",
    noEligible: "Žádné vybrané objednávky nelze vyřídit.",
    notifyCustomers: "Upozornit zákazníky",
    previewUnavailable: "Pro náhled způsobilosti vyberte sklad.",
    selected: "{{count}} vybráno",
    skipped: "{{order}}: přeskočeno - {{reason}}",
    skippedCount: "{{count}} přeskočeno",
    skippedMore: "{{count}} dalších přeskočeno",
    stockLocationsUnavailable: "Nejsou dostupné žádné sklady.",
    title: "Vyřídit položky",
  },
  labelFormats: {
    a6: "A6",
    a7: "A7",
  },
  manualStatus: {
    canceled: "Zrušeno",
    clear: "Vymazat ruční stav",
    none: "Žádný ruční stav",
    processing: "Zpracovává se",
    waiting_for_supplier: "Čeká na dodavatele",
  },
  manualStatusPrompt: {
    description: "Upraví se pouze ručně vybrané objednávky.",
    skipped: "{{order}}: přeskočeno - {{reason}}",
    skippedMore: "{{count}} dalších bude přeskočeno",
    target: "Cílový ruční stav: {{status}}",
    title: "Použít ruční stav",
    updated: "{{order}}: ruční stav bude nastaven na {{status}}",
    updatedMore: "{{count}} dalších bude upraveno",
    willChange:
      "{{updatedCount}} objednávek bude upraveno. {{skippedCount}} objednávek bude přeskočeno.",
  },
  menuItem: "Přehled",
  manualStatusBlocker: {
    alreadyClear: "Ruční stav je už vymazaný",
    alreadyStatus: "Ruční stav je už {{status}}",
    canceledStayCanceled: "Zrušené objednávky zůstávají zrušené",
    higherPriority: "Stav {{status}} má vyšší prioritu",
  },
  packetaSkip: {
    noActiveLabel: "Žádný aktivní štítek zásilky Packeta",
    notPacketa: "Dopravce je {{carrier}}, ne Packeta",
    unchecked: "Stav štítku Packeta se nepodařilo ověřit",
  },
  queues: {
    action_required: "Vyžaduje akci",
    all: "Vše",
  },
  sidebar: {
    actionRequiredOrders:
      "{{count}} objednávek čeká na potvrzení administrátorem bez zaúčtované platby",
  },
  statuses: {
    awaiting_payment: "Čeká na platbu",
    canceled: "Zrušeno",
    delivered: "Doručeno",
    new: "Nezpracováno",
    paid: "Zaplaceno",
    processing: "Zpracovává se",
    shipped: "Expedováno",
    waiting_for_supplier: "Čeká interně",
  },
  table: {
    blockedOrdersTitle: "Některé objednávky se nepodařilo upravit.",
    carrierFilterLimit:
      "Filtr dopravce prošel {{count}} objednávek. Výsledek nemusí být kompletní.",
    empty: "Nebyly nalezeny žádné objednávky.",
    filterTooltip: "Přidat filtr",
    loading: "Načítám objednávky...",
  },
  tableMessages: {
    blockedCount: "{{count}} blokováno",
    moreBlocked: "{{count}} dalších blokováno",
  },
  targetStatusBlocker: {
    activeFulfillmentCannotCanceled:
      "Objednávky s aktivním vyřízením nelze zrušit",
    alreadyStatus: "Objednávka už je {{status}}",
    archivedCannotChange: "Archivované objednávky nelze měnit",
    canceledOnlyArchived: "Zrušené objednávky lze jen archivovat",
    completedCannotCanceled: "Dokončené objednávky nelze zrušit",
    completedOnlyArchived: "Dokončené objednávky lze jen archivovat",
    selectedBlockedMany:
      "{{status}} je blokováno pro {{count}} vybraných objednávek. Detaily najdete v menu stavu.",
    selectedBlockedOne:
      "{{status}} je blokováno pro 1 vybranou objednávku: {{order}} - {{reason}}.",
    targetNotAllowed:
      "Objednávky ve stavu {{currentStatus}} nelze změnit na {{targetStatus}}",
    unknownStatus: "Stav objednávky není známý",
    unsupportedStatus: "Stav objednávky {{status}} nelze měnit",
  },
  targetStatus: {
    archived: "Archivováno",
    canceled: "Zrušeno",
    completed: "Dokončeno",
    draft: "Koncept",
    pending: "Čeká",
    requires_action: "Vyžaduje akci",
  },
  title: "Přehled objednávek",
  toast: {
    businessStatusUpdated: "Ruční stav upraven pro {{count}} objednávek",
    businessStatusUpdatedWithSkipped:
      "Ruční stav upraven pro {{count}} objednávek. {{skippedCount}} přeskočeno.",
    blockedOrderStatus: "Vybrané objednávky nepodporují tuto změnu stavu.",
    fulfillmentCreated: "Vyřízení vytvořeno pro {{count}} objednávek",
    fulfillmentCreatedWithFailed:
      "Vyřízení vytvořeno pro {{count}} objednávek. {{failedCount}} selhalo.",
    fulfillmentLimit:
      "Pro hromadné vyřízení vyberte nejvýše {{count}} objednávek.",
    fulfillmentSkipped: "Žádné vybrané objednávky nelze vyřídit.",
    manualStatusSkipped: "Ruční stav nebyl změněn",
    missingBusinessStatus: "Vyberte ruční stav.",
    missingOrderStatus: "Vyberte cílový stav objednávky.",
    noPacketaSelection:
      "Žádné vybrané objednávky nemají tisknutelné štítky Packeta.",
    noSelection: "Vyberte alespoň jednu objednávku.",
    packetaEligibilityLoading:
      "Způsobilost štítků Packeta se ještě načítá.",
    packetaLabelLimit: "Vyberte nejvýše {{count}} objednávek.",
    packetaLabelsReady: "Štítky Packeta jsou připravené",
    pdfReady: "Expediční PDF je připravené",
    requestFailed: "Operace selhala",
    statusUpdated: "Stav upraven pro {{count}} objednávek",
  },
} satisfies OrderDashboardAdminI18nNamespace

export const orderDashboardAdminI18n = {
  cs: czechOrderDashboardAdminI18n,
  en: englishOrderDashboardAdminI18n,
} satisfies Record<"cs" | "en", OrderDashboardAdminI18nNamespace>
