import { defineRouteConfig } from "@medusajs/admin-sdk"
import type { CSSProperties, ReactNode } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

/** Runtime config returned by the Payload admin config endpoint. */
type PayloadRuntimeConfig = {
  iframeUrl?: string
  isIframeEnabled?: boolean
}

const payloadFrameBackground = "rgb(20, 20, 20)"
const payloadFrameForeground = "#f9fafb"
const trailingSlashRegex = /\/$/

const darkStatusStyle: CSSProperties = {
  minHeight: "100vh",
  padding: "1.5rem",
  backgroundColor: payloadFrameBackground,
  color: payloadFrameForeground,
  colorScheme: "dark",
}

const getAdminUrl = (backendUrl: string | undefined, path: string) =>
  backendUrl ? `${backendUrl.replace(trailingSlashRegex, "")}${path}` : path

const getPayloadReturnTo = (iframeUrl: string | undefined) => {
  if (!iframeUrl) {
    return "/"
  }
  try {
    const parsed = new URL(iframeUrl)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return path?.startsWith("/") ? path : "/"
  } catch {
    return "/"
  }
}

const PayloadDarkStatus = ({ children }: { children: ReactNode }) => (
  <div style={darkStatusStyle}>{children}</div>
)

/** Admin settings page that embeds (or links to) the Payload admin UI. */
const PayloadRedirectPage = () => {
  const [runtimeConfig, setRuntimeConfig] =
    useState<PayloadRuntimeConfig | null>(null)
  const [configError, setConfigError] = useState(false)
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const ssoBase = getAdminUrl(backendUrl, "/admin/payload/sso")
  const configUrl = getAdminUrl(backendUrl, "/admin/payload/config")

  useEffect(() => {
    let isMounted = true
    fetch(configUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!(isMounted && data)) {
          if (isMounted) {
            setConfigError(true)
          }
          return
        }
        setRuntimeConfig({
          iframeUrl: data.iframeUrl,
          isIframeEnabled: data.isIframeEnabled,
        })
      })
      .catch(() => {
        if (isMounted) {
          setConfigError(true)
        }
      })
    return () => {
      isMounted = false
    }
  }, [configUrl])

  const iframeUrl = runtimeConfig?.iframeUrl
  const isIframeEnabled = runtimeConfig?.isIframeEnabled ?? true
  const returnTo = getPayloadReturnTo(iframeUrl)
  const iframeSrc = `${ssoBase}?returnTo=${encodeURIComponent(returnTo)}`

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const hasOpenedRef = useRef(false)

  useLayoutEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) {
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      const parent = containerRef.current.parentElement
      const parentStyles = parent ? window.getComputedStyle(parent) : null
      const paddingBottom = parentStyles
        ? Number.parseFloat(parentStyles.paddingBottom) || 0
        : 0
      const nextHeight = Math.max(
        0,
        window.innerHeight - rect.top - paddingBottom
      )
      setHeight(nextHeight)
    }

    updateHeight()
    window.addEventListener("resize", updateHeight)
    return () => {
      window.removeEventListener("resize", updateHeight)
    }
  }, [])

  useEffect(() => {
    if (isIframeEnabled || hasOpenedRef.current || !iframeUrl) {
      return
    }
    hasOpenedRef.current = true
    window.open(iframeSrc, "_blank", "noopener,noreferrer")
  }, [iframeSrc, iframeUrl, isIframeEnabled])

  if (!(runtimeConfig || configError)) {
    return <PayloadDarkStatus>Loading Payload configuration…</PayloadDarkStatus>
  }

  if (configError && !runtimeConfig) {
    return (
      <PayloadDarkStatus>
        Unable to load Payload configuration.
      </PayloadDarkStatus>
    )
  }

  if (!iframeUrl) {
    return (
      <PayloadDarkStatus>
        Payload iframe URL is not configured.
      </PayloadDarkStatus>
    )
  }

  if (!isIframeEnabled) {
    return (
      <PayloadDarkStatus>
        <p>Opening Payload Admin in a new tab…</p>
      </PayloadDarkStatus>
    )
  }

  const iframeHeight = "calc(100vh - 64px)"

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: height !== null ? `${height}px` : iframeHeight,
        backgroundColor: payloadFrameBackground,
        colorScheme: "dark",
        overflow: "hidden",
      }}
    >
      <iframe
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          backgroundColor: payloadFrameBackground,
          colorScheme: "dark",
          border: "0",
        }}
        title="Payload Admin"
      />
    </div>
  )
}

/** Route metadata for the Payload settings page. */
export const config = defineRouteConfig({
  label: "Payload",
})

export default PayloadRedirectPage
