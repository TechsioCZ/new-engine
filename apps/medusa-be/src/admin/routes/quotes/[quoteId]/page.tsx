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
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import type { LoaderFunctionArgs, UIMatch } from "react-router-dom"

import type { StoreQuoteResponse } from "../../../../types"
import { JsonViewSection } from "../../../components/common/json-view-section"
import { useOrderPreview } from "../../../hooks/api/order-preview"
import {
  useQuote,
  useRejectQuote,
  useSendQuote,
} from "../../../hooks/api/quotes"
import { translateBreadcrumb } from "../../../lib/breadcrumb"
import { sdk } from "../../../lib/sdk"
import { formatAmount } from "../../../utils/format-amount"
import { CostBreakdown } from "../components/quote-details/quote-cost-breakdown"
import { QuoteDetailsHeader } from "../components/quote-details/quote-details-header"
import { QuoteItems } from "../components/quote-details/quote-items"
import { QuoteTotal } from "../components/quote-details/quote-total"
import { QuoteMessages } from "../components/quote-messages"

const DEFAULT_CURRENCY_CODE = "USD"

const SEND_QUOTE_STATUSES = new Set(["customer_rejected", "pending_merchant"])

const REJECT_UNAVAILABLE_STATUSES = new Set([
  "accepted",
  "customer_rejected",
  "merchant_rejected",
])

interface QuoteCompanyView {
  currencyCode: string | null
  id: string | null
  name: string | null
}

interface QuoteEmployeeView {
  company: QuoteCompanyView | null
  spendingLimit: number | null
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value !== ""

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const readCompanyView = (value: unknown): QuoteCompanyView | null => {
  if (!isRecord(value)) {
    return null
  }

  const { currency_code: currencyCode, id, name } = value

  return {
    currencyCode: readString(currencyCode),
    id: readString(id),
    name: readString(name),
  }
}

/**
 * The quote detail request expands `draft_order.customer.employee.company`,
 * which the generated `AdminOrder` customer type does not describe. The
 * expansion is therefore read defensively instead of asserted.
 */
const readEmployeeView = (customer: unknown): QuoteEmployeeView | null => {
  if (!isRecord(customer)) {
    return null
  }

  const { employee } = customer

  if (!isRecord(employee)) {
    return null
  }

  const { company, spending_limit: spendingLimit } = employee

  return {
    company: readCompanyView(company),
    spendingLimit: typeof spendingLimit === "number" ? spendingLimit : null,
  }
}

const resolveCurrencyCode = (
  companyCurrencyCode: string | null | undefined,
  orderCurrencyCode: string | null | undefined,
): string => {
  if (isNonEmptyString(companyCurrencyCode)) {
    return companyCurrencyCode
  }

  if (isNonEmptyString(orderCurrencyCode)) {
    return orderCurrencyCode
  }

  return DEFAULT_CURRENCY_CODE
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { quoteId } = params

  if (quoteId === undefined || quoteId === "") {
    return { quote: null }
  }

  return await sdk.client.fetch<StoreQuoteResponse>(
    `/admin/quotes/${quoteId}`,
    {
      query: {
        fields: "id",
      },
    },
  )
}

export const handle = {
  breadcrumb: (match: UIMatch<StoreQuoteResponse>) =>
    match.data?.quote?.id ?? translateBreadcrumb("quotes:menuItem", "Quote"),
}

const QuoteAcceptedBanner = ({ draftOrderId }: { draftOrderId: string }) => {
  const { t } = useTranslation("quotes")

  return (
    <Container className="divide-y divide-dashed p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text className="txt-compact-small">
          <CheckCircleSolid className="mr-2 inline-block text-green-500 text-lg" />
          {t("toasts.quoteAcceptedReady")}
        </Text>

        <Button asChild size="small">
          <Link to={`/orders/${draftOrderId}`}>{t("actions.viewOrder")}</Link>
        </Button>
      </div>
    </Container>
  )
}

const QuoteActionsFooter = ({
  isSendingQuote,
  onRejectQuote,
  onSendQuote,
  showRejectQuote,
  showSendQuote,
}: {
  isSendingQuote: boolean
  onRejectQuote: () => void
  onSendQuote: () => void
  showRejectQuote: boolean
  showSendQuote: boolean
}) => {
  const { t } = useTranslation("quotes")

  if (!(showRejectQuote || showSendQuote)) {
    return null
  }

  return (
    <div className="flex items-center justify-end gap-x-2 rounded-b-xl bg-ui-bg-subtle px-4 py-4">
      {showRejectQuote && (
        <Button
          disabled={isSendingQuote}
          onClick={onRejectQuote}
          size="small"
          variant="secondary"
        >
          {t("actions.rejectQuote")}
        </Button>
      )}

      {showSendQuote && (
        <Button
          disabled={isSendingQuote}
          onClick={onSendQuote}
          size="small"
          variant="secondary"
        >
          {t("actions.sendQuote")}
        </Button>
      )}
    </div>
  )
}

const QuoteCustomerSection = ({
  currencyCode,
  customerEmail,
  customerId,
  customerPhone,
  spendingLimit,
}: {
  currencyCode: string
  customerEmail: string | null | undefined
  customerId: string | null | undefined
  customerPhone: string | null | undefined
  spendingLimit: number
}) => {
  const { t } = useTranslation("quotes")

  return (
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
          onClick={(e) => {
            e.stopPropagation()
          }}
          to={`/customers/${customerId}`}
        >
          {customerEmail}
        </Link>
      </div>

      <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
        <Text leading="compact" size="small" weight="plus">
          {t("customer.phone")}
        </Text>

        <Text className="text-pretty" leading="compact" size="small">
          {customerPhone}
        </Text>
      </div>

      <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
        <Text leading="compact" size="small" weight="plus">
          {t("customer.spendingLimit")}
        </Text>

        <Text className="text-pretty" leading="compact" size="small">
          {formatAmount(spendingLimit, currencyCode)}
        </Text>
      </div>
    </Container>
  )
}

const QuoteCompanySection = ({
  company,
}: {
  company: QuoteCompanyView | null
}) => {
  const { t } = useTranslation("quotes")
  const companyId = company?.id

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("sections.company")}</Heading>
      </div>

