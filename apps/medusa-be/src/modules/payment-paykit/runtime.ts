import type { ProviderWebhookPayload } from "@medusajs/framework/types"
import type {
  PaykitComgateOptions,
  PaykitGopayOptions,
  PaykitPaymentClient,
  PaykitProviderOptions,
  PaykitStripeOptions,
  PaykitWebhookEvent,
} from "./types"

type PaykitRuntime = {
  customers: NonNullable<PaykitPaymentClient["customers"]>
  payments: PaykitPaymentClient["payments"]
  refunds: NonNullable<PaykitPaymentClient["refunds"]>
}

type PaykitProviderRuntime = {
  handleWebhook: (payload: {
    body: string
    headers: Headers
    fullUrl: string
    webhookSecret: string
  }) => Promise<PaykitWebhookEvent[]>
}

type PaykitConstructor = new (provider: unknown) => PaykitRuntime

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isPaykitProviderRuntime = (
  provider: unknown
): provider is PaykitProviderRuntime =>
  isRecord(provider) && typeof provider.handleWebhook === "function"

const dynamicImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<Record<string, unknown>>

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const isMissingPackageImportError = (
  packageName: string,
  error: unknown
): boolean => {
  if (!isRecord(error) || error.code !== "ERR_MODULE_NOT_FOUND") {
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
  error: unknown
): string => {
  const originalMessage = getErrorMessage(error)

  if (isMissingPackageImportError(packageName, error)) {
    return `PayKit package "${packageName}" is not installed. Install it before enabling this provider. Original error: ${originalMessage}`
  }

  return `PayKit package "${packageName}" failed to load. The package is installed, but Node could not import it. This usually means the PayKit SDK packages are version-incompatible or the package build is invalid. Original error: ${originalMessage}`
}

const loadExport = async <T>(
  packageName: string,
  exportName: string
): Promise<T> => {
  let mod: Record<string, unknown>

  try {
    mod = await dynamicImport(packageName)
  } catch (error) {
    throw new Error(getPaykitPackageLoadErrorMessage(packageName, error), {
      cause: error,
    })
  }

  const loaded = mod[exportName]

  if (!loaded) {
    throw new Error(
      `PayKit package "${packageName}" does not export "${exportName}".`
    )
  }

  return loaded as T
}

export const createPaykitClient = async (
  providerPackage: string,
  providerExport: string,
  providerOptions: Record<string, unknown>,
  webhookOptions: Record<string, unknown> = providerOptions
): Promise<PaykitPaymentClient> => {
  const [PayKit, createProvider] = await Promise.all([
    loadExport<PaykitConstructor>("@paykit-sdk/core", "PayKit"),
    loadExport<(options: Record<string, unknown>) => unknown>(
      providerPackage,
      providerExport
    ),
  ])

  const provider = createProvider(providerOptions)

  if (!isPaykitProviderRuntime(provider)) {
    throw new Error(
      `PayKit provider "${providerPackage}" does not implement handleWebhook`
    )
  }

  const paykit = new PayKit(provider)

  return {
    customers: paykit.customers,
    payments: paykit.payments,
    refunds: paykit.refunds,
    handleWebhook: (payload) =>
      provider.handleWebhook(toPaykitWebhookPayload(payload, webhookOptions)),
  }
}

export const resolveConfiguredClient = async (
  options: PaykitProviderOptions
): Promise<PaykitPaymentClient | undefined> => {
  if (options.client) {
    return options.client
  }

  return await options.clientFactory?.()
}

export const getGopayProviderOptions = (
  options: PaykitGopayOptions
): Record<string, unknown> => ({
  clientId: options.clientId,
  clientSecret: options.clientSecret,
  goId: options.goId,
  isSandbox: options.isSandbox ?? true,
  webhookUrl: options.webhookUrl,
  debug: options.debug ?? false,
})

export const getStripeProviderOptions = (
  options: PaykitStripeOptions
): Record<string, unknown> => ({
  apiKey: options.apiKey,
  debug: options.debug ?? false,
})

export const getStripeWebhookOptions = (
  options: PaykitStripeOptions
): Record<string, unknown> => ({
  webhookSecret: options.webhookSecret ?? "",
})

export const getComgateProviderOptions = (
  options: PaykitComgateOptions
): Record<string, unknown> => ({
  merchant: options.merchant,
  secret: options.secret,
  isSandbox: options.isSandbox ?? true,
  debug: options.debug ?? false,
})

const toPaykitWebhookPayload = (
  payload: ProviderWebhookPayload["payload"],
  providerOptions: Record<string, unknown>
) => ({
  body: rawBodyToString(payload.rawData),
  headers: toHeaders(payload.headers),
  fullUrl: getWebhookFullUrl(payload),
  webhookSecret:
    typeof providerOptions.webhookSecret === "string"
      ? providerOptions.webhookSecret
      : "",
})

const rawBodyToString = (
  rawData: ProviderWebhookPayload["payload"]["rawData"]
): string => {
  if (Buffer.isBuffer(rawData)) {
    return rawData.toString("utf8")
  }

  if (typeof rawData === "string") {
    return rawData
  }

  return ""
}

const toHeaders = (
  headers: ProviderWebhookPayload["payload"]["headers"]
): Headers => {
  const result = new Headers()

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (Array.isArray(value)) {
      for (const item of value) {
        result.append(key, String(item))
      }
      continue
    }

    if (value !== undefined) {
      result.set(key, String(value))
    }
  }

  return result
}

const getWebhookFullUrl = (
  payload: ProviderWebhookPayload["payload"]
): string => {
  const rawData = payload.data
  const data = isRecord(rawData) ? rawData : undefined

  for (const value of [data?.fullUrl, data?.full_url]) {
    if (typeof value === "string" && value.length > 0) {
      return value
    }
  }

  const host = getFirstHeaderValue(payload.headers?.host)
  const path = data?.url

  if (
    typeof path === "string" &&
    (path.startsWith("http://") || path.startsWith("https://"))
  ) {
    return path
  }

  if (host && typeof path === "string") {
    const protocol = getWebhookProtocol(payload.headers, host)
    return `${protocol}://${host}${path}`
  }

  return ""
}

const getFirstHeaderValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return getFirstHeaderValue(value[0])
  }

  return typeof value === "string" && value.length > 0 ? value : undefined
}

const getWebhookProtocol = (
  headers: ProviderWebhookPayload["payload"]["headers"],
  host: string
): "http" | "https" => {
  const forwardedProto = getFirstHeaderValue(headers?.["x-forwarded-proto"])
    ?.split(",")[0]
    ?.trim()
  const protocol = getFirstHeaderValue(headers?.protocol)

  if (forwardedProto === "http" || forwardedProto === "https") {
    return forwardedProto
  }

  if (protocol === "http" || protocol === "https") {
    return protocol
  }

  if (
    process.env.PAYKIT_WEBHOOK_PROTOCOL === "http" ||
    process.env.PAYKIT_WEBHOOK_PROTOCOL === "https"
  ) {
    return process.env.PAYKIT_WEBHOOK_PROTOCOL
  }

  return isLocalHost(host) ? "http" : "https"
}

const isLocalHost = (host: string): boolean => {
  const hostname = host.split(":")[0]
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  )
}
