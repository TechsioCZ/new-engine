import type { HttpTypes } from "@medusajs/types"
import { Table } from "@techsio/ui-kit/organisms/table"
import { useTranslations } from "next-intl"
import {
  formatOrderAmount,
  resolveOrderItemOriginalTotalAmount,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
} from "@/lib/storefront/order-format"

type AccountOrderDetailItemsProps = {
  order: HttpTypes.StoreOrder
}

function OrderItemAmount({
  amount,
  currencyCode,
  originalAmount,
}: {
  amount: number
  currencyCode?: string | null
  originalAmount: number | null
}) {
  return (
    <span className="inline-flex flex-col items-end leading-tight">
      {originalAmount !== null ? (
        <span className="text-fg-tertiary text-xs line-through">
          {formatOrderAmount(originalAmount, currencyCode)}
        </span>
      ) : null}
      <span>{formatOrderAmount(amount, currencyCode)}</span>
    </span>
  )
}

export function AccountOrderDetailItems({
  order,
}: AccountOrderDetailItemsProps) {
  const tAuth = useTranslations("auth")
  const orderItems = order.items ?? []

  return (
    <section className="space-y-300 rounded-lg border border-border-secondary bg-surface p-550">
      <h3 className="font-semibold text-lg">
        {tAuth("account.orders.detail.items_title")}
      </h3>

      <div className="hidden overflow-x-auto lg:block">
        <Table size="sm" variant="line">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>
                {tAuth("account.orders.product")}
              </Table.ColumnHeader>
              <Table.ColumnHeader>
                {tAuth("account.orders.variant")}
              </Table.ColumnHeader>
              <Table.ColumnHeader numeric>
                {tAuth("account.orders.quantity")}
              </Table.ColumnHeader>
              <Table.ColumnHeader numeric>
                {tAuth("account.orders.unit_price")}
              </Table.ColumnHeader>
              <Table.ColumnHeader numeric>
                {tAuth("account.orders.total")}
              </Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {orderItems.length > 0 ? (
              orderItems.map((item) => {
                const quantity = resolveOrderItemQuantity(item)
                const lineTotal = resolveOrderItemTotalAmount(item)
                const originalLineTotal =
                  resolveOrderItemOriginalTotalAmount(item)
                const unitPrice =
                  quantity > 0 ? lineTotal / quantity : lineTotal
                const originalUnitPrice =
                  originalLineTotal !== null && quantity > 0
                    ? originalLineTotal / quantity
                    : null

                return (
                  <Table.Row key={item.id}>
                    <Table.Cell>{item.title ?? "-"}</Table.Cell>
                    <Table.Cell>{item.variant_title ?? "-"}</Table.Cell>
                    <Table.Cell numeric>{String(quantity)}</Table.Cell>
                    <Table.Cell numeric>
                      <OrderItemAmount
                        amount={unitPrice}
                        currencyCode={order.currency_code}
                        originalAmount={originalUnitPrice}
                      />
                    </Table.Cell>
                    <Table.Cell numeric>
                      <OrderItemAmount
                        amount={lineTotal}
                        currencyCode={order.currency_code}
                        originalAmount={originalLineTotal}
                      />
                    </Table.Cell>
                  </Table.Row>
                )
              })
            ) : (
              <Table.Row>
                <Table.Cell
                  className="py-350 text-fg-secondary text-sm"
                  colSpan={5}
                >
                  {tAuth("account.orders.no_items")}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>

      <div className="space-y-200 lg:hidden">
        {orderItems.length > 0 ? (
          orderItems.map((item) => {
            const quantity = resolveOrderItemQuantity(item)
            const lineTotal = resolveOrderItemTotalAmount(item)
            const originalLineTotal = resolveOrderItemOriginalTotalAmount(item)
            const unitPrice = quantity > 0 ? lineTotal / quantity : lineTotal
            const originalUnitPrice =
              originalLineTotal !== null && quantity > 0
                ? originalLineTotal / quantity
                : null

            return (
              <article
                className="space-y-100 rounded-md border border-border-secondary bg-base p-250"
                key={item.id}
              >
                <p className="font-medium text-fg-primary text-sm">
                  {item.title ?? "-"}
                </p>
                {item.variant_title && (
                  <p className="text-fg-secondary text-xs">
                    {item.variant_title}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-150 text-xs">
                  <p className="text-fg-secondary">
                    {tAuth("account.orders.quantity_value", {
                      count: quantity,
                    })}
                  </p>
                  <p className="text-end text-fg-secondary leading-tight">
                    {originalUnitPrice !== null ? (
                      <span className="block text-fg-tertiary line-through">
                        {formatOrderAmount(
                          originalUnitPrice,
                          order.currency_code
                        )}
                      </span>
                    ) : null}
                    <span className="block">
                      {tAuth("account.orders.unit_price_value", {
                        amount: formatOrderAmount(
                          unitPrice,
                          order.currency_code
                        ),
                      })}
                    </span>
                  </p>
                </div>
                <p className="font-semibold text-fg-primary text-sm">
                  <OrderItemAmount
                    amount={lineTotal}
                    currencyCode={order.currency_code}
                    originalAmount={originalLineTotal}
                  />
                </p>
              </article>
            )
          })
        ) : (
          <p className="text-fg-secondary text-sm">
            {tAuth("account.orders.no_items")}
          </p>
        )}
      </div>
    </section>
  )
}