      <div className="grid grid-cols-2 items-start px-6 py-4 text-ui-fg-subtle">
        <Text leading="compact" size="small" weight="plus">
          {t("fields.name")}
        </Text>

        {isNonEmptyString(companyId) ? (
          <Link
            className="text-pretty text-blue-500 text-sm"
            onClick={(e) => {
              e.stopPropagation()
            }}
            to={`/companies/${companyId}`}
          >
            {company?.name}
          </Link>
        ) : (
          <Text className="text-pretty" leading="compact" size="small">
            {company?.name ?? "-"}
          </Text>
        )}
      </div>
    </Container>
  )
}

const QuoteDetails = () => {
  const { quoteId } = useParams()
  const prompt = usePrompt()
  const { t } = useTranslation("quotes")
  const resolvedQuoteId = quoteId ?? ""
  const { quote, isLoading } = useQuote(
    resolvedQuoteId,
    {
      fields:
        "*draft_order.customer,*draft_order.customer.employee,*draft_order.customer.employee.company",
    },
    { enabled: Boolean(quoteId) },
  )

  const { order: preview, isLoading: isPreviewLoading } = useOrderPreview(
    quote?.draft_order_id ?? "",
    {},
    { enabled: Boolean(quote?.draft_order_id) },
  )

  const { mutateAsync: sendQuote, isPending: isSendingQuote } =
    useSendQuote(resolvedQuoteId)

  const { mutateAsync: rejectQuote } = useRejectQuote(resolvedQuoteId)

  const handleSendQuote = async () => {
    const res = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.continue"),
      description: t("prompts.sendDescription"),
      title: t("prompts.sendTitle"),
      variant: "confirmation",
    })

    if (res) {
      await sendQuote(undefined, {
        onError: (e) => {
          toast.error(e.message)
        },
        onSuccess: () => {
          toast.success(t("toasts.quoteSent"))
        },
      })
    }
  }

  const handleRejectQuote = async () => {
    const res = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.continue"),
      description: t("prompts.rejectDescription"),
      title: t("prompts.rejectTitle"),
      variant: "confirmation",
    })

    if (res) {
      await rejectQuote(undefined, {
        onError: (e) => {
          toast.error(e.message)
        },
        onSuccess: () => {
          toast.success(t("toasts.quoteRejected"))
        },
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

  const orderCustomer = quote.draft_order?.customer
  const quoteEmployee = readEmployeeView(orderCustomer)
  const quoteCompany = quoteEmployee?.company ?? null

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-x-4 lg:flex-row xl:items-start">
        <div className="flex w-full flex-col gap-y-3">
          {quote.status === "accepted" && (
            <QuoteAcceptedBanner draftOrderId={quote.draft_order_id} />
          )}

          <Container className="divide-y divide-dashed p-0">
            <QuoteDetailsHeader quote={quote} />
            <QuoteItems order={quote.draft_order} preview={preview} />
            <CostBreakdown order={quote.draft_order} />
            <QuoteTotal order={quote.draft_order} preview={preview} />

            <QuoteActionsFooter
              isSendingQuote={isSendingQuote}
              onRejectQuote={() => {
                void handleRejectQuote()
              }}
              onSendQuote={() => {
                void handleSendQuote()
              }}
              showRejectQuote={!REJECT_UNAVAILABLE_STATUSES.has(quote.status)}
              showSendQuote={SEND_QUOTE_STATUSES.has(quote.status)}
            />
          </Container>

          <QuoteMessages preview={preview} quote={quote} />

          <JsonViewSection data={quote} />
        </div>

        <div className="mt-2 flex w-full max-w-[100%] flex-col gap-y-3 xl:mt-0 xl:max-w-[400px]">
          <QuoteCustomerSection
            currencyCode={resolveCurrencyCode(
              quoteCompany?.currencyCode,
              quote.draft_order?.currency_code,
            )}
            customerEmail={orderCustomer?.email}
            customerId={orderCustomer?.id}
            customerPhone={orderCustomer?.phone}
            spendingLimit={quoteEmployee?.spendingLimit ?? 0}
          />

          <QuoteCompanySection company={quoteCompany} />
        </div>
      </div>

      <Toaster />
    </div>
  )
}

export default QuoteDetails
