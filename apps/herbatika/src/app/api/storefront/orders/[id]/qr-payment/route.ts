import { NextResponse } from "next/server";
import {
  buildMedusaUrl,
  getPublishableHeaders,
  parseResponseJson,
} from "../../../../storefront-auth/_lib";
import {
  getNotApplicableQrPaymentResponse,
  mapStoreOrderPaymentQr,
  ORDER_PAYMENT_QR_FIELDS,
  type StoreOrderResponse,
} from "@/lib/storefront/order-payment-qr-response";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(getNotApplicableQrPaymentResponse());
  }

  const medusaUrl = new URL(
    buildMedusaUrl(`/store/orders/${encodeURIComponent(id)}`),
  );
  medusaUrl.searchParams.set(
    "fields",
    ORDER_PAYMENT_QR_FIELDS.join(","),
  );

  try {
    const response = await fetch(medusaUrl, {
      cache: "no-store",
      headers: getPublishableHeaders(),
      method: "GET",
    });

    if (response.status === 404) {
      return NextResponse.json(getNotApplicableQrPaymentResponse());
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

    const qrPayment = await mapStoreOrderPaymentQr(
      (payload ?? {}) as StoreOrderResponse,
    );

    return NextResponse.json(qrPayment);
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
