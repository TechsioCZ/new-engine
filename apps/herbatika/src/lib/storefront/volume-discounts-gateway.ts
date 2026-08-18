import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { VolumeDiscountTierResponse } from "./volume-discounts-contract"

export type VolumeDiscountGatewayReadResult =
  | Readonly<{ kind: "found"; value: VolumeDiscountTierResponse }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "rate-limited" }>
  | Readonly<{ kind: "rejected"; status: 401 | 403 }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

export type VolumeDiscountGatewayReadInput = Readonly<{
  authToken: string | null
  binding: MarketRuntimeBinding
  signal: AbortSignal
  variantId: string
}>

type VolumeDiscountGatewayDependencies = Readonly<{
  authToken: string | null
  readVolumeDiscounts: (
    input: VolumeDiscountGatewayReadInput
  ) => Promise<VolumeDiscountGatewayReadResult>
  resolveMarket: (
    host: string | null
  ) => MarketRuntimeBinding | null | undefined
}>

const PRIVATE_NO_STORE = "private, no-store, max-age=0"
const VARIANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$/

const jsonResponse = (message: string, status: number) =>
  Response.json(
    { message },
    {
      headers: {
        "cache-control": PRIVATE_NO_STORE,
        vary: "Cookie",
      },
      status,
    }
  )

const badRequest = () => jsonResponse("Invalid volume discount request.", 400)
const unavailable = () =>
  jsonResponse("Volume discounts are temporarily unavailable.", 503)

const readVariantId = (request: Request): string | null => {
  const entries = Array.from(new URL(request.url).searchParams.entries())
  if (entries.length !== 1 || entries[0]?.[0] !== "variant_id") {
    return null
  }

  const variantId = entries[0][1]
  return VARIANT_ID_PATTERN.test(variantId) ? variantId : null
}

export const handleVolumeDiscountGatewayRequest = async (
  request: Request,
  dependencies: VolumeDiscountGatewayDependencies
): Promise<Response> => {
  let binding: MarketRuntimeBinding | null | undefined
  try {
    binding = dependencies.resolveMarket(request.headers.get("host"))
  } catch {
    return unavailable()
  }

  if (!binding) {
    return jsonResponse("Misdirected request.", 421)
  }

  const variantId = readVariantId(request)
  if (!variantId) {
    return badRequest()
  }

  let sourceResult: VolumeDiscountGatewayReadResult
  try {
    sourceResult = await dependencies.readVolumeDiscounts({
      authToken: dependencies.authToken,
      binding,
      signal: request.signal,
      variantId,
    })
  } catch {
    return unavailable()
  }

  if (sourceResult.kind === "found") {
    return Response.json(sourceResult.value, {
      headers: {
        "cache-control": PRIVATE_NO_STORE,
        vary: "Cookie",
      },
      status: 200,
    })
  }
  if (sourceResult.kind === "missing") {
    return jsonResponse("The requested product variant was not found.", 404)
  }
  if (sourceResult.kind === "rejected") {
    return jsonResponse(
      "Authentication is no longer valid.",
      sourceResult.status
    )
  }
  if (sourceResult.kind === "rate-limited") {
    return jsonResponse("Too many volume discount requests.", 429)
  }

  return unavailable()
}
