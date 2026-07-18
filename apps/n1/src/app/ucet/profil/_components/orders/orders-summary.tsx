import { Icon } from "@techsio/ui-kit/atoms/icon"

import { formatAmount } from "@/utils/format/format-product"

type OrdersSummaryProps = {
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
    <div className="mb-600">
      <div className="mb-400 flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-semibold text-fg-primary text-xl">
            Přehled objednávek
          </h1>
          <p className="text-fg-secondary">Kompletní historie vašich nákupů</p>
        </div>
        <div className="flex items-center gap-200 sm:block sm:text-right">
          <p className="text-fg-secondary text-sm">Celková útrata</p>
          <p className="font-bold text-lg">{formatAmount(totalAmount)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-200 border-border-secondary border-t pt-300 sm:flex-row sm:items-center sm:gap-400">
        <div className="flex items-center gap-200">
          <Icon icon="token-icon-shopping" />
          <span className="text-sm">
            <strong>{numberOfOrders}</strong>
            <span className="ml-100 text-fg-secondary">objednávek celkem</span>
          </span>
        </div>
        <span className="hidden text-fg-secondary sm:block">•</span>
        <div className="flex items-center gap-200">
          <Icon icon="token-icon-check-circle" />
          <span className="text-sm">
            <strong>{completedOrders}</strong>
            <span className="ml-100 text-fg-secondary">dokončených</span>
          </span>
        </div>
        <span className="hidden text-fg-secondary sm:block">•</span>
        <div className="flex items-center gap-200">
          <Icon icon="token-icon-clock" />
          <span className="text-sm">
            <strong>{pendingOrders}</strong>
            <span className="ml-100 text-fg-secondary">zpracovávaných</span>
          </span>
        </div>
      </div>
    </div>
  )
}
