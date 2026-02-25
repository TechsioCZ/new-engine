import { formatCurrencyAmount } from "./price-format";

const ORDER_STATUS_LABELS: Record<string, string> = {
  canceled: "Zrušená",
  completed: "Dokončená",
  pending: "Čaká na spracovanie",
  requires_action: "Vyžaduje akciu",
};

type OrderStatusBadgeVariant = "danger" | "info" | "success" | "warning";

export const resolveOrderStatusLabel = (status?: string | null) => {
  if (!status) {
    return "Neznámy stav";
  }

  return ORDER_STATUS_LABELS[status] ?? status;
};

export const resolveOrderStatusBadgeVariant = (
  status?: string | null,
): OrderStatusBadgeVariant => {
  if (status === "completed") {
    return "success";
  }

  if (status === "canceled") {
    return "danger";
  }

  if (status === "pending" || status === "requires_action") {
    return "warning";
  }

  return "info";
};

export const resolveOrderDisplayId = (order: {
  display_id?: number | null;
  id: string;
}) => {
  if (order.display_id) {
    return `#${order.display_id}`;
  }

  return order.id;
};

export const formatOrderDate = (value?: Date | string | null) => {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatOrderAmount = (amount: number, currencyCode?: string | null) => {
  return formatCurrencyAmount(amount, currencyCode);
};

export const resolveOrderTotalAmount = (order: {
  item_total?: number | null;
  total?: number | null;
}) => {
  if (typeof order.total === "number") {
    return order.total;
  }

  if (typeof order.item_total === "number") {
    return order.item_total;
  }

  return 0;
};

export const resolveOrderItemTotalAmount = (item: {
  quantity?: number | null;
  total?: number | null;
  unit_price?: number | null;
}) => {
  if (typeof item.total === "number") {
    return item.total;
  }

  const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0;
  const quantity = typeof item.quantity === "number" ? item.quantity : 1;

  return unitPrice * quantity;
};

export const resolveOrderItemQuantity = (item: { quantity?: number | null }) => {
  if (typeof item.quantity === "number" && item.quantity > 0) {
    return item.quantity;
  }

  return 0;
};

export const resolveOrderItemCount = (
  items?: Array<{ quantity?: number | null }> | null,
) => {
  if (!items?.length) {
    return 0;
  }

  return items.reduce((count, item) => {
    const quantity = resolveOrderItemQuantity(item);
    return count + quantity;
  }, 0);
};

const resolveRecordValue = (
  source: Record<string, unknown>,
  key: string,
): string | null => {
  const value = source[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const resolveOrderInvoiceUrl = (
  order: { metadata?: unknown } | null | undefined,
) => {
  if (!order || !(order.metadata && typeof order.metadata === "object")) {
    return null;
  }

  const metadata = order.metadata as Record<string, unknown>;

  return (
    resolveRecordValue(metadata, "invoice_url") ??
    resolveRecordValue(metadata, "invoiceUrl") ??
    resolveRecordValue(metadata, "invoice_href") ??
    resolveRecordValue(metadata, "invoiceHref")
  );
};
