const PACKETA_WIDGET_URL = "https://widget.packeta.com/v6/www/js/library.js"

export type PacketaPickupPoint = {
  id: number
  name: string
  zip: string
  city: string
  street?: string
  country?: string
}

export type PacketaShippingData = {
  access_point_id: number
  access_point_name: string
  access_point_zip: string
  access_point_city: string
}

type PacketaPointRaw = {
  id: number | string
  name: string
  place?: string
  city?: string
  street?: string
  zip: string
  country?: string
}

type PacketaWidgetApi = {
  pick: (
    apiKey: string,
    callback: (point: PacketaPointRaw | null) => void,
    options?: Record<string, unknown>
  ) => void
}

declare global {
  interface Window {
    Packeta?: { Widget: PacketaWidgetApi }
  }
}

let loaderPromise: Promise<void> | null = null

function loadPacketaScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Packeta widget cannot be loaded on the server")
    )
  }
  if (window.Packeta?.Widget) return Promise.resolve()
  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PACKETA_WIDGET_URL}"]`
    )
    const onLoad = () => resolve()
    const onError = () => {
      loaderPromise = null
      reject(new Error("Failed to load Packeta widget"))
    }
    if (existing) {
      existing.addEventListener("load", onLoad)
      existing.addEventListener("error", onError)
      return
    }
    const script = document.createElement("script")
    script.src = PACKETA_WIDGET_URL
    script.async = true
    script.onload = onLoad
    script.onerror = onError
    document.head.appendChild(script)
  })
  return loaderPromise
}

export function toPacketaShippingData(
  point: PacketaPickupPoint
): PacketaShippingData {
  return {
    access_point_id: point.id,
    access_point_name: point.name,
    access_point_zip: point.zip,
    access_point_city: point.city,
  }
}

export async function pickPacketaPoint(
  apiKey: string,
  options: Record<string, unknown> = { country: "cz", language: "cs" }
): Promise<PacketaPickupPoint | null> {
  if (!apiKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_PACKETA_WIDGET_API_KEY — Packeta widget cannot be opened."
    )
  }
  await loadPacketaScript()
  if (!window.Packeta?.Widget) {
    throw new Error("Packeta widget unavailable")
  }

  return new Promise<PacketaPickupPoint | null>((resolve) => {
    window.Packeta!.Widget.pick(
      apiKey,
      (point) => {
        if (!point) {
          resolve(null)
          return
        }
        const id =
          typeof point.id === "string" ? Number.parseInt(point.id, 10) : point.id
        resolve({
          id,
          name: point.name,
          zip: point.zip,
          city: point.city ?? point.place ?? "",
          street: point.street,
          country: point.country,
        })
      },
      options
    )
  })
}
