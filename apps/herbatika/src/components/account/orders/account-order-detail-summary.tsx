import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import {
  resolveOrderAddresses,
  resolveOrderContactEmail,
  resolveOrderPaymentMethodLabel,
  resolveOrderShippingMethodLabel,
  resolveOrderTrackingCode,
} from "@/lib/storefront/order-detail-format";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderFulfillmentStatusLabel,
  resolveOrderInvoiceUrl,
  resolveOrderItemCount,
  resolveOrderItemTotalAmount,
  resolveOrderPaymentStatusLabel,
  resolveOrderProgressState,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";

type AccountOrderDetailSummaryProps = {
  order: HttpTypes.StoreOrder;
  customerEmail?: string | null;
};

const readOrderAmount = (
  order: HttpTypes.StoreOrder,
  key: string,
): number | null => {
  const value = (order as unknown as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

export function AccountOrderDetailSummary({
  order,
  customerEmail,
}: AccountOrderDetailSummaryProps) {
  const orderItems = order.items ?? [];
  const orderItemsTotal =
    readOrderAmount(order, "item_total") ??
    orderItems.reduce((total, item) => {
      return total + resolveOrderItemTotalAmount(item);
    }, 0);
  const orderItemTaxTotal = readOrderAmount(order, "item_tax_total") ?? 0;
  const orderSubtotal =
    readOrderAmount(order, "item_subtotal") ??
    Math.max(orderItemsTotal - orderItemTaxTotal, 0);
  const orderShippingTotal = readOrderAmount(order, "shipping_total") ?? 0;
  const orderShippingTaxTotal =
    readOrderAmount(order, "shipping_tax_total") ?? 0;
  const orderShippingSubtotal =
    readOrderAmount(order, "shipping_subtotal") ??
    Math.max(orderShippingTotal - orderShippingTaxTotal, 0);
  const orderTaxTotal =
    readOrderAmount(order, "tax_total") ??
    Math.max(orderItemTaxTotal + orderShippingTaxTotal, 0);
  const orderTotal = resolveOrderTotalAmount(order);
  const addresses = resolveOrderAddresses(order);
  const shippingMethod = resolveOrderShippingMethodLabel(order);
  const paymentMethod = resolveOrderPaymentMethodLabel(order);
  const trackingCode = resolveOrderTrackingCode(order);
  const invoiceUrl = resolveOrderInvoiceUrl(order);
  const resolvedEmail = resolveOrderContactEmail(order, customerEmail);
  const orderProgress = resolveOrderProgressState(order);
  const paymentStatus = resolveOrderPaymentStatusLabel(order);
  const fulfillmentStatus = resolveOrderFulfillmentStatusLabel(order);

  return (
    <section className="space-y-400 rounded-lg border border-border-secondary bg-surface p-550">
      <header className="flex flex-wrap items-start justify-between gap-300 border-border-secondary border-b pb-300">
        <div className="space-y-100">
          <h2 className="text-xl font-semibold">
            {`Objednávka ${resolveOrderDisplayId(order)}`}
          </h2>
          <p className="text-fg-secondary text-sm">
            {`Vytvorená: ${formatOrderDate(order.created_at)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-200">
          <Badge variant={orderProgress.variant}>{orderProgress.label}</Badge>
          {invoiceUrl && (
            <LinkButton
              as={NextLink}
              href={invoiceUrl}
              rel="noreferrer"
              size="sm"
              target="_blank"
              theme="outlined"
              variant="secondary"
            >
              Faktúra
            </LinkButton>
          )}
        </div>
      </header>

      <div className="grid gap-300 md:grid-cols-2">
        <article className="space-y-100">
          <h3 className="font-semibold">Zhrnutie platby</h3>
          <p className="text-fg-secondary text-sm">
            {`Cena produktov bez DPH: ${formatOrderAmount(orderSubtotal, order.currency_code)}`}
          </p>
          <p className="text-fg-secondary text-sm">
            {`Doprava bez DPH: ${formatOrderAmount(orderShippingSubtotal, order.currency_code)}`}
          </p>
          <p className="text-fg-secondary text-sm">
            {`DPH: ${formatOrderAmount(orderTaxTotal, order.currency_code)}`}
          </p>
          <p className="font-semibold text-fg-primary text-sm">
            {`Celkom s DPH: ${formatOrderAmount(orderTotal, order.currency_code)}`}
          </p>
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">Detaily objednávky</h3>
          <p className="text-fg-secondary text-sm">{`ID: ${order.id}`}</p>
          <p className="text-fg-secondary text-sm">{`Email: ${resolvedEmail}`}</p>
          <p className="text-fg-secondary text-sm">
            {`Položky: ${resolveOrderItemCount(orderItems)}`}
          </p>
          <p className="text-fg-secondary text-sm">
            {`Aktualizované: ${formatOrderDate(order.updated_at)}`}
          </p>
        </article>
      </div>

      <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-2">
        <article className="space-y-150">
          <h3 className="font-semibold">Doručovacia adresa</h3>
          {addresses.shipping ? (
            <div className="space-y-50 text-fg-secondary text-sm">
              {addresses.shipping.fullName && (
                <p className="font-medium text-fg-primary">
                  {addresses.shipping.fullName}
                </p>
              )}
              {addresses.shipping.company && (
                <p>{addresses.shipping.company}</p>
              )}
              {addresses.shipping.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-fg-secondary text-sm">Adresa nie je dostupná.</p>
          )}
        </article>

        <article className="space-y-150">
          <h3 className="font-semibold">Fakturačná adresa</h3>
          {addresses.billing ? (
            <div className="space-y-50 text-fg-secondary text-sm">
              {addresses.billing.fullName && (
                <p className="font-medium text-fg-primary">
                  {addresses.billing.fullName}
                </p>
              )}
              {addresses.billing.company && <p>{addresses.billing.company}</p>}
              {addresses.billing.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            <p className="text-fg-secondary text-sm">Adresa nie je dostupná.</p>
          )}
        </article>
      </div>

      <div className="grid gap-300 rounded-md border border-border-secondary bg-base p-350 md:grid-cols-3">
        <article className="space-y-100">
          <h3 className="font-semibold">Doprava</h3>
          <p className="text-fg-secondary text-sm">
            {shippingMethod ?? "Spôsob dopravy nie je dostupný"}
          </p>
          {fulfillmentStatus && (
            <p className="text-fg-secondary text-sm">
              {`Stav: ${fulfillmentStatus}`}
            </p>
          )}
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">Platba</h3>
          <p className="text-fg-secondary text-sm">
            {paymentMethod ?? "Spôsob platby nie je dostupný"}
          </p>
          {paymentStatus && (
            <p className="text-fg-secondary text-sm">{`Stav: ${paymentStatus}`}</p>
          )}
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">Tracking</h3>
          <p className="text-fg-secondary text-sm">
            {trackingCode ?? "Tracking kód nie je dostupný"}
          </p>
        </article>
      </div>
    </section>
  );
}
