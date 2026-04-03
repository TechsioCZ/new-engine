import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import NextImage from "next/image";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderInvoiceUrl,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
  resolveOrderProgressState,
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
  const orderProgress = resolveOrderProgressState(order);
  const orderItems = order.items ?? [];
  const orderItemCount = orderItems.reduce((count, item) => {
    return count + resolveOrderItemQuantity(item);
  }, 0);
  const desktopGridColumns =
    "lg:grid-cols-[minmax(0,1fr)_max-content_max-content]";
  const desktopSubgridColumns =
    "lg:supports-[grid-template-columns:subgrid]:grid-cols-subgrid";

  return (
    <article
      className={`overflow-hidden rounded-lg border border-order-group-border-primary bg-surface lg:grid ${desktopGridColumns}`}
    >
      <header
        className={`flex flex-col gap-300 border-order-group-border-primary border-b bg-base p-350 lg:col-span-3 lg:grid lg:items-start lg:gap-order-group-column ${desktopGridColumns} ${desktopSubgridColumns}`}
      >
        <section className="min-w-0 space-y-150">
          <div className="flex flex-wrap items-center gap-x-200 gap-y-100">
            <p className="text-base font-semibold text-fg-primary">
              {resolveOrderDisplayId(order)}
            </p>
            <p className="text-fg-secondary text-sm">
              {formatOrderDate(order.created_at)}
            </p>
            <Badge
              variant={orderProgress.variant}
              size="sm"
              className="rounded-xs whitespace-nowrap"
            >
              {orderProgress.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-150">
            <p className="text-fg-secondary text-sm">
              {`${orderItemCount} položiek v objednávke`}
            </p>
          </div>
        </section>

        <section className="space-y-50 leading-none lg:justify-self-end lg:text-start">
          <p className="text-fg-tertiary text-xs font-medium uppercase">
            Celková suma
          </p>
          <p className="font-semibold">
            {formatOrderAmount(orderTotalAmount, order.currency_code)}
          </p>
        </section>

        <div className="flex flex-wrap gap-150 lg:justify-self-end">
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
        </div>
      </header>

      <div
        className={`hidden lg:col-span-3 lg:grid lg:items-center lg:gap-order-group-column px-350 py-250 text-fg-tertiary text-xs uppercase tracking-wide ${desktopGridColumns} ${desktopSubgridColumns}`}
      >
        <p>Produkt</p>
        <p className="text-start">Cena</p>
        <p className="text-end pr-500">Info</p>
      </div>

      {orderItems.length > 0 ? (
        <ul
          className={`hidden lg:col-span-3 lg:grid ${desktopGridColumns} ${desktopSubgridColumns}`}
        >
          {orderItems.map((item) => {
            const itemQuantity = resolveOrderItemQuantity(item);
            const lineTotal = resolveOrderItemTotalAmount(item);

            return (
              <li
                className={`border-order-group-border-primary border-t px-350 py-300 lg:col-span-3 lg:grid lg:items-start lg:gap-order-group-column ${desktopGridColumns} ${desktopSubgridColumns}`}
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-200">
                    {item.thumbnail ? (
                      <NextImage
                        alt={item.title ?? "Produkt"}
                        width={32}
                        height={32}
                        className="object-cover"
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

                <div className="min-w-fit text-start lg:justify-self-start">
                  <p className="font-medium text-fg-primary text-sm">
                    {formatOrderAmount(lineTotal, order.currency_code)}
                  </p>
                  <p className="text-fg-secondary text-sm">{`Množstvo: ${itemQuantity}`}</p>
                </div>

                <div className="flex items-center justify-end lg:justify-self-end">
                  <LinkButton
                    as={NextLink}
                    href={`/p/${item.product_handle}`}
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
        <p className="hidden border-order-group-border-primary border-t px-300 py-350 text-fg-secondary text-sm lg:col-span-3 lg:block">
          Objednávka neobsahuje položky.
        </p>
      )}

      <div className="space-y-200 p-300 lg:hidden">
        {orderItems.length > 0 ? (
          orderItems.map((item) => {
            const itemQuantity = resolveOrderItemQuantity(item);
            const lineTotal = resolveOrderItemTotalAmount(item);

            return (
              <article className="rounded-md border border-order-group-border-primary bg-base p-250" key={item.id}>
                <div className="flex items-start gap-200">
                  {item.thumbnail ? (
                    <NextImage
                      alt={item.title ?? "Produkt"}
                      width={32}
                      height={32}
                      className="shrink-0 object-cover"
                      loading="lazy"
                      src={item.thumbnail}
                    />
                  ) : null}

                  <div className="min-w-0 flex-1 space-y-150">
                    <div className="flex items-start justify-between gap-200">
                      <div className="min-w-0 space-y-50">
                        <p className="line-clamp-2 font-medium text-fg-primary text-sm">
                          {item.title ?? "-"}
                        </p>
                        {item.variant_title && (
                          <p className="text-fg-secondary text-xs">{item.variant_title}</p>
                        )}
                      </div>

                      <p className="shrink-0 font-semibold text-fg-primary text-sm">
                        {formatOrderAmount(lineTotal, order.currency_code)}
                      </p>
                    </div>

                    <p className="text-fg-secondary text-xs">{`Množstvo: ${itemQuantity}`}</p>
                  </div>
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
