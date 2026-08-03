import { Icon } from "@techsio/ui-kit/atoms/icon"

import { formatPrice } from "@/lib/format-price"

interface OrdersSummaryProps {
  totalAmount: number
  completedOrders: number
  pendingOrders: number
  numberOfOrders: number
}

export function OrdersSummary({
  totalAmount,
  completedOrders,
  pendingOrders,
  numberOfOrders,
}: OrdersSummaryProps) {
  return (
    <div className="mb-xl">
      <div className="mb-orders-header flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-semibold text-orders-fg-primary text-orders-header-size">
            Přehled objednávek
          </h1>
          <p className="text-orders-fg-secondary">
            Kompletní historie vašich nákupů
          </p>
        </div>
        <div className="flex items-center gap-orders-sm sm:block sm:text-right">
          <p className="text-orders-fg-secondary text-orders-md">
            Celková útrata
          </p>
          <p className="font-bold text-orders-price-size text-primary">
            {formatPrice(totalAmount, "CZK")}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-orders-summary border-t pt-md sm:flex-row sm:items-center">
        <div className="flex items-center gap-orders-sm">
          <Icon
            className="text-orders-fg-secondary"
            icon="icon-[mdi--shopping-outline]"
          />
          <span className="text-orders-md">
            <strong className="text-orders-fg-primary">{numberOfOrders}</strong>
            <span className="ml-orders-overlap text-orders-fg-secondary">
              objednávek celkem
            </span>
          </span>
        </div>
        <div className="hidden sm:block sm:text-orders-fg-secondary">•</div>
        <div className="flex items-center gap-orders-sm">
          <Icon
            className="text-orders-success"
            icon="icon-[mdi--check-circle-outline]"
          />
          <span className="text-orders-md">
            <strong className="text-orders-success">{completedOrders}</strong>
            <span className="ml-orders-overlap text-orders-fg-secondary">
              dokončených
            </span>
          </span>
        </div>
        <div className="hidden sm:block sm:text-orders-fg-secondary">•</div>
        <div className="flex items-center gap-orders-sm">
          <Icon
            className="text-orders-pending"
            icon="icon-[mdi--clock-outline]"
          />
          <span className="text-orders-md">
            <strong className="text-orders-pending">{pendingOrders}</strong>
            <span className="ml-orders-overlap text-orders-fg-secondary">
              zpracovávaných
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
