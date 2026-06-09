import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { RouteFocusModal } from "../../../../components/common/modals/route-focus-modal/route-focus-modal"
import { useQuote } from "../../../../hooks/api/quotes"
import { translateBreadcrumb } from "../../../../lib/breadcrumb"
import { ManageQuoteForm } from "../../components"

export const handle = {
  breadcrumb: () =>
    translateBreadcrumb("quotes:sections.manageQuote", "Manage Quote"),
}

const QuoteManage = () => {
  const { t } = useTranslation("quotes")
  const { quoteId } = useParams()
  const { quote, isLoading } = useQuote(
    quoteId ?? "",
    {
      fields:
        "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
    },
    { enabled: Boolean(quoteId) }
  )

  if (isLoading) {
    return null
  }

  if (!quote) {
    throw new Error(t("validation.quoteNotFound"))
  }

  return (
    <RouteFocusModal>
      <ManageQuoteForm order={quote.draft_order} />
    </RouteFocusModal>
  )
}

export default QuoteManage
