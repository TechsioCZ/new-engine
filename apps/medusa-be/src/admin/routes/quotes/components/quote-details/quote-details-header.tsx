import { EllipsisHorizontal, PencilSquare } from "@medusajs/icons"
import { DropdownMenu, Heading, IconButton } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { AdminQuoteResponse } from "../../../../../types"
import QuoteStatusBadge from "../quote-status-badge"

export const QuoteDetailsHeader = ({
  quote,
}: {
  quote: AdminQuoteResponse["quote"]
}) => {
  const { t } = useTranslation("quotes")
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Heading level="h2">{t("sections.quoteSummary")}</Heading>

      <div className="flex items-center gap-x-4">
        <div className="flex items-center gap-x-1.5">
          <QuoteStatusBadge status={quote.status} />
        </div>

        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton variant="transparent">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              className="gap-x-2"
              disabled={
                ![
                  "pending_merchant",
                  "customer_rejected",
                  "merchant_rejected",
                ].includes(quote.status)
              }
              onClick={() => navigate("manage")}
            >
              <PencilSquare />
              {t("actions.manage")}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>
    </div>
  )
}
