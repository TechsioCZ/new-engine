"use client"

import { useQuery } from "@tanstack/react-query"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { useEffect, useState } from "react"

import NextLink from "@/components/app-link"
import { SupportingText } from "@/components/text/supporting-text"
import { fetchOrderPaymentQr } from "@/lib/storefront/order-payment-qr"
import type { StorefrontOrderPaymentQr } from "@/lib/storefront/order-payment-qr"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

const CheckoutPaymentQrPanel = ({
  qrPayment,
}: {
  qrPayment: StorefrontOrderPaymentQr
}) => {
  const tCheckout = useTranslations("checkout")
  const amountLabel =
    qrPayment.amount === null
      ? null
      : formatCurrencyAmount(qrPayment.amount, qrPayment.currencyCode)
  const detailRows = [
    {
      id: "amount",
      label: tCheckout("completed_order_qr_amount"),
      value: amountLabel,
    },
    {
      id: "iban",
      label: tCheckout("completed_order_qr_iban"),
      value: qrPayment.iban,
    },
    {
      id: "reference",
      label: tCheckout("completed_order_qr_reference"),
      value: qrPayment.variableSymbol,
    },
    {
      id: "message",
      label: tCheckout("completed_order_qr_message"),
      value: qrPayment.message,
    },
  ].filter((row): row is { id: string; label: string; value: string } =>
    Boolean(row.value),
  )

  return (
    <div className="border-border-primary border-t pt-300">
      <div className="grid w-fit gap-400 sm:grid-cols-[1fr_auto]">
        <div className="flex justify-center sm:justify-start">
          <Image
            alt={tCheckout("completed_order_qr_aria", {
              orderDisplayId: qrPayment.orderDisplayId,
            })}
            className="aspect-square w-950 max-w-full rounded-sm border border-border-primary bg-surface p-200"
            height={380}
            src={`data:image/svg+xml,${encodeURIComponent(qrPayment.qrSvg)}`}
            unoptimized
            width={380}
          />
        </div>

        <div className="space-y-250">
          <div className="space-y-100">
            <h3 className="font-semibold text-base text-fg-primary">
              {tCheckout("completed_order_bank_transfer_title")}
            </h3>
            <SupportingText>
              {tCheckout("completed_order_bank_transfer_instructions")}
            </SupportingText>
          </div>

          <dl className="grid gap-150">
            {detailRows.map((row) => (
              <div className="grid gap-50" key={row.id}>
                <dt className="font-medium text-fg-secondary text-xs uppercase">
                  {row.label}
                </dt>
                <dd className="break-all text-fg-primary text-sm">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

interface CheckoutCompletedOrderSectionProps {
  completedOrderId: string
}

const QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS = 1500
const QR_PAYMENT_PENDING_TIMEOUT_MS = 15_000

export const CheckoutCompletedOrderSection = ({
  completedOrderId,
}: CheckoutCompletedOrderSectionProps) => {
  const tCheckout = useTranslations("checkout")
  const [timedOutOrderId, setTimedOutOrderId] = useState<string | null>(null)
  const hasQrPaymentPendingTimedOut = timedOutOrderId === completedOrderId
  const qrPaymentQuery = useQuery({
    enabled: Boolean(completedOrderId),
    queryFn: async () =>
      await fetchOrderPaymentQr({
        orderId: completedOrderId,
      }),
    queryKey: ["checkout-order-payment-qr", completedOrderId],
    refetchInterval: (query) =>
      query.state.data?.status === "pending" && !hasQrPaymentPendingTimedOut
        ? QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS
        : false,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const qrPaymentStatus = qrPaymentQuery.data?.status
  const qrPayment = qrPaymentQuery.data?.qrPayment ?? null
  const isPendingQrPayment =
    qrPaymentStatus === "pending" && !hasQrPaymentPendingTimedOut
  const isQrPaymentFetchPending =
    qrPaymentQuery.isFetching && qrPayment === null
  const canContinuePreparingQrPayment =
    qrPaymentStatus !== "not_applicable" && !hasQrPaymentPendingTimedOut
  const isPreparingQrPayment =
    (isQrPaymentFetchPending && canContinuePreparingQrPayment) ||
    isPendingQrPayment
  const didQrPaymentFail =
    qrPaymentQuery.isError ||
    qrPaymentStatus === "unavailable" ||
    (qrPaymentStatus === "pending" && hasQrPaymentPendingTimedOut)

  useEffect(() => {
    let timeout: number | null = null
    if (qrPaymentStatus === "pending" && timedOutOrderId !== completedOrderId) {
      timeout = window.setTimeout(() => {
        setTimedOutOrderId(completedOrderId)
      }, QR_PAYMENT_PENDING_TIMEOUT_MS)
    }

    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout)
      }
    }
  }, [completedOrderId, qrPaymentStatus, timedOutOrderId])

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-400">
      <section className="mx-auto max-w-2xl space-y-300 rounded-sm border border-border-primary bg-surface p-350">
        <h2 className="font-semibold text-fg-primary text-xl">
          {tCheckout("completed_order_title")}
        </h2>
        <StatusText showIcon status="success">
          {tCheckout("completed_order_created", {
            orderId: completedOrderId,
          })}
        </StatusText>

        {isPreparingQrPayment ? (
          <SupportingText aria-live="polite">
            {tCheckout("completed_order_qr_preparing")}
          </SupportingText>
        ) : null}

        {qrPayment ? <CheckoutPaymentQrPanel qrPayment={qrPayment} /> : null}

        {didQrPaymentFail ? (
          <StatusText showIcon size="sm" status="warning">
            {tCheckout("completed_order_qr_failed")}
          </StatusText>
        ) : null}
      </section>
      <div className="flex w-full flex-wrap gap-200">
        <LinkButton as={NextLink} href="/" size="md">
          {tCheckout("completed_order_continue_shopping")}
        </LinkButton>
        <LinkButton
          as={NextLink}
          href="/account"
          size="md"
          theme="outlined"
          variant="secondary"
        >
          {tCheckout("completed_order_go_to_account")}
        </LinkButton>
      </div>
    </section>
  )
}
