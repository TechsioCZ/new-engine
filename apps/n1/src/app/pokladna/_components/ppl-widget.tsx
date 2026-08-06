"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"

export interface PplAccessPointData {
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

const DEFAULT_PPL_LANGUAGE: PplLanguage = "cs"
const PPL_LANGUAGE_CODES: ReadonlySet<string> = new Set(PPL_SUPPORTED_LANGUAGES)

const isPplLanguage = (value: string): value is PplLanguage =>
  PPL_LANGUAGE_CODES.has(value)

/** Treats `undefined` and the empty string alike, matching PPL's optional fields */
const isFilledString = (value: unknown): value is string =>
  typeof value === "string" && value !== ""

const readFilledString = (
  source: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = source[key]
  return isFilledString(value) ? value : undefined
}

const isPplSelectionObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

/**
 * Detect language from document.documentElement.lang
 * Returns PPL-supported language or fallback to "cs"
 */
const detectPplLanguage = (): PplLanguage => {
  if (typeof document === "undefined") {
    return DEFAULT_PPL_LANGUAGE
  }

  const htmlLang = document.documentElement.lang?.split("-")[0]?.toLowerCase()

  if (htmlLang !== undefined && isPplLanguage(htmlLang)) {
    return htmlLang
  }

  return DEFAULT_PPL_LANGUAGE
}

interface OptionalPermissions {
  readonly query?: Permissions["query"]
}

interface QueryablePermissions {
  readonly query: Permissions["query"]
}

const canQueryPermissions = (
  permissions: OptionalPermissions | undefined,
): permissions is QueryablePermissions => permissions?.query !== undefined

/**
 * The DOM lib declares these navigator APIs as always present, but they are
 * absent in non-browser runtimes and in browsers without geolocation support.
 * Reading them through an optional view keeps the probes honest instead of
 * testing a value the type system believes can never be missing.
 */
interface OptionalNavigatorApis {
  readonly geolocation?: Geolocation
  readonly permissions?: OptionalPermissions
}

const readOptionalNavigatorApis = (): OptionalNavigatorApis => navigator

const hasGeolocationSupport = (): boolean =>
  typeof navigator !== "undefined" &&
  readOptionalNavigatorApis().geolocation !== undefined

interface PplWidgetProps {
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

/**
 * Reads the payload the PPL script publishes on `CustomEvent.detail`. The value
 * crosses a third-party boundary, so it stays `unknown` until narrowed.
 */
const readEventDetail = (event: Event): unknown =>
  "detail" in event ? event.detail : undefined

/**
 * Narrows a PPL selection payload. PPL sends `code`, `name`, `accessPointType`
 * and the flat address fields (`street`, `city`, `zipCode`, `country`).
 */
const parsePplSelection = (detail: unknown): PplAccessPointData | undefined => {
  if (!isPplSelectionObject(detail)) {
    return undefined
  }

  const code = readFilledString(detail, "code")

  if (code === undefined) {
    return undefined
  }

  const street = readFilledString(detail, "street")
  const city = readFilledString(detail, "city")
  const zipCode = readFilledString(detail, "zipCode")
  const country = readFilledString(detail, "country")
  const { name } = detail

  return {
    address: {
      ...(street === undefined ? {} : { street }),
      ...(city === undefined ? {} : { city }),
      ...(zipCode === undefined ? {} : { zipCode }),
      ...(country === undefined ? {} : { country }),
    },
    code,
    name: typeof name === "string" ? name : "",
    type: readFilledString(detail, "accessPointType") ?? "ParcelShop",
  }
}

const PPL_SCRIPT_URL = "https://www.ppl.cz/sources/map/main.js"
const PPL_CSS_URL = "https://www.ppl.cz/sources/map/main.css"
/** Container id the PPL script scans for */
const WIDGET_ID = "ppl-parcelshop-map"
/** Official event PPL dispatches on `document`, payload in `event.detail` */
const PPL_SELECTION_EVENT = "ppl-parcelshop-map"

/** Geolocation lookup phase; "settled" means the widget may boot */
type GeoPhase = "pending" | "settled"

export const PplWidget = ({
  onSelect,
  lat,
  lng,
  country = "CZ",
  address,
  selectedCode,
  mode = "default",
  initialFilters,
  language: languageProp,
}: PplWidgetProps) => {
  const hasLatLngProps = typeof lat === "number" && typeof lng === "number"
  const language = languageProp ?? detectPplLanguage()
  // Without geolocation support there is nothing to wait for, so the phase
  // starts settled instead of being flipped synchronously from an effect.
  const [geoPhase, setGeoPhase] = useState<GeoPhase>(() =>
    hasGeolocationSupport() ? "pending" : "settled",
  )
  const [geoLocation, setGeoLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const mountIdRef = useRef(0)

  // Effect Event: keeps the latest `onSelect` reachable from the document
  // listener without re-running the effect on parent re-renders.
  // This prevents widget/script reload when checkout context updates.
  const emitSelection = useEffectEvent((data: PplAccessPointData) => {
    onSelect(data)
  })

  const isReady = hasLatLngProps || geoPhase === "settled"

  // Request geolocation if not provided via props
  useEffect(() => {
    let cancelled = false
    // No geolocation lookup when coordinates arrive as props; without browser
    // support the phase initializer already settled the lookup.
    const navigatorApis = hasLatLngProps
      ? undefined
      : readOptionalNavigatorApis()
    const geolocation = navigatorApis?.geolocation
    const permissions = navigatorApis?.permissions

    if (geolocation !== undefined) {
      const startTime = Date.now()

      const handleSuccess = (position: GeolocationPosition) => {
        if (cancelled) {
          return
        }
        if (process.env.NODE_ENV === "development") {
          console.log("[PplWidget] Geolocation success:", {
            accuracy: `${position.coords.accuracy.toFixed(0)}m`,
            elapsed: `${Date.now() - startTime}ms`,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        }
        setGeoLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setGeoPhase("settled")
      }

      const handleError = (error: GeolocationPositionError) => {
        if (cancelled) {
          return
        }
        if (process.env.NODE_ENV === "development") {
          const errorMessages: Record<number, string> = {
            1: "PERMISSION_DENIED",
            2: "POSITION_UNAVAILABLE",
            3: "TIMEOUT",
          }
          console.log("[PplWidget] Geolocation error:", {
            code: errorMessages[error.code] ?? error.code,
            elapsed: `${Date.now() - startTime}ms`,
            message: error.message,
          })
        }
        setGeoPhase("settled")
      }

      const geoOptions: PositionOptions = {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 2000,
      }

      // Check permission first if available
      if (canQueryPermissions(permissions)) {
        const checkPermission = async () => {
          try {
            const status = await permissions.query({
              name: "geolocation",
            })

            if (cancelled) {
              return
            }

            if (process.env.NODE_ENV === "development") {
              console.log("[PplWidget] Geolocation permission:", status.state)
            }

            if (status.state === "granted") {
              geolocation.getCurrentPosition(
                handleSuccess,
                handleError,
                geoOptions,
              )
            } else {
              // Permission not granted (prompt/denied) - skip geolocation
              setGeoPhase("settled")
            }
          } catch {
            setGeoPhase("settled")
          }
        }

        void checkPermission()
      } else {
        geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions)
      }
    }

    return () => {
      cancelled = true
    }
  }, [hasLatLngProps])

  // Load CSS once
  useEffect(() => {
    const existingLink = document.head.querySelector<HTMLLinkElement>(
      `link[href="${PPL_CSS_URL}"]`,
    )
    if (existingLink) {
      return
    }

    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = PPL_CSS_URL
    document.head.append(link)
  }, [])

  // Main effect: attach event listener and load script
  useEffect(() => {
    mountIdRef.current += 1
    const currentMountId = mountIdRef.current

    // Handlers are declared unconditionally so the effect keeps a single
    // cleanup path; detaching a listener that was never attached is a no-op.
    const handlePplSelection = (event: Event) => {
      const detail = readEventDetail(event)

      if (process.env.NODE_ENV === "development") {
        console.log("[PplWidget] Selection event received:", detail)
      }

      const selection = parsePplSelection(detail)

      if (selection !== undefined) {
        emitSelection(selection)
      }
    }

    const handleScriptLoad = () => {
      if (currentMountId !== mountIdRef.current) {
        return
      }
      if (process.env.NODE_ENV === "development") {
        console.log("[PplWidget] Script loaded, widget should initialize")
      }
    }

    let script: HTMLScriptElement | undefined

    if (isReady) {
      // Attach event listener BEFORE loading script
      document.addEventListener(PPL_SELECTION_EVENT, handlePplSelection)

      // Remove any existing PPL script to force reinitialization
      const existingScript = document.querySelector(
        `script[src="${PPL_SCRIPT_URL}"]`,
      )
      if (existingScript) {
        existingScript.remove()
      }

      // Load script dynamically. PPL's bundle self-initializes on load by
      // scanning the document for #ppl-parcelshop-map, and the pickup dialog
      // remounts this widget on every open, so the bundle has to be re-executed
      // per mount. A server-rendered tag executes once and cannot do that.
      // oxlint-disable-next-line github/no-dynamic-script-tag -- third-party map bundle must re-execute on every widget mount; no server-template equivalent exists
      script = document.createElement("script")
      script.src = PPL_SCRIPT_URL
      script.async = true
      script.addEventListener("load", handleScriptLoad)
      document.body.append(script)
    }

    return () => {
      document.removeEventListener(PPL_SELECTION_EVENT, handlePplSelection)
      script?.removeEventListener("load", handleScriptLoad)
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
      {...(isFilledString(address) && { "data-address": address })}
      {...(isFilledString(selectedCode) && { "data-code": selectedCode })}
      {...(isFilledString(initialFilters) && {
        "data-initialfilters": initialFilters,
      })}
      className="w-full rounded border border-border-secondary"
      style={{ minHeight: "400px" }}
    />
  )
}
