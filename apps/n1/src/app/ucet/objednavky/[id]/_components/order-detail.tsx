import type { StoreOrder } from "@medusajs/types"
import { getOrderPriceView } from "@/lib/pricing/cart-pricing"
import { formatDateString } from "@/utils/format/format-date"
import { ItemCard } from "./item-card"

type OrderDetailProps = {
  order: StoreOrder
}

export const OrderDetail = ({ order }: OrderDetailProps) => {
  const pricing = getOrderPriceView(order)
  const shippingMethodName = order.shipping_methods?.[0]?.name
  const showShippingRow = Boolean(shippingMethodName) || pricing.hasShipping
  const subtotalLabel = pricing.showTax ? "Cena bez DPH" : "Mezisoučet"
  const shippingValue = pricing.hasShipping ? pricing.shipping : "Zdarma"

  return (
    <div className="space-y-500">
      {/* Products Grid */}
      <div>
        <h2 className="mb-300 font-bold text-fg-primary text-lg">
          Objednané produkty
        </h2>
        <div className="grid grid-cols-1 gap-300 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-3">
          {order.items?.map((item) => (
            <ItemCard item={item} key={item.id} />
          ))}
        </div>
      </div>

      {/* Bottom Info Cards */}
      <div className="grid gap-400 md:grid-cols-2">
        {/* Payment Summary */}
        <div className="rounded border border-border-secondary bg-surface-light p-400">
          <h3 className="mb-300 font-semibold text-fg-primary text-lg">
            Platební přehled
          </h3>
          <div className="space-y-200">
            <div className="flex justify-between">
              <span className="text-fg-secondary">{subtotalLabel}</span>
              <span className="font-medium text-fg-primary">
                {pricing.itemsSubtotal}
              </span>
            </div>
            {pricing.showTax && (
              <div className="flex justify-between">
                <span className="text-fg-secondary">DPH</span>
                <span className="font-medium text-fg-primary">
                  {pricing.tax}
                </span>
              </div>
            )}
            {showShippingRow && (
              <div className="flex justify-between">
                <span className="text-fg-secondary">
                  {shippingMethodName
                    ? `Doprava (${shippingMethodName})`
                    : "Doprava"}
                </span>
                <span className="font-medium text-fg-primary">
                  {shippingValue}
                </span>
              </div>
            )}
            <div className="border-border-secondary border-t pt-200">
              <div className="flex justify-between">
                <span className="font-semibold text-fg-primary text-lg">
                  Celkem
                </span>
                <span className="font-bold text-fg-primary text-lg">
                  {pricing.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <div className="rounded border border-border-secondary bg-surface-light p-400">
          <h3 className="mb-300 font-semibold text-fg-primary text-lg">
            Detaily objednávky
          </h3>
          <div className="space-y-200">
            <div>
              <p className="text-fg-tertiary text-sm">ID objednávky</p>
              <p className="font-mono text-fg-primary text-sm">{order.id}</p>
            </div>
            <div>
              <p className="text-fg-tertiary text-sm">Vytvořeno</p>
              <p className="font-medium text-fg-primary">
                {formatDateString(order.created_at as string, {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {order.updated_at && (
              <div>
                <p className="text-fg-tertiary text-sm">Poslední aktualizace</p>
                <p className="font-medium text-fg-primary">
                  {formatDateString(order.updated_at as string, {
                    day: "numeric",
                    month: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}
            {order.email && (
              <div>
                <p className="text-fg-tertiary text-sm">E-mail</p>
                <p className="font-medium text-fg-primary">{order.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
