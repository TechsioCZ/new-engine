export type OrderDashboardAdminI18nNamespace = {
  actions: Record<
    | "apply"
    | "applyManualStatus"
    | "businessStatusPlaceholder"
    | "cancel"
    | "clearManualStatus"
    | "closeDetails"
    | "columns"
    | "details"
    | "expeditionPdf"
    | "fulfillItems"
    | "labelFormat"
    | "openOrder"
    | "packetaEligible"
    | "packetaLabels"
    | "selected"
    | "sorting"
    | "targetStatusPlaceholder",
    string
  >
  carriers: Record<"other" | "packeta" | "ppl", string>
  columns: Record<
    | "businessStatus"
    | "carrier"
    | "address"
    | "created"
    | "customer"
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
  filters: Record<
    | "allCarriers"
    | "clearAll"
    | "createdAt"
    | "createdAtRange"
    | "createdAtRangeEnd"
    | "createdAtRangeStart"
    | "filter"
    | "searchPlaceholder",
    string
  >
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
  fallback: Record<
    | "notAvailable"
    | "unknownFulfillmentStatus"
    | "unknownOrderStatus"
    | "unknownPaymentMethod"
    | "unknownPaymentStatus",
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
  packetaLabelPositionPrompt: Record<
    "description" | "position" | "print" | "selected" | "title",
    string
  >
  pagination: Record<
    | "next"
    | "of"
    | "pages_few"
    | "pages_one"
    | "pages_other"
    | "prev"
    | "results_few"
    | "results_one"
    | "results_other",
    string
  >
  paymentMethod: Record<
    "comgate" | "gopay" | "manual" | "qr" | "stripe",
    string
  >
  paymentStatus: Record<
    | "authorized"
    | "awaiting"
    | "canceled"
    | "captured"
    | "not_paid"
    | "partially_authorized"
    | "partially_captured"
    | "partially_refunded"
    | "refunded"
    | "requires_action",
    string
  >
  queues: Record<"action_required" | "all", string>
  sidebar: Record<"actionRequiredOrders", string>
  sorting: Record<"ascending" | "descending", string>
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
    "blockedOrdersTitle" | "carrierFilterLimit" | "empty" | "loading",
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
    | "businessStatusUpdated_few"
    | "businessStatusUpdated_one"
    | "businessStatusUpdated_other"
    | "businessStatusUpdatedWithSkipped"
    | "blockedOrderStatus"
    | "fulfillmentCreated_few"
    | "fulfillmentCreated_one"
    | "fulfillmentCreated_other"
    | "fulfillmentCreatedWithFailed"
    | "fulfillmentLimit"
    | "fulfillmentSkipped"
    | "manualStatusSkipped"
    | "missingBusinessStatus"
    | "missingOrderStatus"
    | "noPacketaSelection"
    | "noSelection"
    | "packetaLabelLimit"
    | "packetaLabelsReady"
    | "pdfReady"
    | "requestFailed"
    | "statusUpdated_few"
    | "statusUpdated_one"
    | "statusUpdated_other",
    string
  >
}

