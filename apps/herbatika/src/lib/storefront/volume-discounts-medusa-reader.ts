import { parseVolumeDiscountTierResponse } from "./volume-discounts-contract"
import type {
  VolumeDiscountGatewayReadInput,
  VolumeDiscountGatewayReadResult,
} from "./volume-discounts-gateway"

type MedusaRequestOptions = Readonly<{
  cache: "no-store"
  headers?: Readonly<Record<string, string>>
  query: Readonly<{
    region_id: string
    sales_channel_id: string
    variant_id: string
  }>
  signal: AbortSignal
}>

type MedusaClient = Readonly<{
  fetch: (
    path: "/store/volume-discounts",
    options: MedusaRequestOptions
  ) => Promise<unknown>
}>

type CreateMedusaClientInput = Readonly<{
  baseUrl: string
  publishableKey: string
}>

type VolumeDiscountMedusaReaderDependencies = Readonly<{
  baseUrl: string
  createClient: (input: CreateMedusaClientInput) => MedusaClient
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

const mapPayload = (payload: unknown): VolumeDiscountGatewayReadResult => {
  try {
    return {
      kind: "found",
      value: parseVolumeDiscountTierResponse(payload),
    }
  } catch {
    return {
      causeCode: "invalid-volume-discount-payload",
      kind: "invalid-response",
    }
  }
}

const mapError = (error: unknown): VolumeDiscountGatewayReadResult => {
  const status = readErrorStatus(error)
  if (status === 404) {
    return { kind: "missing" }
  }
  if (status === 401 || status === 403) {
    return { kind: "rejected", status }
  }
  if (status === 429) {
    return { kind: "rate-limited" }
  }

  return { kind: "unavailable" }
}

export const createVolumeDiscountMedusaReader = ({
  baseUrl,
  createClient,
  createTimeoutSignal = () => AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
}: VolumeDiscountMedusaReaderDependencies) => {
  const clientByMarket = new Map<string, MedusaClient>()

  const getClient = (input: VolumeDiscountGatewayReadInput) => {
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
    input: VolumeDiscountGatewayReadInput
  ): Promise<VolumeDiscountGatewayReadResult> => {
    const client = getClient(input)

    try {
      const payload = await client.fetch("/store/volume-discounts", {
        cache: "no-store",
        headers: input.authToken
          ? { authorization: `Bearer ${input.authToken}` }
          : undefined,
        query: {
          region_id: input.binding.regionId,
          sales_channel_id: input.binding.salesChannelId,
          variant_id: input.variantId,
        },
        signal: AbortSignal.any([input.signal, createTimeoutSignal()]),
      })

      return mapPayload(payload)
    } catch (error) {
      return mapError(error)
    }
  }
}
