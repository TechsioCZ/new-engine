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
    | "order"
    | "payment"
    | "total",
    string
  >
  filters: Record<"businessStatus" | "carrier", string>
  labelFormats: Record<"a6" | "a7", string>
  manualStatus: Record<
    "canceled" | "clear" | "processing" | "waiting_for_supplier",
    string
  >
  menuItem: string
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

export const orderDashboardAdminI18n = {
  cs: {
    actions: {
      apply: "Pouzit",
      businessStatusPlaceholder: "Rucni stav",
      clearManualStatus: "Vymazat rucni stav",
      expeditionPdf: "Expedicni PDF",
      labelFormat: "Format",
      packetaLabels: "Packeta stitky",
      selected: "{{count}} vybrano",
      targetStatusPlaceholder: "Stav objednavky",
    },
    columns: {
      businessStatus: "Stav",
      carrier: "Dopravce",
      created: "Vytvoreno",
      customer: "Zakaznik",
      items: "Polozky",
      order: "Objednavka",
      payment: "Platba",
      total: "Celkem",
    },
    filters: {
      businessStatus: "Stav",
      carrier: "Dopravce",
    },
    labelFormats: {
      a6: "A6",
      a7: "A7",
    },
    manualStatus: {
      canceled: "Storno",
      clear: "Vymazat rucni stav",
      processing: "Zpracovava se",
      waiting_for_supplier: "Ceka na dodavatele",
    },
    menuItem: "Dashboard objednavek",
    statuses: {
      awaiting_payment: "Ceka na platbu",
      canceled: "Storno",
      delivered: "Dorucena",
      new: "Nova",
      paid: "Zaplacena",
      processing: "Zpracovava se",
      shipped: "Expedovana",
      waiting_for_supplier: "Ceka na dodavatele",
    },
    table: {
      carrierFilterLimit:
        "Filtr dopravce prosel {{count}} objednavek. Vysledek muze byt nekompletni.",
      empty: "Zadne objednavky nebyly nalezeny.",
      filterTooltip: "Pridat filtr",
      loading: "Nacitam objednavky...",
    },
    targetStatus: {
      archived: "Archivovana",
      canceled: "Storno",
      completed: "Dokoncena",
      draft: "Rozpracovana",
      pending: "Ceka",
      requires_action: "Vyzaduje akci",
    },
    title: "Dashboard objednavek",
    toast: {
      businessStatusUpdated:
        "Rucni stav byl aktualizovan u {{count}} objednavek",
      missingBusinessStatus: "Vyber rucni stav.",
      missingOrderStatus: "Vyber cilovy stav objednavky.",
      noPacketaSelection: "Vyber pouze objednavky s dopravcem Packeta.",
      noSelection: "Vyber alespon jednu objednavku.",
      packetaLabelsReady: "Packeta stitky jsou pripravene",
      pdfReady: "Expedicni PDF je pripravene",
      requestFailed: "Operace selhala",
      statusUpdated: "Stav byl aktualizovan u {{count}} objednavek",
    },
  },
  en: {
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
      processing: "Processing",
      waiting_for_supplier: "Waiting for supplier",
    },
    menuItem: "Order dashboard",
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
      missingBusinessStatus: "Select a manual status.",
      missingOrderStatus: "Select a target order status.",
      noPacketaSelection: "Select only Packeta orders.",
      noSelection: "Select at least one order.",
      packetaLabelsReady: "Packeta labels are ready",
      pdfReady: "Expedition PDF is ready",
      requestFailed: "Operation failed",
      statusUpdated: "Status updated for {{count}} orders",
    },
  },
} satisfies Record<"cs" | "en", OrderDashboardAdminI18nNamespace>
