import type { ProviderWebhookPayload } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import type { PayKit, PayKitProvider } from "@paykit-sdk/core"
import { getErrorMessage, isRecord } from "@techsio/std/object"

import type {
  PaykitAdapterOptions,
  PaykitComgateOptions,
  PaykitComgateProviderOptions,
  PaykitGopayOptions,
  PaykitGopayProviderOptions,
  PaykitPaymentClient,
  PaykitStripeOptions,
  PaykitStripeProviderOptions,
  PaykitWebhookEvent,
} from "./types"

type PaykitRuntime = Pick<
  InstanceType<typeof PayKit<PayKitProvider>>,
  "customers" | "payments" | "refunds"
>

export type PaykitProviderRuntime = Pick<PayKitProvider, "handleWebhook">

type PaykitConstructor = new (provider: PayKitProvider) => PaykitRuntime
type PaykitProviderFactory = (
  options: Record<string, unknown>,
) => PayKitProvider

interface CreatedPaykitClient {
  client: PaykitPaymentClient
  provider: PayKitProvider
}

// stripe-node advances its default REST API version with major releases.
// Keep this explicit so dependency updates cannot silently change payment behavior.
const PAYKIT_STRIPE_API_VERSION = "2026-06-24.dahlia" as const

const isPaykitProviderRuntime = (
  provider: unknown,
): provider is PaykitProviderRuntime =>
  isRecord(provider) && typeof provider["handleWebhook"] === "function"

const isPaykitConstructor = (value: unknown): value is PaykitConstructor =>
  typeof value === "function"

const isPaykitProviderFactory = (
  value: unknown,
): value is PaykitProviderFactory => typeof value === "function"

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const dynamicImport = async (specifier: string): Promise<unknown> => {
  switch (specifier) {
    case "@paykit-sdk/comgate": {
      return await import("@paykit-sdk/comgate")
    }
    case "@paykit-sdk/core": {
      return await import("@paykit-sdk/core")
    }
    case "@paykit-sdk/gopay": {
      return await import("@paykit-sdk/gopay")
    }
    case "@paykit-sdk/stripe": {
      return await import("@paykit-sdk/stripe")
    }
    default: {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported PayKit package "${specifier}".`,
      )
    }
  }
}

const isMissingPackageImportError = (
  packageName: string,
  error: unknown,
): boolean => {
  if (!isRecord(error) || error["code"] !== "ERR_MODULE_NOT_FOUND") {
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

const loadExport = async <T>(
  packageName: string,
  exportName: string,
  isExpectedExport: (value: unknown) => value is T,
): Promise<T> => {
  let moduleValue: unknown

  try {
    moduleValue = await dynamicImport(packageName)
  } catch (error) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      getPaykitPackageLoadErrorMessage(packageName, error),
      undefined,
      { cause: error },
    )
  }

  if (!isRecord(moduleValue)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PayKit package "${packageName}" did not load as a module.`,
    )
  }

  const loaded = moduleValue[exportName]

  if (!isExpectedExport(loaded)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PayKit package "${packageName}" does not export a valid "${exportName}".`,
    )
  }

  return loaded
}

const getFirstHeaderValue = (value: unknown): string | undefined => {
  if (isUnknownArray(value)) {
    const [firstValue] = value
    return getFirstHeaderValue(firstValue)
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
  const data = isRecord(rawData) ? rawData : undefined

  for (const value of [data?.["fullUrl"], data?.["full_url"]]) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  const host = getFirstHeaderValue(payload.headers?.["host"])
  const path = data?.["url"]

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
    if (isUnknownArray(value)) {
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

const getWebhookSecret = (
  providerOptions: Record<string, unknown>,
): string | null =>
  typeof providerOptions["webhookSecret"] === "string"
    ? providerOptions["webhookSecret"]
    : null

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
  webhookOptions: Record<string, unknown> = {},
): Promise<PaykitWebhookEvent[]> =>
  await provider.handleWebhook(
    toPaykitWebhookPayload(payload),
    getWebhookSecret(webhookOptions),
  )

export const createPaykitClientWithProvider = async (
  providerPackage: string,
  providerExport: string,
  providerOptions: Record<string, unknown>,
  webhookOptions: Record<string, unknown> = providerOptions,
): Promise<CreatedPaykitClient> => {
  const [PayKitClass, createProvider] = await Promise.all([
    loadExport("@paykit-sdk/core", "PayKit", isPaykitConstructor),
    loadExport(providerPackage, providerExport, isPaykitProviderFactory),
  ])

  const provider = createProvider(providerOptions)

  if (!isPaykitProviderRuntime(provider)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `PayKit provider "${providerPackage}" does not implement handleWebhook`,
    )
  }

  const paykit = new PayKitClass(provider)

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
  providerPackage: string,
  providerExport: string,
  providerOptions: Record<string, unknown>,
  webhookOptions: Record<string, unknown> = providerOptions,
): Promise<PaykitPaymentClient> => {
  const created = await createPaykitClientWithProvider(
    providerPackage,
    providerExport,
    providerOptions,
    webhookOptions,
  )
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
  options: PaykitGopayOptions,
): PaykitGopayProviderOptions => ({
  ...(options.clientId === undefined || options.clientId === ""
    ? {}
    : { clientId: options.clientId }),
  ...(options.clientSecret === undefined || options.clientSecret === ""
    ? {}
    : { clientSecret: options.clientSecret }),
  ...(options.goId === undefined || options.goId === ""
    ? {}
    : { goId: options.goId }),
  isSandbox: options.isSandbox ?? true,
  ...(options.webhookUrl === undefined || options.webhookUrl === ""
    ? {}
    : { webhookUrl: options.webhookUrl }),
  debug: options.debug ?? false,
})

export const getStripeProviderOptions = (
  options: PaykitStripeOptions,
): PaykitStripeProviderOptions => ({
  ...(options.apiKey === undefined || options.apiKey === ""
    ? {}
    : { apiKey: options.apiKey }),
  apiVersion: PAYKIT_STRIPE_API_VERSION,
  debug: options.debug ?? false,
})

export const getStripeWebhookOptions = (
  options: PaykitStripeOptions,
): Record<string, unknown> => ({
  webhookSecret: options.webhookSecret ?? "",
})

export const getComgateProviderOptions = (
  options: PaykitComgateOptions,
): PaykitComgateProviderOptions => ({
  ...(options.merchant === undefined || options.merchant === ""
    ? {}
    : { merchant: options.merchant }),
  ...(options.secret === undefined || options.secret === ""
    ? {}
    : { secret: options.secret }),
  debug: options.debug ?? false,
  isSandbox: options.isSandbox ?? true,
})
