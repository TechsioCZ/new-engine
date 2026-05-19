import { NextResponse } from "next/server";
import {
  buildMedusaUrl,
  getPublishableHeaders,
  parseResponseJson,
} from "../../../../storefront-auth/_lib";
import { createQrSvg } from "@/lib/qr-code/svg";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const EMPTY_QR_PAYMENT_RESPONSE = { qr_payment: null };
const ORDER_PAYMENT_QR_METADATA_KEY = "payment_qr_spayd";
const ORDER_QR_PAYMENT_PROVIDER_ID = "pp_system_default";

type StoreOrderResponse = {
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

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(EMPTY_QR_PAYMENT_RESPONSE);
  }

  const medusaUrl = new URL(
    buildMedusaUrl(`/store/orders/${encodeURIComponent(id)}`),
  );
  medusaUrl.searchParams.set(
    "fields",
    [
      "id",
      "display_id",
      "custom_display_id",
      "total",
      "currency_code",
      "+metadata",
      "payment_collections.*",
      "payment_collections.payments.*",
    ].join(","),
  );

  try {
    const response = await fetch(medusaUrl, {
      cache: "no-store",
      headers: getPublishableHeaders(),
      method: "GET",
    });

    if (response.status === 404) {
      return NextResponse.json(EMPTY_QR_PAYMENT_RESPONSE);
    }

    const payload = await parseResponseJson(response);
    if (!response.ok) {
      return NextResponse.json(
        {
          message: "QR payment request failed.",
          details: payload ?? { status: response.status },
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      mapOrderPaymentQr((payload ?? {}) as StoreOrderResponse),
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "QR payment request failed.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}

function mapOrderPaymentQr(payload: StoreOrderResponse) {
  const order = payload.order;
  const spayd = readString(order?.metadata?.[ORDER_PAYMENT_QR_METADATA_KEY]);

  if (!order?.id || !spayd || !isQrPaymentOrder(order)) {
    return EMPTY_QR_PAYMENT_RESPONSE;
  }

  const qrSvg = createQrSvg(spayd);
  if (!qrSvg) {
    return EMPTY_QR_PAYMENT_RESPONSE;
  }

  const spaydFields = parseSpaydFields(spayd);
  const iban = readString(spaydFields.ACC);
  if (!iban) {
    return EMPTY_QR_PAYMENT_RESPONSE;
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
  };
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
