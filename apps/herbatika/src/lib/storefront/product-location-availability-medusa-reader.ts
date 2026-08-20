import { parseProductLocationAvailabilityResponse } from "./product-location-availability-contract"
import type {
  ProductLocationAvailabilityGatewayReadInput,
  ProductLocationAvailabilityGatewayReadResult,
} from "./product-location-availability-gateway"

type MedusaRequestOptions = Readonly<{
  cache: "no-store"
  headers?: Readonly<Record<string, string>>
  query: Readonly<{ sales_channel_id: string }>
  signal: AbortSignal
}>

type MedusaClient = Readonly<{
  fetch: (path: string, options: MedusaRequestOptions) => Promise<unknown>
}>

type ProductLocationAvailabilityMedusaReaderDependencies = Readonly<{
  baseUrl: string
  createClient: (input: {
    baseUrl: string
    publishableKey: string
  }) => MedusaClient
  createTimeoutSignal?: () => AbortSignal
}>

const DEFAULT_TIMEOUT_MS = 5000

const readErrorStatus = (error: unknown): number | null => {
  if (!(typeof error === "object" && error !== null && "status" in error)) {
    return null
  }

  const status = error.status
  return typeof status === "number" && Number.isInteger(status) ? status : null
}

const mapError = (
  error: unknown
): ProductLocationAvailabilityGatewayReadResult => {
  const status = readErrorStatus(error)
  if (status === 404) {
    return { kind: "missing" }
  }
  if (status === 429) {
    return { kind: "rate-limited" }
  }

  return { kind: "unavailable" }
}

export const createProductLocationAvailabilityMedusaReader = ({
  baseUrl,
  createClient,
  createTimeoutSignal = () => AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
}: ProductLocationAvailabilityMedusaReaderDependencies) => {
  const clientByMarket = new Map<string, MedusaClient>()

  const getClient = (input: ProductLocationAvailabilityGatewayReadInput) => {
    const existing = clientByMarket.get(input.binding.market)
    if (existing) {
      return existing
    }

    const client = createClient({
      baseUrl,
      publishableKey: input.binding.publishableApiKey,
    })
    clientByMarket.set(input.binding.market, client)
    return client
  }

  return async (
    input: ProductLocationAvailabilityGatewayReadInput
  ): Promise<ProductLocationAvailabilityGatewayReadResult> => {
    const client = getClient(input)

    try {
      const payload = await client.fetch(
        `/store/products/${encodeURIComponent(input.productId)}/location-availability`,
        {
          cache: "no-store",
          query: { sales_channel_id: input.binding.salesChannelId },
          signal: AbortSignal.any([input.signal, createTimeoutSignal()]),
        }
      )

      try {
        const value = parseProductLocationAvailabilityResponse(payload)
        if (value.product_id !== input.productId) {
          return {
            causeCode: "mismatched-location-availability-product",
            kind: "invalid-response",
          }
        }

        return {
          kind: "found",
          value,
        }
      } catch {
        return {
          causeCode: "invalid-location-availability-payload",
          kind: "invalid-response",
        }
      }
    } catch (error) {
      return mapError(error)
    }
  }
}
