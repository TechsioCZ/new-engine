import type { HttpTypes } from "@medusajs/types";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextImage from "next/image";
import NextLink from "next/link";
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

type AccountOrderGroupProps = {
  order: HttpTypes.StoreOrder;
  onPrefetchOrderDetail: (orderId: string) => void;
};

export function AccountOrderGroup({
  order,
  onPrefetchOrderDetail,
}: AccountOrderGroupProps) {
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
      className={`overflow-hidden rounded-order-group-lg border border-order-group-border bg-order-group-surface lg:grid ${desktopGridColumns}`}
    >
      <header
        className={`flex flex-col gap-order-group-header-gap border-order-group-border border-b bg-order-group-overlay p-order-group-3xl lg:col-span-3 lg:grid lg:items-start lg:gap-order-group-column ${desktopGridColumns} ${desktopSubgridColumns}`}
      >
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-order-group-lg gap-y-order-group-sm">
            <p className="text-order-group-fg-primary text-order-group-primary-size font-semibold">
              {resolveOrderDisplayId(order)}
            </p>
            <p className="text-order-group-fg-secondary text-order-group-secondary-size">
              {formatOrderDate(order.created_at)}
            </p>
            <Badge
              variant={orderProgress.variant}
              size="sm"
              className="px-150 whitespace-nowrap"
            >
              {orderProgress.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center">
            <p className="text-order-group-fg-secondary text-order-group-secondary-size">
              {`${orderItemCount}ks položiek v objednávke`}
            </p>
          </div>
        </section>

        <section className="leading-none lg:justify-self-end lg:text-start">
          <p className="text-order-group-fg-tertiary text-order-group-tertiary-size font-medium uppercase">
            Celková suma
          </p>
          <p className="font-semibold">
            {formatOrderAmount(orderTotalAmount, order.currency_code)}
          </p>
        </section>

        <div className="flex flex-wrap gap-order-group-md lg:justify-self-end">
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
        className={`hidden px-order-group-3xl py-order-group-lg text-order-group-fg-tertiary text-order-group-tertiary-size uppercase tracking-wide lg:col-span-3 lg:grid lg:items-center lg:gap-order-group-column ${desktopGridColumns} ${desktopSubgridColumns}`}
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
                className={`border-order-group-border border-t px-order-group-3xl py-order-group-3xl lg:col-span-3 lg:grid lg:items-start lg:gap-order-group-column ${desktopGridColumns} ${desktopSubgridColumns}`}
                key={item.id}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-order-group-lg">
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

                    <div className="min-w-0">
                      <p className="line-clamp-2 text-order-group-fg-primary text-order-group-secondary-size font-medium">
                        {item.title ?? "-"}
                      </p>
                      {item.variant_title ? (
                        <p className="line-clamp-1 text-order-group-fg-secondary text-order-group-tertiary-size">
                          {item.variant_title}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="min-w-fit text-start lg:justify-self-start">
                  <p className="text-order-group-fg-primary text-order-group-secondary-size font-medium">
                    {formatOrderAmount(lineTotal, order.currency_code)}
                  </p>
                  <p className="text-order-group-fg-secondary text-order-group-secondary-size">{`Množstvo: ${itemQuantity}`}</p>
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
        <p className="hidden border-order-group-border border-t px-order-group-3xl py-order-group-3xl text-order-group-fg-secondary text-order-group-secondary-size lg:col-span-3 lg:block">
          Objednávka neobsahuje položky.
        </p>
      )}

      <div className="p-order-group-order-group-2xl lg:hidden">
        {orderItems.length > 0 ? (
          orderItems.map((item) => {
            const itemQuantity = resolveOrderItemQuantity(item);
            const lineTotal = resolveOrderItemTotalAmount(item);

            return (
              <article
                className="rounded-order-group-md border border-order-group-border bg-order-group-overlay p-order-group-xl"
                key={item.id}
              >
                <div className="flex items-start gap-order-group-lg">
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

                  <div className="min-w-0 flex-1 space-y-order-group-md">
                    <div className="flex items-start justify-between gap-order-group-lg">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-order-group-fg-primary text-order-group-secondary-size font-medium">
                          {item.title ?? "-"}
                        </p>
                        {item.variant_title && (
                          <p className="text-order-group-fg-secondary text-order-group-tertiary-size">
                            {item.variant_title}
                          </p>
                        )}
                      </div>

                      <p className="shrink-0 text-order-group-fg-primary text-order-group-secondary-size font-semibold">
                        {formatOrderAmount(lineTotal, order.currency_code)}
                      </p>
                    </div>

                    <p className="text-order-group-fg-secondary text-order-group-tertiary-size">{`Množstvo: ${itemQuantity}`}</p>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-order-group-fg-secondary text-order-group-secondary-size">
            Objednávka neobsahuje položky.
          </p>
        )}
      </div>
    </article>
  );
}
