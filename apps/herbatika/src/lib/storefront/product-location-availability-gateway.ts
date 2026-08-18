import type { ProductLocationAvailabilityResponse } from "@techsio/storefront-data/product-location-availability/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"

export type ProductLocationAvailabilityGatewayReadResult =
  | Readonly<{ kind: "found"; value: ProductLocationAvailabilityResponse }>
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "rate-limited" }>
  | Readonly<{ kind: "unavailable" }>
  | Readonly<{ causeCode: string; kind: "invalid-response" }>

export type ProductLocationAvailabilityGatewayReadInput = Readonly<{
  binding: MarketRuntimeBinding
  productId: string
  signal: AbortSignal
}>

type ProductLocationAvailabilityGatewayDependencies = Readonly<{
  readProductLocationAvailability: (
    input: ProductLocationAvailabilityGatewayReadInput
  ) => Promise<ProductLocationAvailabilityGatewayReadResult>
  resolveMarket: (
    host: string | null
  ) => MarketRuntimeBinding | null | undefined
}>

const PRIVATE_NO_STORE = "private, no-store, max-age=0"
const PRODUCT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,254}$/

const jsonResponse = (message: string, status: number) =>
  Response.json(
    { message },
    {
      headers: {
        "cache-control": PRIVATE_NO_STORE,
      },
      status,
    }
  )

const readProductId = (request: Request): string | null => {
  const entries = Array.from(new URL(request.url).searchParams.entries())
  if (entries.length !== 1 || entries[0]?.[0] !== "product_id") {
    return null
  }

  const productId = entries[0][1]
  return PRODUCT_ID_PATTERN.test(productId) ? productId : null
}

export const handleProductLocationAvailabilityGatewayRequest = async (
  request: Request,
  dependencies: ProductLocationAvailabilityGatewayDependencies
): Promise<Response> => {
  let binding: MarketRuntimeBinding | null | undefined
  try {
    binding = dependencies.resolveMarket(request.headers.get("host"))
  } catch {
    return jsonResponse(
      "Location availability is temporarily unavailable.",
      503
    )
  }

  if (!binding) {
    return jsonResponse("Misdirected request.", 421)
  }

  const productId = readProductId(request)
  if (!productId) {
    return jsonResponse("Invalid location availability request.", 400)
  }

  let sourceResult: ProductLocationAvailabilityGatewayReadResult
  try {
    sourceResult = await dependencies.readProductLocationAvailability({
      binding,
      productId,
      signal: request.signal,
    })
  } catch {
    return jsonResponse(
      "Location availability is temporarily unavailable.",
      503
    )
  }

  if (sourceResult.kind === "found") {
    return Response.json(sourceResult.value, {
      headers: {
        "cache-control": PRIVATE_NO_STORE,
      },
      status: 200,
    })
  }
  if (sourceResult.kind === "missing") {
    return jsonResponse("The requested product was not found.", 404)
  }
  if (sourceResult.kind === "rate-limited") {
    return jsonResponse("Too many location availability requests.", 429)
  }

  return jsonResponse("Location availability is temporarily unavailable.", 503)
}
