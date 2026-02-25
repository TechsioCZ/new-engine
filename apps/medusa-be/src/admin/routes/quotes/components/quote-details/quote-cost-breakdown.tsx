import type { AdminOrder } from "@medusajs/framework/types"
import { Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import { formatAmount } from "../../../../utils"

export const CostBreakdown = ({ order }: { order: AdminOrder }) => (
  <div className="flex flex-col gap-y-2 px-6 py-4 text-ui-fg-subtle">
    <Cost
      label="Discounts"
      secondaryValue=""
      value={
        order.discount_total > 0
          ? `- ${formatAmount(order.discount_total, order.currency_code)}`
          : "-"
      }
    />
    {(order.shipping_methods || [])
      .sort((m1, m2) =>
        (m1.created_at as string).localeCompare(m2.created_at as string)
      )
      .map((sm, i) => (
        <div>
          <Cost
            key={sm.id}
            label={"Shipping"}
            secondaryValue={sm.name}
            value={formatAmount(sm.total, order.currency_code)}
          />
        </div>
      ))}
  </div>
)

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
