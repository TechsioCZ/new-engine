import type { AdminOrder, AdminOrderPreview } from "@medusajs/framework/types"
import { Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { formatAmount } from "../../../../utils"

export const QuoteTotal = ({
  order,
  preview,
}: {
  order: AdminOrder
  preview: AdminOrderPreview
}) => {
  const { t } = useTranslation("quotes")

  return (
    <div className="flex flex-col gap-y-2 px-6 py-4">
      <div className="flex items-center justify-between text-ui-fg-base">
        <Text
          className="text-ui-fg-subtle"
          leading="compact"
          size="small"
          weight="plus"
        >
          {t("sections.originalTotal")}
        </Text>
        <Text
          className="text-ui-fg-subtle"
          leading="compact"
          size="small"
          weight="plus"
        >
          {formatAmount(order.total, order.currency_code)}
        </Text>
      </div>

      <div className="flex items-center justify-between text-ui-fg-base">
        <Text
          className="text-semibold text-ui-fg-subtle"
          leading="compact"
          size="small"
          weight="plus"
        >
          {t("sections.quoteTotal")}
        </Text>
        <Text
          className="text-bold text-ui-fg-subtle"
          leading="compact"
          size="small"
          weight="plus"
        >
          {formatAmount(
            preview.summary.current_order_total,
            order.currency_code
          )}
        </Text>
      </div>
    </div>
  )
}
