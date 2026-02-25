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
import { Link, useNavigate, useParams } from "react-router-dom"
import { JsonViewSection } from "../../../components/common/json-view-section"
import { useOrderPreview } from "../../../hooks/api"
import {
  useQuote,
  useRejectQuote,
  useSendQuote,
} from "../../../hooks/api/quotes"
import { formatAmount } from "../../../utils"
import {
  CostBreakdown,
  QuoteDetailsHeader,
  QuoteItems,
  QuoteTotal,
} from "../components/quote-details"
import { QuoteMessages } from "../components/quote-messages"

const QuoteDetails = () => {
  const { quoteId } = useParams()
  const [showSendQuote, setShowSendQuote] = useState(false)
  const [showRejectQuote, setShowRejectQuote] = useState(false)
  const prompt = usePrompt()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quote, isLoading } = useQuote(quoteId!, {
    fields:
      "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
  })

  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    quote?.draft_order_id!,
    {},
    { enabled: !!quote?.draft_order_id }
  )

  const { mutateAsync: sendQuote, isPending: isSendingQuote } = useSendQuote(
    quoteId!
  )

  const { mutateAsync: rejectQuote, isPending: isRejectingQuote } =
    useRejectQuote(quoteId!)

  useEffect(() => {
    if (["pending_merchant", "customer_rejected"].includes(quote?.status!)) {
      setShowSendQuote(true)
    } else {
      setShowSendQuote(false)
    }

    if (
      ["customer_rejected", "merchant_rejected", "accepted"].includes(
        quote?.status!
      )
    ) {
      setShowRejectQuote(false)
    } else {
      setShowRejectQuote(true)
    }
  }, [quote])

  const handleSendQuote = async () => {
    const res = await prompt({
      title: "Send quote?",
      description:
        "You are about to send this quote to the customer. Do you want to continue?",
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      await sendQuote(
        {},
        {
          onSuccess: () => toast.success("Successfully sent quote to customer"),
          onError: (e) => toast.error(e.message),
        }
      )
    }
  }

  const handleRejectQuote = async () => {
    const res = await prompt({
      title: "Reject quote?",
      description:
        "You are about to reject this customer's quote. Do you want to continue?",
      confirmText: t("actions.continue"),
      cancelText: t("actions.cancel"),
      variant: "confirmation",
    })

    if (res) {
      await rejectQuote(void 0, {
        onSuccess: () =>
          toast.success("Successfully rejected customer's quote"),
        onError: (e) => toast.error(e.message),
      })
    }
  }

  if (isLoading || !quote) {
    return <></>
  }

  if (isPreviewLoading) {
    return <></>
  }

  if (!(isPreviewLoading || preview)) {
    throw "preview not found"
  }

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-x-4 lg:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-y-3">
          {quote.status === "accepted" && (
            <Container className="divide-y divide-dashed p-0">
              <div className="flex items-center justify-between px-6 py-4">
                <Text className="txt-compact-small">
                  <CheckCircleSolid className="mr-2 inline-block text-green-500 text-lg" />
                  Quote accepted by customer. Order is ready for processing.
                </Text>

                <Button
                  onClick={() => navigate(`/orders/${quote.draft_order_id}`)}
                  size="small"
                >
                  View Order
                </Button>
              </div>
            </Container>
          )}

          <Container className="divide-y divide-dashed p-0">
            <QuoteDetailsHeader quote={quote} />
            <QuoteItems order={quote.draft_order} preview={preview!} />
            <CostBreakdown order={quote.draft_order} />
            <QuoteTotal order={quote.draft_order} preview={preview!} />

            {(showRejectQuote || showSendQuote) && (
              <div className="flex items-center justify-end gap-x-2 rounded-b-xl bg-ui-bg-subtle px-4 py-4">
                {showRejectQuote && (
                  <Button
                    disabled={isSendingQuote}
                    onClick={() => handleRejectQuote()}
                    size="small"
                    variant="secondary"
                  >
                    Reject Quote
                  </Button>
                )}

                {showSendQuote && (
                  <Button
                    disabled={isSendingQuote}
                    onClick={() => handleSendQuote()}
                    size="small"
                    variant="secondary"
                  >
                    Send Quote
                  </Button>
                )}
              </div>
            )}
          </Container>

          <QuoteMessages preview={preview!} quote={quote} />

          <JsonViewSection data={quote} />
        </div>

        <div className="mt-2 flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[400px]">
          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Customer</Heading>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                Email
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
                Phone
              </Text>

              <Text className="text-pretty" leading="compact" size="small">
                {quote.draft_order?.customer?.phone}
              </Text>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                Spending Limit
              </Text>

              <Text className="text-pretty" leading="compact" size="small">
                {formatAmount(
                  quote?.customer?.employee?.spending_limit,
                  (quote?.customer?.employee?.company
                    ?.currency_code as string) || "USD"
                )}
              </Text>
            </div>
          </Container>

          <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">Company</Heading>
            </div>

            <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
              <Text leading="compact" size="small" weight="plus">
                Name
              </Text>

              <Link
                className="text-pretty text-blue-500 text-sm"
                onClick={(e) => e.stopPropagation()}
                to={`/companies/${quote?.customer?.employee?.company.id}`}
              >
                {quote?.customer?.employee?.company?.name}
              </Link>
            </div>
          </Container>
        </div>
      </div>

      <Toaster />
    </div>
  )
}

export default QuoteDetails
