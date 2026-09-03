import { NextResponse } from "next/server"
import { resolveStorefrontApiMessages } from "@/app/api/_messages"
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
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { readOrderConfirmationToken } from "@/lib/routing/private-flows/request-cookies"
import { getHerbatikaMarketContext } from "@/lib/storefront/market-context"
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

const genericFailure = (message: string, status = 404) =>
  NextResponse.json({ message }, { headers: PRIVATE_NO_STORE_HEADERS, status })

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

const resolveGuestOrderToken = async (request: Request) => {
  const bodyOrderToken = await readGuestOrderToken(request)
  if (bodyOrderToken === null) {
    return null
  }

  const cookieOrderToken = readOrderConfirmationToken(
    request.headers.get("cookie") ?? undefined
  )
  if (
    bodyOrderToken &&
    cookieOrderToken &&
    bodyOrderToken !== cookieOrderToken
  ) {
    return null
  }

  return bodyOrderToken ?? cookieOrderToken ?? undefined
}

export async function POST(request: Request, context: RouteContext) {
  let binding: MarketRuntimeBinding
  try {
    binding = requireStorefrontMarketBinding(request)
  } catch {
    return genericFailure("Unknown storefront host.", 421)
  }
  const messages = resolveStorefrontApiMessages(binding.market)
  const unavailable = () =>
    genericFailure(messages.orderPaymentDetailsUnavailable)

  try {
    const { id } = await context.params
    if (!id || id.length > 256 || id !== id.trim() || id.includes("\0")) {
      return unavailable()
    }

    const orderToken = await resolveGuestOrderToken(request)
    const authToken = readAuthToken(request)
    if (orderToken === null || !(orderToken || authToken)) {
      return unavailable()
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
      return unavailable()
    }

    const accessPayload = await readUpstreamJson(accessResponse)
    const authorizedOrder = accessPayload?.order
    if (
      !authorizedOrder ||
      typeof authorizedOrder !== "object" ||
      Array.isArray(authorizedOrder) ||
      (authorizedOrder as Record<string, unknown>).id !== id
    ) {
      return unavailable()
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
      return unavailable()
    }

    const orderPayload = (await parseResponseJson(
      orderResponse
    )) as StoreOrderResponse | null
    if (
      orderPayload?.order?.id !== id ||
      orderPayload.order.sales_channel_id !== binding.salesChannelId ||
      orderPayload.order.region_id !== binding.regionId
    ) {
      return unavailable()
    }

    return privateJson(
      await mapStoreOrderPaymentQr(
        orderPayload,
        getHerbatikaMarketContext(binding.market).currencyCode
      )
    )
  } catch {
    return unavailable()
  }
}
