import "server-only";

import QRCode from "qrcode";
import {
  ORDER_PAYMENT_QR_METADATA_KEY,
  ORDER_QR_PAYMENT_PROVIDER_ID,
} from "./order-payment-qr.constants";

export const ORDER_PAYMENT_QR_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "total",
  "currency_code",
  "+metadata",
  "payment_collections.*",
  "payment_collections.payments.*",
];

export type StoreOrderResponse = {
  order?: {
    currency_code?: string | null;
    custom_display_id?: string | null;
    display_id?: number | string | null;
    id?: string | null;
    metadata?: Record<string, unknown> | null;
    payment_collections?: Array<{
      payments?: Array<{
        provider_id?: string | null;
      }> | null;
    }> | null;
    total?: number | null;
  } | null;
};

const NOT_APPLICABLE_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "not_applicable",
} as const;
const PENDING_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "pending",
} as const;
const UNAVAILABLE_QR_PAYMENT_RESPONSE = {
  qr_payment: null,
  status: "unavailable",
} as const;

export function getNotApplicableQrPaymentResponse() {
  return NOT_APPLICABLE_QR_PAYMENT_RESPONSE;
}

export async function mapStoreOrderPaymentQr(payload: StoreOrderResponse) {
  const order = payload.order;

  if (!order?.id || !isQrPaymentOrder(order)) {
    return NOT_APPLICABLE_QR_PAYMENT_RESPONSE;
  }

  const spayd = readString(order.metadata?.[ORDER_PAYMENT_QR_METADATA_KEY]);
  if (!spayd) {
    return PENDING_QR_PAYMENT_RESPONSE;
  }

  const qrSvg = await createQrSvg(spayd);
  if (!qrSvg) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE;
  }

  const spaydFields = parseSpaydFields(spayd);
  const iban = readString(spaydFields.ACC);
  if (!iban) {
    return UNAVAILABLE_QR_PAYMENT_RESPONSE;
  }

  const amount = readAmount(spaydFields.AM) ?? order.total ?? null;
  const currencyCode =
    readString(spaydFields.CC)?.toUpperCase() ??
    readString(order.currency_code)?.toUpperCase() ??
    "EUR";
  const orderDisplayId =
    readString(order.custom_display_id) ??
    readString(order.display_id) ??
    order.id;

  return {
    qr_payment: {
      amount,
      currency_code: currencyCode,
      iban,
      message: readString(spaydFields.MSG),
      order_display_id: orderDisplayId,
      order_id: order.id,
      provider_id: ORDER_QR_PAYMENT_PROVIDER_ID,
      qr_svg: qrSvg,
      spayd,
      variable_symbol: readString(spaydFields["X-VS"]),
    },
    status: "ready",
  } as const;
}

async function createQrSvg(spayd: string) {
  try {
    return await QRCode.toString(spayd, {
      errorCorrectionLevel: "M",
      margin: 4,
      type: "svg",
    });
  } catch {
    return null;
  }
}

function isQrPaymentOrder(order: NonNullable<StoreOrderResponse["order"]>) {
  return (order.payment_collections ?? []).some((collection) =>
    (collection.payments ?? []).some(
      (payment) => payment.provider_id === ORDER_QR_PAYMENT_PROVIDER_ID,
    ),
  );
}

function parseSpaydFields(spayd: string) {
  const fields: Record<string, string> = {};

  for (const part of spayd.split("*")) {
    const separatorIndex = part.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    fields[part.slice(0, separatorIndex)] = part.slice(separatorIndex + 1);
  }

  return fields;
}

function readString(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readAmount(value: unknown) {
  const normalized = readString(value);
  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}
