import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { formatCountLabel } from "../../utils/format"
import {
  type DashboardTabCount,
  ORDER_DASHBOARD_VIEW_ITEMS,
  type OrderDashboardViewId,
} from "../model/views"

export function OrderDashboardTabs({
  countsByView,
  onValueChange,
  value,
}: {
  countsByView: Map<OrderDashboardViewId, DashboardTabCount>
  onValueChange: (value: string) => void
  value: OrderDashboardViewId
}) {
  return (
    <Tabs onValueChange={onValueChange} size="sm" value={value} variant="line">
      <Tabs.List>
        {ORDER_DASHBOARD_VIEW_ITEMS.map((item) => {
          const tabCount = countsByView.get(item.value)

          return (
            <Tabs.Trigger
              className="min-w-max gap-100 whitespace-nowrap"
              key={item.value}
              value={item.value}
            >
              <span>{item.label}</span>
              <Badge size="sm" variant="outline">
                {tabCount
                  ? formatCountLabel(tabCount.count, tabCount.countExact)
                  : "..."}
              </Badge>
            </Tabs.Trigger>
          )
        })}
        <Tabs.Indicator />
      </Tabs.List>
    </Tabs>
  )
}
