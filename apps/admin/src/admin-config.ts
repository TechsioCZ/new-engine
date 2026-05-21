export const MEDUSA_BACKEND_URL =
  import.meta.env.VITE_MEDUSA_BACKEND_URL ??
  import.meta.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
  "http://localhost:9000"

export function buildMedusaUrl(path: string, params?: Record<string, string>) {
  const url = new URL(path, MEDUSA_BACKEND_URL)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value)
  }

  return url
}
