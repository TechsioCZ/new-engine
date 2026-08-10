import type { ProviderWebhookPayload } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import type { PayKit, PayKitProvider } from "@paykit-sdk/core"
import { getErrorMessage } from "@techsio/std/object"

import type {
  PaykitAdapterOptions,
  PaykitComgateOptions,
  PaykitComgateProviderOptions,
  PaykitGopayOptions,
  PaykitGopayProviderOptions,
  PaykitPaymentClient,
  PaykitStripeOptions,
  PaykitStripeProvider,
  PaykitStripeProviderOptions,
  PaykitWebhookEvent,
} from "./types"

type PaykitRuntime = Pick<
  InstanceType<typeof PayKit<PayKitProvider>>,
  "customers" | "payments" | "refunds"
>

export type PaykitProviderRuntime = Pick<PayKitProvider, "handleWebhook">

interface PaykitWebhookOptions {
  webhookSecret?: string
}

interface CreatedPaykitClient<
  TProvider extends PayKitProvider = PayKitProvider,
> {
  client: PaykitPaymentClient
  provider: TProvider
}

type CreateComgateProviderArgs = readonly [
  providerPackage: "@paykit-sdk/comgate",
  providerExport: "createComgate",
  providerOptions: PaykitComgateProviderOptions,
  webhookOptions?: PaykitWebhookOptions,
]

type CreateGopayProviderArgs = readonly [
  providerPackage: "@paykit-sdk/gopay",
  providerExport: "createGopay",
  providerOptions: PaykitGopayProviderOptions,
  webhookOptions?: PaykitWebhookOptions,
]

type CreateStripeProviderArgs = readonly [
  providerPackage: "@paykit-sdk/stripe",
  providerExport: "createStripe",
  providerOptions: PaykitStripeProviderOptions,
  webhookOptions?: PaykitWebhookOptions,
]

type CreatePaykitProviderArgs =
  | CreateComgateProviderArgs
  | CreateGopayProviderArgs
  | CreateStripeProviderArgs

// stripe-node advances its default REST API version with major releases.
// Keep this explicit so dependency updates cannot silently change payment behavior.
const PAYKIT_STRIPE_API_VERSION = "2026-06-24.dahlia"

const isMissingPackageImportError = (
  packageName: string,
  error: unknown,
): boolean => {
  if (
    typeof error !== "object" ||
    error === null ||
    Reflect.get(error, "code") !== "ERR_MODULE_NOT_FOUND"
  ) {
    return false
  }

  const message = getErrorMessage(error)

  return (
    message.includes(`Cannot find package '${packageName}'`) ||
    message.includes(`Cannot find package "${packageName}"`) ||
    message.includes(`Cannot find module '${packageName}'`) ||
    message.includes(`Cannot find module "${packageName}"`)
  )
}

export const getPaykitPackageLoadErrorMessage = (
  packageName: string,
  error: unknown,
): string => {
  const originalMessage = getErrorMessage(error)

  if (isMissingPackageImportError(packageName, error)) {
    return `PayKit package "${packageName}" is not installed. Install it before enabling this provider. Original error: ${originalMessage}`
  }

  return `PayKit package "${packageName}" failed to load. The package is installed, but Node could not import it. This usually means the PayKit SDK packages are version-incompatible or the package build is invalid. Original error: ${originalMessage}`
}

const loadPaykitPackage = async <TModule>(
  packageName: string,
  load: () => Promise<TModule>,
): Promise<TModule> => {
  try {
    return await load()
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      getPaykitPackageLoadErrorMessage(packageName, error),
      undefined,
      { cause: error },
    )
  }
}

const createPaykitProvider = async (
  args: CreatePaykitProviderArgs,
): Promise<PayKitProvider> => {
  switch (args[0]) {
    case "@paykit-sdk/comgate": {
      const { createComgate } = await loadPaykitPackage(
        args[0],
        async () => await import("@paykit-sdk/comgate"),
      )
      return createComgate(args[2])
    }
    case "@paykit-sdk/gopay": {
      const { createGopay } = await loadPaykitPackage(
        args[0],
        async () => await import("@paykit-sdk/gopay"),
      )
      return createGopay(args[2])
    }
    case "@paykit-sdk/stripe": {
      const { createStripe } = await loadPaykitPackage(
        args[0],
        async () => await import("@paykit-sdk/stripe"),
      )
      return createStripe(args[2])
    }
    default: {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Unsupported PayKit package.",
      )
    }
  }
}

const unknownArraySchema = z.array(z.unknown())

const getFirstHeaderValue = (value: unknown): string | undefined => {
  const result = unknownArraySchema.safeParse(value)
  if (result.success) {
    return getFirstHeaderValue(result.data[0])
  }

  return typeof value === "string" && value.length > 0 ? value : undefined
}

const isLocalHost = (host: string): boolean => {
  const [hostname] = host.split(":")
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  )
}

const getWebhookProtocol = (
  headers: ProviderWebhookPayload["payload"]["headers"],
  host: string,
): "http" | "https" => {
  const [forwardedProto] =
    getFirstHeaderValue(headers?.["x-forwarded-proto"])?.split(",") ?? []
  const normalizedForwardedProto = forwardedProto?.trim()
  const protocol = getFirstHeaderValue(headers?.["protocol"])

  if (
    normalizedForwardedProto === "http" ||
    normalizedForwardedProto === "https"
  ) {
    return normalizedForwardedProto
  }

  if (protocol === "http" || protocol === "https") {
    return protocol
  }

  const configuredProtocol = process.env["PAYKIT_WEBHOOK_PROTOCOL"]
  if (configuredProtocol === "http" || configuredProtocol === "https") {
    return configuredProtocol
  }

  return isLocalHost(host) ? "http" : "https"
}

