import type { AdminOrder } from "@medusajs/framework/types"
import { Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { formatAmount } from "../../../../utils/format-amount"

export const Cost = ({
  label,
  value,
  secondaryValue,
  tooltip,
}: {
  label: string
  value: string | number
  secondaryValue: string
  tooltip?: ReactNode
}) => (
  <div className="grid grid-cols-3 items-center">
    <Text leading="compact" size="small">
      {label} {tooltip}
    </Text>
    <div className="text-right">
      <Text leading="compact" size="small">
        {secondaryValue}
      </Text>
    </div>

    <div className="text-right">
      <Text leading="compact" size="small">
        {value}
      </Text>
    </div>
  </div>
)

export const CostBreakdown = ({ order }: { order: AdminOrder }) => {
  const { t } = useTranslation("quotes")
  const sortedShippingMethods: AdminOrder["shipping_methods"] = []

  for (const shippingMethod of order.shipping_methods) {
    const insertionIndex = sortedShippingMethods.findIndex(
      (candidate) =>
        String(shippingMethod.created_at).localeCompare(
          String(candidate.created_at),
        ) < 0,
    )
    sortedShippingMethods.splice(
      insertionIndex === -1 ? sortedShippingMethods.length : insertionIndex,
      0,
      shippingMethod,
    )
  }

  return (
    <div className="flex flex-col gap-y-2 px-6 py-4 text-ui-fg-subtle">
      <Cost
        label={t("cost.discounts")}
        secondaryValue=""
        value={
          order.discount_total > 0
            ? `- ${formatAmount(order.discount_total, order.currency_code)}`
            : "-"
        }
      />
      {sortedShippingMethods.map((sm) => (
        <div key={sm.id}>
          <Cost
            label={t("cost.shipping")}
            secondaryValue={sm.name}
            value={formatAmount(sm.total, order.currency_code)}
          />
        </div>
      ))}
    </div>
  )
}
