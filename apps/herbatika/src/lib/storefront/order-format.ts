import { formatCurrencyAmount } from "./price-format";

const ORDER_LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  archived: "Uzavretá",
  canceled: "Zrušená",
  completed: "Dokončená",
  draft: "Rozpracovaná",
  pending: "Spracováva sa",
  requires_action: "Vyžaduje akciu",
};

const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  authorized: "Platba overená",
  awaiting: "Čaká na platbu",
  canceled: "Platba zrušená",
  captured: "Zaplatená",
  not_paid: "Čaká na platbu",
  partially_authorized: "Čiastočne overená",
  partially_captured: "Čiastočne zaplatená",
  partially_refunded: "Čiastočne vrátená",
  refunded: "Vrátená",
  requires_action: "Platba vyžaduje akciu",
};

const ORDER_FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  canceled: "Doručenie zrušené",
  delivered: "Doručená",
  fulfilled: "Pripravená na odoslanie",
  not_fulfilled: "Spracováva sa",
  partially_delivered: "Čiastočne doručená",
  partially_fulfilled: "Čiastočne pripravená",
  partially_shipped: "Čiastočne odoslaná",
  shipped: "Odoslaná",
};

type OrderStatusBadgeVariant = "danger" | "info" | "success" | "warning";

export type StorefrontOrderStatusInput = {
  fulfillment_status?: string | null;
  payment_status?: string | null;
  status?: string | null;
};

export const resolveOrderPaymentStatusLabel = (
  order: StorefrontOrderStatusInput,
) => {
  if (!order.payment_status) {
    return null;
  }

  return ORDER_PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status;
};

export const resolveOrderFulfillmentStatusLabel = (
  order: StorefrontOrderStatusInput,
) => {
  if (!order.fulfillment_status) {
    return null;
  }

  return (
    ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillment_status] ??
    order.fulfillment_status
  );
};

export const resolveOrderProgressState = (
  order: StorefrontOrderStatusInput,
): { label: string; variant: OrderStatusBadgeVariant } => {
  if (order.status === "canceled") {
    return {
      label: ORDER_LIFECYCLE_STATUS_LABELS.canceled,
      variant: "danger",
    };
  }

  if (
    order.status === "requires_action" ||
    order.payment_status === "requires_action"
  ) {
    return {
      label: ORDER_LIFECYCLE_STATUS_LABELS.requires_action,
      variant: "warning",
    };
  }

  if (order.fulfillment_status === "delivered") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.delivered,
      variant: "success",
    };
  }

  if (order.fulfillment_status === "partially_delivered") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.partially_delivered,
      variant: "info",
    };
  }

  if (order.fulfillment_status === "shipped") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.shipped,
      variant: "info",
    };
  }

  if (order.fulfillment_status === "partially_shipped") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.partially_shipped,
      variant: "info",
    };
  }

  if (order.fulfillment_status === "fulfilled") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.fulfilled,
      variant: "info",
    };
  }

  if (order.fulfillment_status === "partially_fulfilled") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.partially_fulfilled,
      variant: "info",
    };
  }

  if (order.fulfillment_status === "canceled") {
    return {
      label: ORDER_FULFILLMENT_STATUS_LABELS.canceled,
      variant: "danger",
    };
  }

  if (
    order.payment_status === "awaiting" ||
    order.payment_status === "not_paid"
  ) {
    return {
      label: ORDER_PAYMENT_STATUS_LABELS.awaiting,
      variant: "warning",
    };
  }

  if (order.status === "completed") {
    return {
      label: ORDER_LIFECYCLE_STATUS_LABELS.completed,
      variant: "success",
    };
  }

  if (order.status === "archived") {
    return {
      label: ORDER_LIFECYCLE_STATUS_LABELS.archived,
      variant: "info",
    };
  }

  return {
    label: ORDER_LIFECYCLE_STATUS_LABELS.pending,
    variant: "info",
  };
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
