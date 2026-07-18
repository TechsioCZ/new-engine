"use client"

import { useEffect, useRef, useState } from "react"

export type PplAccessPointData = {
  code: string
  name: string
  type: string
  address?: {
    street?: string
    city?: string
    zipCode?: string
    country?: string
  }
}

/** Supported languages for PPL widget UI */
const PPL_SUPPORTED_LANGUAGES = [
  "cs",
  "en",
  "de",
  "sk",
  "pl",
  "hu",
  "bg",
  "ro",
] as const
type PplLanguage = (typeof PPL_SUPPORTED_LANGUAGES)[number]

/**
 * Detect language from document.documentElement.lang
 * Returns PPL-supported language or fallback to "cs"
 */
function detectPplLanguage(): PplLanguage {
  if (typeof document === "undefined") {
    return "cs"
  }

  const htmlLang = document.documentElement.lang?.split("-")[0]?.toLowerCase()

  if (htmlLang && PPL_SUPPORTED_LANGUAGES.includes(htmlLang as PplLanguage)) {
    return htmlLang as PplLanguage
  }

  return "cs"
}

type PplWidgetProps = {
  onSelect: (data: PplAccessPointData) => void
  lat?: number
  lng?: number
  country?: string
  address?: string | undefined
  selectedCode?: string | undefined
  mode?: "default" | "static" | "catalog"
  initialFilters?: string
  /** Language for widget UI. Auto-detected from <html lang> if not provided */
  language?: PplLanguage
}

type PplEventDetail = {
  id?: number
  accessPointType?: string
  code: string
  name: string
  street?: string
  city?: string
  zipCode?: string
  country?: string
  gps?: { latitude: number; longitude: number }
  activeCardPayment?: boolean
  activeCashPayment?: boolean
}

const PPL_SCRIPT_URL = "https://www.ppl.cz/sources/map/main.js"
const PPL_CSS_URL = "https://www.ppl.cz/sources/map/main.css"
const WIDGET_ID = "ppl-parcelshop-map"

export function PplWidget({
  onSelect,
  lat,
  lng,
  country = "CZ",
  address,
  selectedCode,
  mode = "default",
  initialFilters,
  language: languageProp,
}: PplWidgetProps) {
  const hasLatLngProps = typeof lat === "number" && typeof lng === "number"
  const language = languageProp ?? detectPplLanguage()
  const [isReady, setIsReady] = useState(false)
  const [geoLocation, setGeoLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const mountIdRef = useRef(0)

  // Ref pattern: stable callback identity to prevent effect re-runs on parent re-renders
  // This prevents widget/script reload when checkout context updates
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Request geolocation if not provided via props
  useEffect(() => {
    if (hasLatLngProps || !navigator.geolocation) {
      setIsReady(true)
      return
    }

    let cancelled = false
    const startTime = Date.now()

    const handleSuccess = (position: GeolocationPosition) => {
      if (cancelled) {
        return
      }
      if (process.env["NODE_ENV"] === "development") {
        console.log("[PplWidget] Geolocation success:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: `${position.coords.accuracy.toFixed(0)}m`,
          elapsed: `${Date.now() - startTime}ms`,
        })
      }
      setGeoLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
      setIsReady(true)
    }

    const handleError = (error: GeolocationPositionError) => {
      if (cancelled) {
        return
      }
      if (process.env["NODE_ENV"] === "development") {
        const errorMessages: Record<number, string> = {
          1: "PERMISSION_DENIED",
          2: "POSITION_UNAVAILABLE",
          3: "TIMEOUT",
        }
        console.log("[PplWidget] Geolocation error:", {
          code: errorMessages[error.code] || error.code,
          message: error.message,
          elapsed: `${Date.now() - startTime}ms`,
        })
      }
      setIsReady(true)
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 2000,
    }

    // Check permission first if available
    if (navigator.permissions?.query) {
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: permission flow has multiple guard checks
      const checkPermission = async () => {
        try {
          const status = await navigator.permissions.query({
            name: "geolocation" as PermissionName,
          })

          if (cancelled) {
            return
          }

          if (process.env["NODE_ENV"] === "development") {
            console.log("[PplWidget] Geolocation permission:", status.state)
          }

          if (status.state === "granted") {
            navigator.geolocation.getCurrentPosition(
              handleSuccess,
              handleError,
              geoOptions
            )
          } else {
            // Permission not granted (prompt/denied) - skip geolocation
            setIsReady(true)
          }
        } catch {
          setIsReady(true)
        }
      }

      checkPermission()
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      )
    }

    return () => {
      cancelled = true
    }
  }, [hasLatLngProps])

  // Load CSS once
  useEffect(() => {
    const existingLink = document.head.querySelector<HTMLLinkElement>(
      `link[href="${PPL_CSS_URL}"]`
    )
    if (existingLink) {
      return
    }

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = PPL_CSS_URL
    document.head.appendChild(link)
  }, [])

  // Main effect: attach event listener and load script
  useEffect(() => {
    if (!isReady) {
      return
    }

    mountIdRef.current += 1
    const currentMountId = mountIdRef.current

    // Event handler for PPL widget selection
    // Official event: "ppl-parcelshop-map" on document, data in event.detail
    const handlePplSelection = (event: Event) => {
      const customEvent = event as CustomEvent<PplEventDetail>
      const detail = customEvent.detail

      if (process.env["NODE_ENV"] === "development") {
        console.log("[PplWidget] Selection event received:", detail)
      }

      if (detail?.code) {
        onSelectRef.current({
          code: detail.code,
          name: detail.name || "",
          type: detail.accessPointType || "ParcelShop",
          address: {
            ...(detail.street ? { street: detail.street } : {}),
            ...(detail.city ? { city: detail.city } : {}),
            ...(detail.zipCode ? { zipCode: detail.zipCode } : {}),
            ...(detail.country ? { country: detail.country } : {}),
          },
        })
      }
    }

    // Attach event listener BEFORE loading script
    document.addEventListener("ppl-parcelshop-map", handlePplSelection)

    // Remove any existing PPL script to force reinitialization
    const existingScript = document.querySelector(
      `script[src="${PPL_SCRIPT_URL}"]`
    )
    if (existingScript) {
      existingScript.remove()
    }

    // Load script dynamically
    const script = document.createElement("script")
    script.src = PPL_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (currentMountId !== mountIdRef.current) {
        return
      }
      if (process.env["NODE_ENV"] === "development") {
        console.log("[PplWidget] Script loaded, widget should initialize")
      }
    }
    document.body.appendChild(script)

    return () => {
      document.removeEventListener("ppl-parcelshop-map", handlePplSelection)
      // Don't remove script on cleanup - let next mount handle it
    }
  }, [isReady])

  // Determine final lat/lng
  const finalLat = hasLatLngProps ? lat : geoLocation?.lat
  const finalLng = hasLatLngProps ? lng : geoLocation?.lng

  return (
    <div
      data-country={country.toLowerCase()}
      data-language={language}
      data-mode={mode}
      id={WIDGET_ID}
      {...(finalLat !== undefined && { "data-lat": finalLat })}
      {...(finalLng !== undefined && { "data-lng": finalLng })}
      {...(address && { "data-address": address })}
      {...(selectedCode && { "data-code": selectedCode })}
      {...(initialFilters && { "data-initialfilters": initialFilters })}
      className="w-full rounded border border-border-secondary"
      style={{ minHeight: "400px" }}
    />
  )
}
