import { NextResponse } from "next/server"
import {
  fetchPrivateFlow,
  readAuthToken,
  readUpstreamJson,
} from "@/app/api/storefront/checkout/_lib"
import {
  buildMedusaUrl,
  getPublishableHeaders,
  parseResponseJson,
  requireStorefrontMarketBinding,
} from "@/app/api/storefront-auth/_lib"
import {
  mapStoreOrderPaymentQr,
  ORDER_PAYMENT_QR_FIELDS,
  type StoreOrderResponse,
} from "@/lib/storefront/order-payment-qr-response"

type RouteContext = {
  params: Promise<{ id: string }>
}

const PRIVATE_NO_STORE_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  expires: "0",
  pragma: "no-cache",
} as const

const genericFailure = () =>
  NextResponse.json(
    { message: "Order payment details unavailable." },
    { headers: PRIVATE_NO_STORE_HEADERS, status: 404 }
  )

const privateJson = <TBody>(body: TBody) =>
  NextResponse.json(body, { headers: PRIVATE_NO_STORE_HEADERS })

const readGuestOrderToken = async (
  request: Request
): Promise<string | null | undefined> => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return null
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null
  }

  const record = payload as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.some((key) => key !== "order_token") || keys.length > 1) {
    return null
  }

  if (!Object.hasOwn(record, "order_token")) {
    return
  }

  const token = record.order_token
  return typeof token === "string" &&
    token.length > 0 &&
    token.length <= 512 &&
    token === token.trim() &&
    !token.includes("\0")
    ? token
    : null
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    if (!id || id.length > 256 || id !== id.trim() || id.includes("\0")) {
      return genericFailure()
    }

    const binding = requireStorefrontMarketBinding(request)
    const orderToken = await readGuestOrderToken(request)
    const authToken = readAuthToken(request)
    if (orderToken === null || !(orderToken || authToken)) {
      return genericFailure()
    }

    const accessHeaders: Record<string, string> = {}
    if (authToken) {
      accessHeaders.authorization = `Bearer ${authToken}`
    }

    const accessResponse = await fetchPrivateFlow(
      request,
      "/store/order-confirmations/resolve",
      {
        public_order_id: id,
        ...(orderToken ? { order_token: orderToken } : {}),
      },
      { headers: accessHeaders }
    )
    if (!accessResponse.ok) {
      return genericFailure()
    }

    const accessPayload = await readUpstreamJson(accessResponse)
    const authorizedOrder = accessPayload?.order
    if (
      !authorizedOrder ||
      typeof authorizedOrder !== "object" ||
      Array.isArray(authorizedOrder) ||
      (authorizedOrder as Record<string, unknown>).id !== id
    ) {
      return genericFailure()
    }

    const medusaUrl = new URL(
      buildMedusaUrl(`/store/orders/${encodeURIComponent(id)}`)
    )
    medusaUrl.searchParams.set("fields", ORDER_PAYMENT_QR_FIELDS.join(","))

    const orderResponse = await fetch(medusaUrl, {
      cache: "no-store",
      headers: getPublishableHeaders(binding),
      method: "GET",
    })
    if (!orderResponse.ok) {
      return genericFailure()
    }

    const orderPayload = (await parseResponseJson(
      orderResponse
    )) as StoreOrderResponse | null
    if (
      orderPayload?.order?.id !== id ||
      orderPayload.order.sales_channel_id !== binding.salesChannelId ||
      orderPayload.order.region_id !== binding.regionId
    ) {
      return genericFailure()
    }

    return privateJson(await mapStoreOrderPaymentQr(orderPayload))
  } catch {
    return genericFailure()
  }
}
