"use client";

import { useQuery } from "@tanstack/react-query";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { SupportingText } from "@/components/text/supporting-text";
import {
  fetchOrderPaymentQr,
  type StorefrontOrderPaymentQr,
} from "@/lib/storefront/order-payment-qr";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

type CheckoutCompletedOrderSectionProps = {
  completedOrderId: string;
};

export function CheckoutCompletedOrderSection({
  completedOrderId,
}: CheckoutCompletedOrderSectionProps) {
  const qrPaymentQuery = useQuery({
    enabled: Boolean(completedOrderId),
    queryFn: () =>
      fetchOrderPaymentQr({
        orderId: completedOrderId,
      }),
    queryKey: ["checkout-order-payment-qr", completedOrderId],
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const qrPayment = qrPaymentQuery.data ?? null;
  const didResolveWithoutQrPayment =
    qrPaymentQuery.isSuccess &&
    !qrPaymentQuery.isFetching &&
    !qrPayment;

  return (
    <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-350">
      <h2 className="text-xl font-semibold text-fg-primary">
        Objednávka dokončená
      </h2>
      <StatusText showIcon status="success">
        {`Objednávka bola vytvorená (${completedOrderId}).`}
      </StatusText>

      {qrPaymentQuery.isFetching && !qrPayment ? (
        <SupportingText aria-live="polite">
          Pripravujeme QR údaje na bankový prevod.
        </SupportingText>
      ) : null}

      {qrPayment ? <CheckoutPaymentQrPanel qrPayment={qrPayment} /> : null}

      {qrPaymentQuery.isError || didResolveWithoutQrPayment ? (
        <StatusText showIcon size="sm" status="warning">
          QR platbu sa nepodarilo načítať. Platobné údaje nájdete aj v
          potvrdení objednávky.
        </StatusText>
      ) : null}

      <div className="flex flex-wrap gap-200">
        <LinkButton as={NextLink} href="/" size="sm">
          Pokračovať v nákupe
        </LinkButton>
        <LinkButton
          as={NextLink}
          href="/account"
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          Prejsť na účet
        </LinkButton>
      </div>
    </section>
  );
}

function CheckoutPaymentQrPanel({
  qrPayment,
}: {
  qrPayment: StorefrontOrderPaymentQr;
}) {
  const amountLabel =
    qrPayment.amount === null
      ? null
      : formatCurrencyAmount(qrPayment.amount, qrPayment.currencyCode);
  const detailRows = [
    { label: "Suma", value: amountLabel },
    { label: "IBAN", value: qrPayment.iban },
    { label: "Variabilný symbol", value: qrPayment.variableSymbol },
    { label: "Správa", value: qrPayment.message },
  ].filter((row): row is { label: string; value: string } =>
    Boolean(row.value),
  );

  return (
    <div className="border-t border-border-primary pt-300">
      <div className="grid gap-300 sm:grid-cols-2">
        <div className="flex justify-center sm:justify-start">
          <div
            aria-label={`QR kód pre platbu objednávky ${qrPayment.orderDisplayId}`}
            className="aspect-square w-950 max-w-full overflow-hidden rounded-sm border border-border-primary bg-surface p-200 [&_svg]:h-full [&_svg]:w-full"
            role="img"
            dangerouslySetInnerHTML={{ __html: qrPayment.qrSvg }}
          />
        </div>

        <div className="space-y-250">
          <div className="space-y-100">
            <h3 className="text-base font-semibold text-fg-primary">
              Platba bankovým prevodom
            </h3>
            <SupportingText>
              Naskenujte QR kód v bankovej aplikácii alebo použite platobné
              údaje nižšie.
            </SupportingText>
          </div>

          <dl className="grid gap-150">
            {detailRows.map((row) => (
              <div className="grid gap-50" key={row.label}>
                <dt className="text-xs font-medium uppercase text-fg-secondary">
                  {row.label}
                </dt>
                <dd className="break-all text-sm text-fg-primary">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
