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
  resolveOrderInvoiceUrl,
  resolveOrderItemCount,
  resolveOrderItemTotalAmount,
  resolveOrderStatusBadgeVariant,
  resolveOrderStatusLabel,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";

type StorefrontAccountOrderDetailSummaryProps = {
  order: HttpTypes.StoreOrder;
  customerEmail?: string | null;
};

export function StorefrontAccountOrderDetailSummary({
  order,
  customerEmail,
}: StorefrontAccountOrderDetailSummaryProps) {
  const orderItems = order.items ?? [];
  const orderSubtotal =
    typeof order.item_total === "number"
      ? order.item_total
      : orderItems.reduce((total, item) => {
          return total + resolveOrderItemTotalAmount(item);
        }, 0);
  const orderShippingTotal =
    typeof order.shipping_total === "number" ? order.shipping_total : 0;
  const orderTaxTotal = typeof order.tax_total === "number" ? order.tax_total : 0;
  const orderTotal = resolveOrderTotalAmount(order);
  const addresses = resolveOrderAddresses(order);
  const shippingMethod = resolveOrderShippingMethodLabel(order);
  const paymentMethod = resolveOrderPaymentMethodLabel(order);
  const trackingCode = resolveOrderTrackingCode(order);
  const invoiceUrl = resolveOrderInvoiceUrl(order);
  const resolvedEmail = resolveOrderContactEmail(order, customerEmail);

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
          <Badge variant={resolveOrderStatusBadgeVariant(order.status)}>
            {resolveOrderStatusLabel(order.status)}
          </Badge>
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
            {`Medzisúčet: ${formatOrderAmount(orderSubtotal, order.currency_code)}`}
          </p>
          <p className="text-fg-secondary text-sm">
            {`Doprava: ${formatOrderAmount(orderShippingTotal, order.currency_code)}`}
          </p>
          <p className="text-fg-secondary text-sm">
            {`DPH: ${formatOrderAmount(orderTaxTotal, order.currency_code)}`}
          </p>
          <p className="font-semibold text-fg-primary text-sm">
            {`Celkom: ${formatOrderAmount(orderTotal, order.currency_code)}`}
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
                <p className="font-medium text-fg-primary">{addresses.shipping.fullName}</p>
              )}
              {addresses.shipping.company && <p>{addresses.shipping.company}</p>}
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
                <p className="font-medium text-fg-primary">{addresses.billing.fullName}</p>
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
        </article>

        <article className="space-y-100">
          <h3 className="font-semibold">Platba</h3>
          <p className="text-fg-secondary text-sm">
            {paymentMethod ?? "Spôsob platby nie je dostupný"}
          </p>
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