const englishOrderDashboardAdminI18n = {
  actions: {
    apply: "Apply",
    applyManualStatus: "Set manual status",
    businessStatusPlaceholder: "Manual status",
    cancel: "Cancel",
    clearManualStatus: "Clear manual status",
    closeDetails: "Close",
    columns: "Columns",
    details: "Details",
    expeditionPdf: "Expedition PDF",
    fulfillItems: "Create fulfillments",
    labelFormat: "Format",
    openOrder: "Open order",
    packetaEligible: "Printable Packeta labels: {{count}} of {{selectedCount}}",
    packetaLabels: "Packeta labels",
    selected: "{{count}} selected",
    sorting: "Sort orders",
    targetStatusPlaceholder: "Order status",
  },
  carriers: {
    other: "Other",
    packeta: "Packeta",
    ppl: "PPL",
  },
  columns: {
    address: "Address",
    businessStatus: "Status",
    carrier: "Carrier",
    created: "Created",
    customer: "Customer",
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
    title: "Order {{order}}",
    total: "Total",
  },
  filters: {
    allCarriers: "All carriers",
    clearAll: "Clear all",
    createdAt: "Created",
    createdAtRange: "Custom range",
    createdAtRangeEnd: "To",
    createdAtRangeStart: "From",
    filter: "Filter orders",
    searchPlaceholder: "Search orders or customers...",
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
    confirm: "Create fulfillments",
    description:
      "Fulfillments will be created from the selected stock location using each order's original shipping method.",
    eligible: "Eligible: {{count}}",
    eligibleMore: "Additional eligible orders: {{count}}",
    failed: "{{order}}: failed - {{reason}}",
    failedCount: "Failed: {{count}}",
    failedMore: "Additional failures: {{count}}",
    fulfilled: "{{order}}: fulfilled",
    fulfilledCount: "Fulfilled: {{count}}",
    fulfilledMore: "Additional fulfilled orders: {{count}}",
    items: "Items: {{count}}",
    loading: "Loading fulfillment preview...",
    location: "Stock location",
    locationPlaceholder: "Select stock location",
    noEligible: "No selected orders are eligible for fulfillment.",
    notifyCustomers: "Notify customers",
    previewUnavailable: "Select a stock location to preview eligibility.",
    selected: "{{count}} selected",
    skipped: "{{order}}: skipped - {{reason}}",
    skippedCount: "Skipped: {{count}}",
    skippedMore: "Additional skipped orders: {{count}}",
    stockLocationsUnavailable: "No stock locations are available.",
    title: "Create fulfillments",
  },
  fallback: {
    notAvailable: "—",
    unknownFulfillmentStatus: "Unknown fulfillment status ({{status}})",
    unknownOrderStatus: "Unknown status ({{status}})",
    unknownPaymentMethod: "Other payment method ({{method}})",
    unknownPaymentStatus: "Unknown payment status ({{status}})",
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
    skippedMore: "Additional orders to skip: {{count}}",
    target: "Target manual status: {{status}}",
    title: "Set manual status",
    updated: "{{order}}: set manual status to {{status}}",
    updatedMore: "Additional orders to update: {{count}}",
    willChange: "To update: {{updatedCount}}. To skip: {{skippedCount}}.",
  },
  menuItem: "Dashboard",
  manualStatusBlocker: {
    alreadyClear: "Manual status is already clear",
    alreadyStatus: "Manual status is already {{status}}",
    canceledStayCanceled: "Canceled orders stay canceled",
    higherPriority: "{{status}} status has higher priority",
  },
  packetaSkip: {
    noActiveLabel: "No active Packeta shipping label",
    notPacketa: "Carrier is {{carrier}}, not Packeta",
    unchecked: "Packeta label status could not be checked",
  },
  packetaLabelPositionPrompt: {
    description:
      "Labels will be placed on an A4 sheet with four positions. Choose where the first label should start.",
    position: "Position {{position}}",
    print: "Download labels",
    selected: "Labels to print: {{count}}",
    title: "Packeta label start position",
  },
  pagination: {
    next: "Next",
    of: "of",
    pages_few: "pages",
    pages_one: "page",
    pages_other: "pages",
    prev: "Previous",
    results_few: "results",
    results_one: "result",
    results_other: "results",
  },
  paymentMethod: {
    comgate: "Comgate",
    gopay: "GoPay",
    manual: "Other payment method",
    qr: "QR payment",
    stripe: "Card (Stripe)",
  },
  paymentStatus: {
    authorized: "Authorized",
    awaiting: "Awaiting payment",
    canceled: "Canceled",
    captured: "Paid",
    not_paid: "Not paid",
    partially_authorized: "Partially authorized",
    partially_captured: "Partially paid",
    partially_refunded: "Partially refunded",
    refunded: "Refunded",
    requires_action: "Requires action",
  },
  queues: {
    action_required: "Action required",
    all: "All",
  },
  sidebar: {
    actionRequiredOrders:
      "Orders awaiting admin confirmation without captured payment: {{count}}",
  },
  sorting: {
    ascending: "Ascending",
    descending: "Descending",
  },
  statuses: {
    awaiting_payment: "Awaiting payment",
    canceled: "Canceled",
    delivered: "Delivered",
    new: "Unhandled",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    waiting_for_supplier: "Waiting for supplier",
  },
  table: {
    blockedOrdersTitle: "Some orders could not be updated.",
    carrierFilterLimit:
      "The carrier filter scanned {{count}} orders. The result may be incomplete.",
    empty: "No orders found.",
    loading: "Loading orders...",
  },
  tableMessages: {
    blockedCount: "{{count}} blocked",
    moreBlocked: "Additional blocked orders: {{count}}",
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
  title: "Orders",
  toast: {
    businessStatusUpdated_few: "Manual status updated for {{count}} orders.",
    businessStatusUpdated_one: "Manual status updated for 1 order.",
    businessStatusUpdated_other: "Manual status updated for {{count}} orders.",
    businessStatusUpdatedWithSkipped:
      "Manual status update completed. Updated: {{count}}. Skipped: {{skippedCount}}.",
    blockedOrderStatus: "Selected orders do not support that status change.",
    fulfillmentCreated_few: "Fulfillments created for {{count}} orders.",
    fulfillmentCreated_one: "Fulfillment created for 1 order.",
    fulfillmentCreated_other: "Fulfillments created for {{count}} orders.",
    fulfillmentCreatedWithFailed:
      "Fulfillment completed. Successful: {{count}}. Failed: {{failedCount}}.",
    fulfillmentLimit: "Select up to {{count}} orders for bulk fulfillment.",
    fulfillmentSkipped: "No selected orders can be fulfilled.",
    manualStatusSkipped: "Manual status was not changed.",
    missingBusinessStatus: "Select a manual status.",
    missingOrderStatus: "Select a target order status.",
    noPacketaSelection: "No selected orders have printable Packeta labels.",
    noSelection: "Select at least one order.",
    packetaLabelLimit: "Select up to {{count}} orders.",
    packetaLabelsReady: "Packeta labels were downloaded.",
    pdfReady: "Expedition PDF was downloaded.",
    requestFailed: "Operation failed.",
    statusUpdated_few: "Status updated for {{count}} orders.",
    statusUpdated_one: "Status updated for 1 order.",
    statusUpdated_other: "Status updated for {{count}} orders.",
  },
} satisfies OrderDashboardAdminI18nNamespace

const czechOrderDashboardAdminI18n = {
  actions: {
    apply: "Použít",
    applyManualStatus: "Nastavit manuální stav",
    businessStatusPlaceholder: "Manuální stav",
    cancel: "Zrušit",
    clearManualStatus: "Vymazat manuální stav",
    closeDetails: "Zavřít",
    columns: "Sloupce",
    details: "Detail",
    expeditionPdf: "Expediční PDF",
    fulfillItems: "Vytvořit expedice",
    labelFormat: "Formát",
    openOrder: "Otevřít objednávku",
    packetaEligible: "Štítky Packeta k tisku: {{count}} z {{selectedCount}}",
    packetaLabels: "Štítky Packeta",
    selected: "{{count}} vybráno",
    sorting: "Seřadit objednávky",
    targetStatusPlaceholder: "Stav objednávky",
  },
  carriers: {
    other: "Ostatní",
    packeta: "Packeta",
    ppl: "PPL",
  },
  columns: {
    address: "Adresa",
    businessStatus: "Stav",
    carrier: "Dopravce",
    created: "Vytvořeno",
    customer: "Zákazník",
    fulfillment: "Expedice",
    manualStatus: "Manuální stav",
    order: "Objednávka",
    payment: "Platba",
    total: "Celkem",
  },
  detail: {
    activeFulfillment: "Aktivní expedice",
    address: "Adresa",
    businessStatus: "Provozní stav",
    carrier: "Dopravce",
    fulfillment: "Expedice",
    items: "Položky",
    manualStatus: "Manuální stav",
    noActiveFulfillment: "Žádná aktivní expedice",
    noItems: "Žádné položky nejsou dostupné.",
    orderStatus: "Stav v Meduse",
    payment: "Platba",
    quantity: "{{count}} ks",
    title: "Objednávka {{order}}",
    total: "Celkem",
  },
  filters: {
    allCarriers: "Všichni dopravci",
    clearAll: "Vymazat vše",
    createdAt: "Vytvořeno",
    createdAtRange: "Vlastní období",
    createdAtRangeEnd: "Do",
    createdAtRangeStart: "Od",
    filter: "Filtrovat objednávky",
    searchPlaceholder: "Hledat objednávku nebo zákazníka...",
  },
  fulfillmentStatus: {
    canceled: "Zrušeno",
    delivered: "Doručeno",
    fulfilled: "Expedice vytvořena",
    not_fulfilled: "Bez expedice",
    partially_delivered: "Částečně doručeno",
    partially_fulfilled: "Částečná expedice",
    partially_returned: "Částečně vráceno",
    partially_shipped: "Částečně odesláno",
    requires_action: "Vyžaduje akci",
    returned: "Vráceno",
    shipped: "Odesláno",
  },
  fulfillmentBlocker: {
    canceled: "Pro zrušené objednávky nelze vytvořit expedici",
    missingOrder: "Detail objednávky se nepodařilo načíst",
    noFulfillableItems: "Žádné položky nečekají na expedici",
    noShippingOption: "Objednávka nemá způsob dopravy",
    shippingOptionUnavailable:
      "Způsob dopravy objednávky není dostupný z vybraného skladu",
    shippingProfileMismatch:
      "Žádné položky k expedici neodpovídají přepravnímu profilu objednávky",
  },
  fulfillmentModal: {
    confirm: "Vytvořit expedice",
    description:
      "Expedice se vytvoří z vybraného skladu s použitím původního způsobu dopravy každé objednávky.",
    eligible: "Lze expedovat: {{count}}",
    eligibleMore: "Další objednávky k expedici: {{count}}",
    failed: "{{order}}: selhalo - {{reason}}",
    failedCount: "Selhalo: {{count}}",
    failedMore: "Další chyby: {{count}}",
    fulfilled: "{{order}}: expedice vytvořena",
    fulfilledCount: "Expedice vytvořeny: {{count}}",
    fulfilledMore: "Další vytvořené expedice: {{count}}",
    items: "Položky: {{count}}",
    loading: "Načítám náhled expedic...",
    location: "Sklad",
    locationPlaceholder: "Vyberte sklad",
    noEligible: "Pro žádnou vybranou objednávku nelze vytvořit expedici.",
    notifyCustomers: "Upozornit zákazníky",
    previewUnavailable: "Pro náhled způsobilosti vyberte sklad.",
    selected: "{{count}} vybráno",
    skipped: "{{order}}: přeskočeno - {{reason}}",
    skippedCount: "Přeskočeno: {{count}}",
    skippedMore: "Další přeskočené objednávky: {{count}}",
    stockLocationsUnavailable: "Nejsou dostupné žádné sklady.",
    title: "Vytvořit expedice",
  },
  fallback: {
    notAvailable: "—",
    unknownFulfillmentStatus: "Neznámý stav expedice ({{status}})",
    unknownOrderStatus: "Neznámý stav ({{status}})",
    unknownPaymentMethod: "Jiná platební metoda ({{method}})",
    unknownPaymentStatus: "Neznámý stav platby ({{status}})",
  },
  labelFormats: {
    a6: "A6",
    a7: "A7",
  },
  manualStatus: {
    canceled: "Zrušeno",
    clear: "Vymazat manuální stav",
    none: "Žádný manuální stav",
    processing: "Zpracovává se",
    waiting_for_supplier: "Čeká na dodavatele",
  },
  manualStatusPrompt: {
    description: "Upraví se pouze ručně vybrané objednávky.",
    skipped: "{{order}}: přeskočeno - {{reason}}",
    skippedMore: "Další objednávky k přeskočení: {{count}}",
    target: "Cílový manuální stav: {{status}}",
    title: "Nastavit manuální stav",
    updated: "{{order}}: manuální stav bude nastaven na {{status}}",
    updatedMore: "Další objednávky k úpravě: {{count}}",
    willChange: "K úpravě: {{updatedCount}}. K přeskočení: {{skippedCount}}.",
  },
  menuItem: "Přehled",
  manualStatusBlocker: {
    alreadyClear: "Manuální stav je už vymazaný",
    alreadyStatus: "Manuální stav je už {{status}}",
    canceledStayCanceled: "Zrušené objednávky zůstávají zrušené",
    higherPriority: "Stav {{status}} má vyšší prioritu",
  },
  packetaSkip: {
    noActiveLabel: "Žádný aktivní štítek zásilky Packeta",
    notPacketa: "Dopravce je {{carrier}}, ne Packeta",
    unchecked: "Stav štítku Packeta se nepodařilo ověřit",
  },
  packetaLabelPositionPrompt: {
    description:
      "Štítky se připraví na A4 arch se čtyřmi pozicemi. Vyberte, od které pozice má začít první štítek.",
    position: "Pozice {{position}}",
    print: "Stáhnout štítky",
    selected: "Štítky k tisku: {{count}}",
    title: "Počáteční pozice štítku Packeta",
  },
  pagination: {
    next: "Další",
    of: "z",
    pages_few: "stránek",
    pages_one: "stránky",
    pages_other: "stránek",
    prev: "Předchozí",
    results_few: "výsledků",
    results_one: "výsledku",
    results_other: "výsledků",
  },
  paymentMethod: {
    comgate: "Comgate",
    gopay: "GoPay",
    manual: "Jiný způsob platby",
    qr: "QR platba",
    stripe: "Karta (Stripe)",
  },
  paymentStatus: {
    authorized: "Autorizováno",
    awaiting: "Čeká na platbu",
    canceled: "Zrušeno",
    captured: "Zaplaceno",
    not_paid: "Nezaplaceno",
    partially_authorized: "Částečně autorizováno",
    partially_captured: "Částečně zaplaceno",
    partially_refunded: "Částečně vráceno",
    refunded: "Vráceno",
    requires_action: "Vyžaduje akci",
  },
  queues: {
    action_required: "Vyžaduje akci",
    all: "Vše",
  },
  sidebar: {
    actionRequiredOrders:
      "Objednávky čekající na potvrzení bez zaúčtované platby: {{count}}",
  },
  sorting: {
    ascending: "Vzestupně",
    descending: "Sestupně",
  },
  statuses: {
    awaiting_payment: "Čeká na platbu",
    canceled: "Zrušeno",
    delivered: "Doručeno",
    new: "Nezpracováno",
    paid: "Zaplaceno",
    processing: "Zpracovává se",
    shipped: "Odesláno",
    waiting_for_supplier: "Čeká na dodavatele",
  },
  table: {
    blockedOrdersTitle: "Některé objednávky se nepodařilo upravit.",
    carrierFilterLimit:
      "Při filtrování podle dopravce bylo zkontrolováno {{count}} objednávek. Výsledek nemusí být kompletní.",
    empty: "Nebyly nalezeny žádné objednávky.",
    loading: "Načítám objednávky...",
  },
  tableMessages: {
    blockedCount: "{{count}} blokováno",
    moreBlocked: "Další blokované objednávky: {{count}}",
  },
  targetStatusBlocker: {
    activeFulfillmentCannotCanceled:
      "Objednávky s aktivní expedicí nelze zrušit",
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
  title: "Objednávky",
  toast: {
    businessStatusUpdated_few:
      "Manuální stav byl upraven u {{count}} objednávek.",
    businessStatusUpdated_one: "Manuální stav byl upraven u 1 objednávky.",
    businessStatusUpdated_other:
      "Manuální stav byl upraven u {{count}} objednávek.",
    businessStatusUpdatedWithSkipped:
      "Úprava manuálního stavu dokončena. Upraveno: {{count}}. Přeskočeno: {{skippedCount}}.",
    blockedOrderStatus: "Vybrané objednávky nepodporují tuto změnu stavu.",
    fulfillmentCreated_few: "Expedice byly vytvořeny pro {{count}} objednávky.",
    fulfillmentCreated_one: "Expedice byla vytvořena pro 1 objednávku.",
    fulfillmentCreated_other:
      "Expedice byly vytvořeny pro {{count}} objednávek.",
    fulfillmentCreatedWithFailed:
      "Vytvoření expedic dokončeno. Úspěšně: {{count}}. Selhalo: {{failedCount}}.",
    fulfillmentLimit:
      "Pro hromadné vytvoření expedic vyberte nejvýše {{count}} objednávek.",
    fulfillmentSkipped:
      "Pro žádnou vybranou objednávku nelze vytvořit expedici.",
    manualStatusSkipped: "Manuální stav nebyl změněn.",
    missingBusinessStatus: "Vyberte manuální stav.",
    missingOrderStatus: "Vyberte cílový stav objednávky.",
    noPacketaSelection:
      "Žádné vybrané objednávky nemají štítky Packeta k tisku.",
    noSelection: "Vyberte alespoň jednu objednávku.",
    packetaLabelLimit: "Vyberte nejvýše {{count}} objednávek.",
    packetaLabelsReady: "Štítky Packeta byly staženy.",
    pdfReady: "Expediční PDF bylo staženo.",
    requestFailed: "Operace selhala.",
    statusUpdated_few: "Stav byl upraven u {{count}} objednávek.",
    statusUpdated_one: "Stav byl upraven u 1 objednávky.",
    statusUpdated_other: "Stav byl upraven u {{count}} objednávek.",
  },
} satisfies OrderDashboardAdminI18nNamespace

export const orderDashboardAdminI18n = {
  cs: czechOrderDashboardAdminI18n,
  en: englishOrderDashboardAdminI18n,
} satisfies Record<"cs" | "en", OrderDashboardAdminI18nNamespace>
