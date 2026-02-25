import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderInvoiceUrl,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
  resolveOrderStatusBadgeVariant,
  resolveOrderStatusLabel,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";

type StorefrontAccountOrderGroupProps = {
  order: HttpTypes.StoreOrder;
  onPrefetchOrderDetail: (orderId: string) => void;
};

export function StorefrontAccountOrderGroup({
  order,
  onPrefetchOrderDetail,
}: StorefrontAccountOrderGroupProps) {
  const detailHref = `/account/orders/${order.id}`;
  const invoiceUrl = resolveOrderInvoiceUrl(order);
  const orderTotalAmount = resolveOrderTotalAmount(order);
  const orderStatus = resolveOrderStatusLabel(order.status);
  const orderStatusVariant = resolveOrderStatusBadgeVariant(order.status);
  const orderItems = order.items ?? [];
  const productColumnClass = "min-w-0";
  const priceColumnClass = "text-fg-secondary text-sm";

  return (
    <article className="overflow-hidden rounded-lg border border-border-secondary bg-surface">
      <header className="grid gap-300 border-border-secondary border-b bg-base p-300 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center">
        <section className="space-y-50">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide">
            Dátum objednávky
          </p>
          <p className="text-sm font-semibold text-fg-primary">
            {formatOrderDate(order.created_at)}
          </p>
        </section>

        <section className="space-y-50">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide">
            Číslo objednávky
          </p>
          <p className="text-sm font-semibold text-fg-primary">
            {resolveOrderDisplayId(order)}
          </p>
        </section>

        <section className="space-y-50">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide">
            Celková suma
          </p>
          <p className="text-sm font-semibold text-fg-primary">
            {formatOrderAmount(orderTotalAmount, order.currency_code)}
          </p>
        </section>

        <div className="flex flex-wrap gap-200 lg:justify-end">
          <LinkButton
            as={NextLink}
            href={detailHref}
            onFocus={() => {
              onPrefetchOrderDetail(order.id);
            }}
            onMouseEnter={() => {
              onPrefetchOrderDetail(order.id);
            }}
            size="sm"
            variant="secondary"
          >
            Zobraziť objednávku
          </LinkButton>
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
              Zobraziť faktúru
            </LinkButton>
          )}
        </div>
      </header>

      <div className="hidden lg:block">
        <div className="grid grid-cols-[minmax(0,1fr)_9rem_12rem_7.5rem] gap-200 px-300 py-200 text-fg-tertiary text-xs uppercase tracking-wide">
          <p>Produkt</p>
          <p className="text-end">Cena</p>
          <p>Stav</p>
          <p className="text-end">Info</p>
        </div>

        {orderItems.length > 0 ? (
          <ul>
            {orderItems.map((item) => {
              const itemQuantity = resolveOrderItemQuantity(item);
              const lineTotal = resolveOrderItemTotalAmount(item);

              return (
                <li
                  className="grid grid-cols-[minmax(0,1fr)_9rem_12rem_7.5rem] gap-200 border-border-secondary border-t px-300 py-250"
                  key={item.id}
                >
                  <div className={productColumnClass}>
                    <div className="flex items-center gap-200">
                      {item.thumbnail ? (
                        <img
                          alt={item.title ?? "Produkt"}
                          className="h-550 w-550 rounded-md border border-border-secondary object-cover"
                          loading="lazy"
                          src={item.thumbnail}
                        />
                      ) : null}

                      <div className="min-w-0 space-y-50">
                        <p className="line-clamp-2 font-medium text-fg-primary text-sm">
                          {item.title ?? "-"}
                        </p>
                        {item.variant_title ? (
                          <p className="line-clamp-1 text-fg-secondary text-xs">
                            {item.variant_title}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-50 text-end">
                    <p className="font-medium text-fg-primary text-sm">
                      {formatOrderAmount(lineTotal, order.currency_code)}
                    </p>
                    <p className={priceColumnClass}>{`Množstvo: ${itemQuantity}`}</p>
                  </div>

                  <div className="flex items-center">
                    <Badge variant={orderStatusVariant}>{orderStatus}</Badge>
                  </div>

                  <div className="flex items-center justify-end">
                    <LinkButton
                      as={NextLink}
                      href={detailHref}
                      onFocus={() => {
                        onPrefetchOrderDetail(order.id);
                      }}
                      onMouseEnter={() => {
                        onPrefetchOrderDetail(order.id);
                      }}
                      size="sm"
                      theme="outlined"
                      variant="secondary"
                    >
                      Detail
                    </LinkButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="border-border-secondary border-t px-300 py-350 text-fg-secondary text-sm">
            Objednávka neobsahuje položky.
          </p>
        )}
      </div>

      <div className="space-y-200 p-300 lg:hidden">
        {orderItems.length > 0 ? (
          orderItems.map((item) => {
            const itemQuantity = resolveOrderItemQuantity(item);
            const lineTotal = resolveOrderItemTotalAmount(item);

            return (
              <article className="rounded-md border border-border-secondary bg-base p-250" key={item.id}>
                <div className="flex items-start justify-between gap-200">
                  <div className="space-y-50">
                    <p className="font-medium text-fg-primary text-sm">{item.title ?? "-"}</p>
                    {item.variant_title && (
                      <p className="text-fg-secondary text-xs">{item.variant_title}</p>
                    )}
                  </div>
                  <Badge variant={orderStatusVariant}>
                    {orderStatus}
                  </Badge>
                </div>
                <div className="mt-150 flex items-center justify-between gap-200">
                  <p className="text-fg-secondary text-xs">{`Množstvo: ${itemQuantity}`}</p>
                  <p className="font-semibold text-fg-primary text-sm">
                    {formatOrderAmount(lineTotal, order.currency_code)}
                  </p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-fg-secondary text-sm">Objednávka neobsahuje položky.</p>
        )}
      </div>
    </article>
  );
}
