export type OrderDashboardAdminI18nNamespace = {
  actions: Record<
    | "apply"
    | "businessStatusPlaceholder"
    | "clearManualStatus"
    | "expeditionPdf"
    | "labelFormat"
    | "packetaLabels"
    | "selected"
    | "targetStatusPlaceholder",
    string
  >
  columns: Record<
    | "businessStatus"
    | "carrier"
    | "created"
    | "customer"
    | "items"
    | "manualStatus"
    | "order"
    | "payment"
    | "total",
    string
  >
  filters: Record<"businessStatus" | "carrier", string>
  labelFormats: Record<"a6" | "a7", string>
  manualStatus: Record<
    "canceled" | "clear" | "none" | "processing" | "waiting_for_supplier",
    string
  >
  menuItem: string
  queues: Record<"action_required" | "all", string>
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
    "carrierFilterLimit" | "empty" | "filterTooltip" | "loading",
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
    | "manualStatusSkipped"
    | "missingBusinessStatus"
    | "missingOrderStatus"
    | "noPacketaSelection"
    | "noSelection"
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
    businessStatusPlaceholder: "Manual status",
    clearManualStatus: "Clear manual status",
    expeditionPdf: "Expedition PDF",
    labelFormat: "Format",
    packetaLabels: "Packeta labels",
    selected: "{{count}} selected",
    targetStatusPlaceholder: "Order status",
  },
  columns: {
    businessStatus: "Status",
    carrier: "Carrier",
    created: "Created",
    customer: "Customer",
    items: "Items",
    manualStatus: "Manual status",
    order: "Order",
    payment: "Payment",
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
  menuItem: "Order dashboard",
  queues: {
    action_required: "Action required",
    all: "All",
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
    carrierFilterLimit:
      "The carrier filter scanned {{count}} orders. The result may be incomplete.",
    empty: "No orders found.",
    filterTooltip: "Add filter",
    loading: "Loading orders...",
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
    manualStatusSkipped: "Manual status was not changed",
    missingBusinessStatus: "Select a manual status.",
    missingOrderStatus: "Select a target order status.",
    noPacketaSelection: "Select only Packeta orders.",
    noSelection: "Select at least one order.",
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
