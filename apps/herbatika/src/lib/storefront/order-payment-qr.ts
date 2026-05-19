export const ORDER_QR_PAYMENT_PROVIDER_ID = "pp_system_default";

export type StorefrontOrderPaymentQr = {
  amount: number | null;
  currencyCode: string;
  iban: string;
  message: string | null;
  orderDisplayId: string;
  orderId: string;
  providerId: typeof ORDER_QR_PAYMENT_PROVIDER_ID;
  qrSvg: string;
  spayd: string;
  variableSymbol: string | null;
};

type StoreOrderPaymentQrResponse = {
  qr_payment?: {
    amount?: number | null;
    currency_code?: string | null;
    iban?: string | null;
    message?: string | null;
    order_display_id?: string | null;
    order_id?: string | null;
    provider_id?: string | null;
    qr_svg?: string | null;
    spayd?: string | null;
    variable_symbol?: string | null;
  } | null;
};

type FetchOrderPaymentQrOptions = {
  orderId: string;
};

export const fetchOrderPaymentQr = async ({
  orderId,
}: FetchOrderPaymentQrOptions): Promise<StorefrontOrderPaymentQr | null> => {
  const response = await fetch(
    `/api/storefront/orders/${encodeURIComponent(orderId)}/qr-payment`,
    { method: "GET" },
  );

  if (!response.ok) {
    throw new Error(`QR payment request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as StoreOrderPaymentQrResponse;

  return mapOrderPaymentQr(payload.qr_payment);
};

function mapOrderPaymentQr(
  qrPayment: StoreOrderPaymentQrResponse["qr_payment"],
): StorefrontOrderPaymentQr | null {
  if (
    !qrPayment ||
    qrPayment.provider_id !== ORDER_QR_PAYMENT_PROVIDER_ID ||
    typeof qrPayment.iban !== "string" ||
    typeof qrPayment.order_id !== "string" ||
    typeof qrPayment.qr_svg !== "string" ||
    typeof qrPayment.spayd !== "string"
  ) {
    return null;
  }

  return {
    amount:
      typeof qrPayment.amount === "number" && Number.isFinite(qrPayment.amount)
        ? qrPayment.amount
        : null,
    currencyCode: qrPayment.currency_code?.trim().toUpperCase() || "EUR",
    iban: qrPayment.iban,
    message: qrPayment.message ?? null,
    orderDisplayId: qrPayment.order_display_id ?? qrPayment.order_id,
    orderId: qrPayment.order_id,
    providerId: ORDER_QR_PAYMENT_PROVIDER_ID,
    qrSvg: qrPayment.qr_svg,
    spayd: qrPayment.spayd,
    variableSymbol: qrPayment.variable_symbol ?? null,
  };
}
