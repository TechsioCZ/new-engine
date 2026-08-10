import { useTranslations } from "next-intl"
import Image from "next/image"

import { SupportingText } from "@/components/text/supporting-text"
import type { StorefrontOrderPaymentQr } from "@/lib/storefront/order-payment-qr"
import { formatCurrencyAmount } from "@/lib/storefront/price-format"

export const CheckoutPaymentQrPanel = ({
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
      <div className="grid w-fit gap-400 sm:checkout-payment-qr-layout">
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
