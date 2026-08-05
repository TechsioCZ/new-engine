import { StatusBadge } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

const StatusColors: Record<string, "green" | "orange" | "red" | "blue"> = {
  accepted: "green",
  customer_rejected: "orange",
  merchant_rejected: "red",
  pending_customer: "blue",
  pending_merchant: "blue",
}

export default function QuoteStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("quotes")

  return (
    <StatusBadge color={StatusColors[status]}>
      {t(`statuses.${status}`)}
    </StatusBadge>
  )
}