const getWebhookFullUrl = (
  payload: ProviderWebhookPayload["payload"],
): string => {
  const rawData = payload.data
  const fullUrl =
    typeof rawData === "object" && rawData !== null
      ? Reflect.get(rawData, "fullUrl")
      : undefined
  const legacyFullUrl =
    typeof rawData === "object" && rawData !== null
      ? Reflect.get(rawData, "full_url")
      : undefined

  for (const value of [fullUrl, legacyFullUrl]) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  const host = getFirstHeaderValue(payload.headers?.["host"])
  const path =
    typeof rawData === "object" && rawData !== null
      ? Reflect.get(rawData, "url")
      : undefined

  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path
  }

  if (
    host !== undefined &&
    host !== "" &&
    typeof path === "string" &&
    path !== ""
  ) {
    const protocol = getWebhookProtocol(payload.headers, host)
    return `${protocol}://${host}${path}`
  }

  return ""
}

const rawBodyToString = (
  rawData: ProviderWebhookPayload["payload"]["rawData"],
): string => {
  if (Buffer.isBuffer(rawData)) {
    return rawData.toString("utf-8")
  }

  if (typeof rawData === "string") {
    return rawData
  }

  return ""
}

const toHeadersAsObject = (
  headers: ProviderWebhookPayload["payload"]["headers"],
): Record<string, string> => {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (Array.isArray(value)) {
      result[key] = value.map(String).join(",")
      continue
    }

    if (typeof value === "string") {
      result[key] = value
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[key] = String(value)
    }
  }

  return result
}

const getWebhookSecret = (options: PaykitWebhookOptions): string | null =>
  options.webhookSecret ?? null

const toPaykitWebhookPayload = (
  payload: ProviderWebhookPayload["payload"],
) => ({
  body: rawBodyToString(payload.rawData),
  fullUrl: getWebhookFullUrl(payload),
  headersAsObject: toHeadersAsObject(payload.headers),
})

export const callPaykitProviderWebhook = async (
  provider: PaykitProviderRuntime,
  payload: ProviderWebhookPayload["payload"],
  webhookOptions: PaykitWebhookOptions = {},
): Promise<PaykitWebhookEvent[]> =>
  await provider.handleWebhook(
    toPaykitWebhookPayload(payload),
    getWebhookSecret(webhookOptions),
  )

export function createPaykitClientWithProvider(
  ...args: CreateStripeProviderArgs
): Promise<CreatedPaykitClient<PaykitStripeProvider>>
export function createPaykitClientWithProvider(
  ...args: CreatePaykitProviderArgs
): Promise<CreatedPaykitClient>
export async function createPaykitClientWithProvider(
  ...args: CreatePaykitProviderArgs
): Promise<CreatedPaykitClient> {
  const [{ PayKit: PayKitClass }, provider] = await Promise.all([
    loadPaykitPackage(
      "@paykit-sdk/core",
      async () => await import("@paykit-sdk/core"),
    ),
    createPaykitProvider(args),
  ])
  const paykit: PaykitRuntime = new PayKitClass(provider)
  const webhookOptions = args[3] ?? {}

  return {
    client: {
      customers: paykit.customers,
      handleWebhook: async (payload) =>
        await callPaykitProviderWebhook(provider, payload, webhookOptions),
      payments: paykit.payments,
      refunds: paykit.refunds,
    },
    provider,
  }
}

export const createPaykitClient = async (
  ...args: CreatePaykitProviderArgs
): Promise<PaykitPaymentClient> => {
  const created = await createPaykitClientWithProvider(...args)
  return created.client
}

export const resolveConfiguredClient = async (
  options: PaykitAdapterOptions,
): Promise<PaykitPaymentClient | undefined> => {
  if (options.client !== undefined) {
    return options.client
  }

  return await options.clientFactory?.()
}

export const getGopayProviderOptions = (
  options: PaykitGopayOptions & PaykitGopayProviderOptions,
): PaykitGopayProviderOptions => ({
  clientId: options.clientId,
  clientSecret: options.clientSecret,
  debug: options.debug ?? false,
  goId: options.goId,
  isSandbox: options.isSandbox ?? true,
  webhookUrl: options.webhookUrl,
})

export const getStripeProviderOptions = (
  options: PaykitStripeOptions & PaykitStripeProviderOptions,
): PaykitStripeProviderOptions => ({
  apiKey: options.apiKey,
  apiVersion: PAYKIT_STRIPE_API_VERSION,
  debug: options.debug ?? false,
})

export const getStripeWebhookOptions = (
  options: PaykitStripeOptions,
): PaykitWebhookOptions => ({
  webhookSecret: options.webhookSecret ?? "",
})

export const getComgateProviderOptions = (
  options: PaykitComgateOptions & PaykitComgateProviderOptions,
): PaykitComgateProviderOptions => ({
  debug: options.debug ?? false,
  isSandbox: options.isSandbox ?? true,
  merchant: options.merchant,
  secret: options.secret,
})
