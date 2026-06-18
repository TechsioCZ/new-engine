const DEFAULT_MEDUSA_BACKEND_URL = "http://localhost:9000"

const trimEnv = (value: string | undefined) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const isServerRuntime = () => typeof window === "undefined"

export const resolveMedusaBackendUrl = () =>
  (isServerRuntime()
    ? trimEnv(process.env.MEDUSA_BACKEND_URL_INTERNAL)
    : null) ??
  trimEnv(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) ??
  DEFAULT_MEDUSA_BACKEND_URL

export const resolvePayloadBaseUrl = (
  fallbackBaseUrl = resolveMedusaBackendUrl()
) =>
  (isServerRuntime()
    ? trimEnv(process.env.PAYLOAD_BASE_URL_INTERNAL)
    : null) ??
  trimEnv(process.env.NEXT_PUBLIC_PAYLOAD_BASE_URL) ??
  fallbackBaseUrl
