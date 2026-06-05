"use client";

import { useQuery } from "@tanstack/react-query";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { SupportingText } from "@/components/text/supporting-text";
import { routes } from "@/lib/routes";
import {
  fetchOrderPaymentQr,
  type StorefrontOrderPaymentQr,
} from "@/lib/storefront/order-payment-qr";
import { formatCurrencyAmount } from "@/lib/storefront/price-format";

type CheckoutCompletedOrderSectionProps = {
  completedOrderId: string;
  contactEmail?: string;
};

const QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS = 1500;
const QR_PAYMENT_PENDING_TIMEOUT_MS = 15_000;

export function CheckoutCompletedOrderSection({
  completedOrderId,
  contactEmail,
}: CheckoutCompletedOrderSectionProps) {
  const [hasQrPaymentPendingTimedOut, setHasQrPaymentPendingTimedOut] =
    useState(false);
  const normalizedContactEmail = contactEmail?.trim();
  const qrPaymentQuery = useQuery({
    enabled: Boolean(completedOrderId),
    queryFn: () =>
      fetchOrderPaymentQr({
        orderId: completedOrderId,
      }),
    queryKey: ["checkout-order-payment-qr", completedOrderId],
    refetchInterval: (query) =>
      query.state.data?.status === "pending" && !hasQrPaymentPendingTimedOut
        ? QR_PAYMENT_PENDING_REFETCH_INTERVAL_MS
        : false,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const qrPaymentStatus = qrPaymentQuery.data?.status;
  const qrPayment = qrPaymentQuery.data?.qrPayment ?? null;
  const isPendingQrPayment =
    qrPaymentStatus === "pending" && !hasQrPaymentPendingTimedOut;
  const isPreparingQrPayment =
    (qrPaymentQuery.isFetching &&
      !qrPayment &&
      qrPaymentStatus !== "not_applicable" &&
      !hasQrPaymentPendingTimedOut) ||
    isPendingQrPayment;
  const didQrPaymentFail =
    qrPaymentQuery.isError ||
    qrPaymentStatus === "unavailable" ||
    (qrPaymentStatus === "pending" && hasQrPaymentPendingTimedOut);

  useEffect(() => {
    if (qrPaymentStatus !== "pending") {
      setHasQrPaymentPendingTimedOut(false);
      return;
    }

    setHasQrPaymentPendingTimedOut(false);
    const timeout = window.setTimeout(() => {
      setHasQrPaymentPendingTimedOut(true);
    }, QR_PAYMENT_PENDING_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [completedOrderId, qrPaymentStatus]);

  return (
    <section className="max-w-2xl mx-auto flex flex-col gap-400">
      <section className="space-y-300 rounded-sm border border-border-primary bg-surface p-350 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-fg-primary">
          Objednávka dokončená
        </h2>
        <StatusText showIcon status="success">
          {`Objednávka bola vytvorená (${completedOrderId}).`}
        </StatusText>

        <div className="space-y-150 border-border-secondary border-t pt-250">
          <h3 className="font-semibold text-base text-fg-primary">
            Čo bude nasledovať
          </h3>
          <ul className="space-y-100 text-fg-secondary text-sm leading-relaxed">
            <li>
              {normalizedContactEmail ? (
                <>
                  Potvrdenie objednávky odošleme na{" "}
                  <span className="font-medium text-fg-primary">
                    {normalizedContactEmail}
                  </span>
                  .
                </>
              ) : (
                "Potvrdenie objednávky odošleme na e-mail z objednávky."
              )}
            </li>
            <li>
              Pri komunikácii so zákazníckou podporou použite ID objednávky{" "}
              <span className="font-medium text-fg-primary">
                {completedOrderId}
              </span>
              .
            </li>
            <li>
              Ak je zvolený bankový prevod, platobné údaje sú dostupné nižšie
              aj v potvrdení objednávky.
            </li>
          </ul>
        </div>

        {isPreparingQrPayment ? (
          <SupportingText aria-live="polite">
            Pripravujeme QR údaje na bankový prevod.
          </SupportingText>
        ) : null}

        {qrPayment ? <CheckoutPaymentQrPanel qrPayment={qrPayment} /> : null}

        {didQrPaymentFail ? (
          <StatusText showIcon size="sm" status="warning">
            QR platbu sa nepodarilo načítať. Platobné údaje nájdete aj v
            potvrdení objednávky.
          </StatusText>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-200 w-full">
        <LinkButton as={NextLink} href={routes.home} size="md">
          Pokračovať v nákupe
        </LinkButton>
        <LinkButton
          as={NextLink}
          href={routes.account.index}
          size="md"
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
      <div className="grid gap-400 sm:grid-cols-[1fr_auto] w-fit">
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
