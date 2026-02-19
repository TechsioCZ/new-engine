"use client";

import { Badge } from "@techsio/ui-kit/atoms/badge";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { ExtraText } from "@techsio/ui-kit/atoms/extra-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Breadcrumb } from "@techsio/ui-kit/molecules/breadcrumb";
import { Table } from "@techsio/ui-kit/organisms/table";
import NextLink from "next/link";
import {
  StorefrontAccountSkeletonSurface,
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import {
  formatOrderAmount,
  formatOrderDate,
  resolveOrderDisplayId,
  resolveOrderItemCount,
  resolveOrderItemTotalAmount,
  resolveOrderStatusBadgeVariant,
  resolveOrderStatusLabel,
  resolveOrderTotalAmount,
} from "@/lib/storefront/order-format";
import { useAuth } from "@/lib/storefront/auth";
import { useOrder } from "@/lib/storefront/orders";

type StorefrontAccountOrderDetailProps = {
  orderId: string;
};

export function StorefrontAccountOrderDetail({
  orderId,
}: StorefrontAccountOrderDetailProps) {
  const authQuery = useAuth();
  const orderQuery = useOrder({
    id: orderId,
    enabled: authQuery.isAuthenticated,
  });

  if (authQuery.isLoading || orderQuery.isLoading) {
    return <StorefrontAccountSkeletonSurface lines={10} />;
  }

  if (orderQuery.error) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <ErrorText showIcon>{orderQuery.error}</ErrorText>
        <LinkButton as={NextLink} href="/account/orders" variant="secondary">
          Späť na objednávky
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  if (!orderQuery.order) {
    return (
      <StorefrontAccountSurface className="space-y-400">
        <h2 className="text-lg font-semibold">Objednávka nebola nájdená</h2>
        <p className="text-sm text-fg-secondary">
          Skontrolujte URL alebo sa vráťte do zoznamu objednávok.
        </p>
        <LinkButton as={NextLink} href="/account/orders" variant="secondary">
          Späť na objednávky
        </LinkButton>
      </StorefrontAccountSurface>
    );
  }

  const order = orderQuery.order;
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

  return (
    <div className="space-y-400">
      <Breadcrumb
        items={[
          { label: "Domov", href: "/" },
          { label: "Účet", href: "/account" },
          { label: "Objednávky", href: "/account/orders" },
          { label: resolveOrderDisplayId(order) },
        ]}
        linkAs={NextLink}
      />

      <section className="space-y-400 rounded-xl border border-border-secondary bg-surface p-550">
        <header className="flex flex-wrap items-start justify-between gap-300">
          <div className="space-y-100">
            <h2 className="text-xl font-semibold">
              {`Objednávka ${resolveOrderDisplayId(order)}`}
            </h2>
            <ExtraText>{`Vytvorená: ${formatOrderDate(order.created_at)}`}</ExtraText>
          </div>

          <Badge variant={resolveOrderStatusBadgeVariant(order.status)}>
            {resolveOrderStatusLabel(order.status)}
          </Badge>
        </header>

        <div className="grid gap-300 rounded-xl border border-border-secondary bg-base p-400 md:grid-cols-2">
          <article className="space-y-100">
            <h3 className="font-semibold">Zhrnutie platby</h3>
            <p className="text-sm text-fg-secondary">
              {`Medzisúčet: ${formatOrderAmount(orderSubtotal, order.currency_code)}`}
            </p>
            <p className="text-sm text-fg-secondary">
              {`Doprava: ${formatOrderAmount(orderShippingTotal, order.currency_code)}`}
            </p>
            <p className="text-sm text-fg-secondary">
              {`DPH: ${formatOrderAmount(orderTaxTotal, order.currency_code)}`}
            </p>
            <p className="text-sm font-semibold text-fg-primary">
              {`Celkom: ${formatOrderAmount(orderTotal, order.currency_code)}`}
            </p>
          </article>

          <article className="space-y-100">
            <h3 className="font-semibold">Detaily objednávky</h3>
            <p className="text-sm text-fg-secondary">{`ID: ${order.id}`}</p>
            <p className="text-sm text-fg-secondary">
              {`Email: ${order.email ?? authQuery.customer?.email ?? "-"}`}
            </p>
            <p className="text-sm text-fg-secondary">
              {`Položky: ${resolveOrderItemCount(orderItems)}`}
            </p>
            <p className="text-sm text-fg-secondary">
              {`Aktualizované: ${formatOrderDate(order.updated_at)}`}
            </p>
          </article>
        </div>
      </section>

      <section className="space-y-300 rounded-xl border border-border-secondary bg-surface p-550">
        <h3 className="text-lg font-semibold">Položky objednávky</h3>
        <div className="overflow-x-auto">
          <Table size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Produkt</Table.ColumnHeader>
                <Table.ColumnHeader>Varianta</Table.ColumnHeader>
                <Table.ColumnHeader numeric>Množstvo</Table.ColumnHeader>
                <Table.ColumnHeader numeric>Cena za kus</Table.ColumnHeader>
                <Table.ColumnHeader numeric>Celkom</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orderItems.map((item) => {
                const quantity = typeof item.quantity === "number" ? item.quantity : 0;
                const lineTotal = resolveOrderItemTotalAmount(item);
                const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;

                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.title ?? "-"}</Table.Cell>
                    <Table.Cell>{item.variant_title ?? "-"}</Table.Cell>
                    <Table.Cell numeric>{String(quantity)}</Table.Cell>
                    <Table.Cell numeric>
                      {formatOrderAmount(unitPrice, order.currency_code)}
                    </Table.Cell>
                    <Table.Cell numeric>
                      {formatOrderAmount(lineTotal, order.currency_code)}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        </div>

        <LinkButton as={NextLink} href="/account/orders" theme="outlined" variant="secondary">
          Späť na objednávky
        </LinkButton>
      </section>
    </div>
  );
}
