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
    actionRequiredOrders: "{{count}} action required orders",
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

export const orderDashboardAdminI18n = {
  cs: englishOrderDashboardAdminI18n,
  en: englishOrderDashboardAdminI18n,
} satisfies Record<"cs" | "en", OrderDashboardAdminI18nNamespace>
