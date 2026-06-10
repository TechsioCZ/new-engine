import { CheckCircleSolid } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Text,
  Toaster,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  type LoaderFunctionArgs,
  type UIMatch,
  useNavigate,
  useParams,
} from "react-router-dom"
import type { StoreQuoteResponse } from "../../../../types"
import { JsonViewSection } from "../../../components/common/json-view-section"
import {
  useOrderPreview,
  useQuote,
  useRejectQuote,
  useSendQuote,
} from "../../../hooks/api"
import { translateBreadcrumb } from "../../../lib/breadcrumb"
import { sdk } from "../../../lib/sdk"
import { formatAmount } from "../../../utils"
import {
  CostBreakdown,
  QuoteDetailsHeader,
  QuoteItems,
  QuoteMessages,
  QuoteTotal,
} from "../components"

export async function loader({ params }: LoaderFunctionArgs) {
  const quoteId = params.quoteId

  if (!quoteId) {
    return { quote: undefined }
  }

  return sdk.client.fetch<StoreQuoteResponse>(`/admin/quotes/${quoteId}`, {
    query: {
      fields: "id",
    },
  })
}

export const handle = {
  breadcrumb: (match: UIMatch<StoreQuoteResponse>) =>
    match.data?.quote?.id ?? translateBreadcrumb("quotes:menuItem", "Quote"),
}

const QuoteDetails = () => {
  const { quoteId } = useParams()
  const [showSendQuote, setShowSendQuote] = useState(false)
  const [showRejectQuote, setShowRejectQuote] = useState(false)
  const prompt = usePrompt()
  const { t } = useTranslation("quotes")
  const navigate = useNavigate()
  const resolvedQuoteId = quoteId ?? ""
  const { quote, isLoading } = useQuote(
    resolvedQuoteId,
    {
      fields:
        "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
    },
    { enabled: Boolean(quoteId) }
  )

  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    quote?.draft_order_id ?? "",
    {},
    { enabled: Boolean(quote?.draft_order_id) }
  )

  const { mutateAsync: sendQuote, isPending: isSendingQuote } =
    useSendQuote(resolvedQuoteId)

  const { mutateAsync: rejectQuote } = useRejectQuote(resolvedQuoteId)

  useEffect(() => {
    if (
      ["pending_merchant", "customer_rejected"].includes(quote?.status ?? "")
    ) {
      setShowSendQuote(true)
    } else {
      setShowSendQuote(false)
    }

    if (
      ["customer_rejected", "merchant_rejected", "accepted"].includes(
        quote?.status ?? ""
      )
    ) {
      setShowRejectQuote(false)
    } else {
      setShowRejectQuote(true)
    }
  }, [quote])

  const handleSendQuote = async () => {
    const res = await prompt({
      title: t("prompts.sendTitle"),
      description: t("prompts.sendDescription"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      await sendQuote(undefined, {
        onSuccess: () => toast.success(t("toasts.quoteSent")),
        onError: (e) => toast.error(e.message),
      })
    }
  }

  const handleRejectQuote = async () => {
    const res = await prompt({
      title: t("prompts.rejectTitle"),
      description: t("prompts.rejectDescription"),
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      await rejectQuote(undefined, {
        onSuccess: () => toast.success(t("toasts.quoteRejected")),
        onError: (e) => toast.error(e.message),
      })
    }
  }

  if (isLoading || !quote) {
    return null
  }

  if (isPreviewLoading) {
    return null
  }

  if (!preview) {
    throw new Error(t("validation.previewNotFound"))
  }

  const quoteCustomer = quote.draft_order?.customer
  const quoteEmployee = (
    quoteCustomer as
      | (typeof quoteCustomer & {
          employee?: {
            company?: {
              currency_code?: string | null
              id?: string | null
              name?: string | null
            } | null
            spending_limit?: number | null
          } | null
        })
      | undefined
  )?.employee
  const quoteCompany = quoteEmployee?.company

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-x-4 lg:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-y-3">
          {quote.status === "accepted" && (
            <Container className="divide-y divide-dashed p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <Text className="txt-compact-small">
                  <CheckCircleSolid className="mr-2 inline-block text-green-500 text-lg" />
                  {t("toasts.quoteAcceptedReady")}
                </Text>

                <Button
                  onClick={() => navigate(`/orders/${quote.draft_order_id}`)}
                  size="small"
                >
                  {t("actions.viewOrder")}
                </Button>
              </div>
            </Container>
          )}

          <Container className="divide-y divide-dashed p-0">
            <QuoteDetailsHeader quote={quote} />
            <QuoteItems order={quote.draft_order} preview={preview} />
            <CostBreakdown order={quote.draft_order} />
            <QuoteTotal order={quote.draft_order} preview={preview} />

            {(showRejectQuote || showSendQuote) && (
              <div className="flex items-center justify-end gap-x-2 rounded-b-xl bg-ui-bg-subtle px-4 py-4">
                {showRejectQuote && (
                  <Button
                    disabled={isSendingQuote}
                    onClick={() => handleRejectQuote()}
                    size="small"
                    variant="secondary"
                  >
                    {t("actions.rejectQuote")}
                  </Button>
                )}

                {showSendQuote && (
                  <Button
                    disabled={isSendingQuote}
                    onClick={() => handleSendQuote()}
                    size="small"
                    variant="secondary"
                  >
                    {t("actions.sendQuote")}
                  </Button>
                )}
              </div>
            )}
          </Container>

          <QuoteMessages preview={preview} quote={quote} />

          <JsonViewSection data={quote} />
        </div>

        <div className="mt-2 flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[400px]">
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">{t("sections.customer")}</Heading>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                {t("customer.email")}
              </Text>

              <Link
                className="text-pretty text-blue-500 text-sm"
                onClick={(e) => e.stopPropagation()}
                to={`/customers/${quote.draft_order?.customer?.id}`}
              >
                {quote.draft_order?.customer?.email}
              </Link>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                {t("customer.phone")}
              </Text>

              <Text className="text-pretty" leading="compact" size="small">
                {quote.draft_order?.customer?.phone}
              </Text>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                {t("customer.spendingLimit")}
              </Text>

              <Text className="text-pretty" leading="compact" size="small">
                {formatAmount(
                  quoteEmployee?.spending_limit ?? 0,
                  quoteCompany?.currency_code ||
                    quote.draft_order?.currency_code ||
                    "USD"
                )}
              </Text>
            </div>
          </Container>

          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">{t("sections.company")}</Heading>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                {t("fields.name")}
              </Text>

              {quoteCompany?.id ? (
                <Link
                  className="text-pretty text-blue-500 text-sm"
                  onClick={(e) => e.stopPropagation()}
                  to={`/companies/${quoteCompany.id}`}
                >
                  {quoteCompany.name}
                </Link>
              ) : (
                <Text className="text-pretty" leading="compact" size="small">
                  {quoteCompany?.name ?? "-"}
                </Text>
              )}
            </div>
          </Container>
        </div>
      </div>

      <Toaster />
    </div>
  )
}

export default QuoteDetails
