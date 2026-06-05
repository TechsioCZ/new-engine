import type { HttpTypes } from "@medusajs/types";
import { Table } from "@techsio/ui-kit/organisms/table";
import {
  formatOrderAmount,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
} from "@/lib/storefront/order-format";

type StorefrontAccountOrderDetailItemsProps = {
  order: HttpTypes.StoreOrder;
};

export function StorefrontAccountOrderDetailItems({
  order,
}: StorefrontAccountOrderDetailItemsProps) {
  const orderItems = order.items ?? [];

  return (
    <section className="space-y-300 rounded-lg border border-border-secondary bg-surface p-550">
      <h3 className="text-lg font-semibold">Položky objednávky</h3>

      <div className="hidden overflow-x-auto lg:block">
        <Table size="sm" variant="line">
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
            {orderItems.length > 0 ? (
              orderItems.map((item) => {
                const quantity = resolveOrderItemQuantity(item);
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
              })
            ) : (
              <Table.Row>
                <Table.Cell className="py-350 text-fg-secondary text-sm" colSpan={5}>
                  Objednávka neobsahuje položky.
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      <div className="space-y-200 lg:hidden">
        {orderItems.length > 0 ? (
          orderItems.map((item) => {
            const quantity = resolveOrderItemQuantity(item);
            const lineTotal = resolveOrderItemTotalAmount(item);
            const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal;

            return (
              <article
                className="space-y-100 rounded-md border border-border-secondary bg-base p-250"
                key={item.id}
              >
                <p className="font-medium text-fg-primary text-sm">{item.title ?? "-"}</p>
                {item.variant_title && (
                  <p className="text-fg-secondary text-xs">{item.variant_title}</p>
                )}
                <div className="grid grid-cols-2 gap-150 text-xs">
                  <p className="text-fg-secondary">{`Množstvo: ${quantity}`}</p>
                  <p className="text-end text-fg-secondary">
                    {`Cena/ks: ${formatOrderAmount(unitPrice, order.currency_code)}`}
                  </p>
                </div>
                <p className="font-semibold text-fg-primary text-sm">
                  {formatOrderAmount(lineTotal, order.currency_code)}
                </p>
              </article>
            );
          })
        ) : (
          <p className="text-fg-secondary text-sm">Objednávka neobsahuje položky.</p>
        )}
      </div>
    </section>
  );
}
