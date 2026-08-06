import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { isRecord } from "@techsio/std/object"
import type { CSSProperties, ReactNode } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

export const handle = {
  breadcrumb: () => "Payload",
}

/** Runtime config returned by the Payload admin config endpoint. */
interface PayloadRuntimeConfig {
  iframeUrl?: string
  isIframeEnabled?: boolean
}

const payloadFrameBackground = "rgb(20, 20, 20)"
const payloadFrameForeground = "#f9fafb"
const trailingSlashRegex = /\/$/u

const darkStatusStyle: CSSProperties = {
  backgroundColor: payloadFrameBackground,
  color: payloadFrameForeground,
  colorScheme: "dark",
  minHeight: "100vh",
  padding: "1.5rem",
}

const getAdminUrl = (backendUrl: string | undefined, path: string) =>
  backendUrl !== undefined && backendUrl.length > 0
    ? `${backendUrl.replace(trailingSlashRegex, "")}${path}`
    : path

const isPayloadRuntimeConfig = (
  value: unknown,
): value is PayloadRuntimeConfig => {
  if (!isRecord(value)) {
    return false
  }
  if (
    value["iframeUrl"] !== undefined &&
    typeof value["iframeUrl"] !== "string"
  ) {
    return false
  }

  return (
    value["isIframeEnabled"] === undefined ||
    typeof value["isIframeEnabled"] === "boolean"
  )
}

const fetchPayloadRuntimeConfig = async (
  configUrl: string,
): Promise<PayloadRuntimeConfig> => {
  const response = await fetch(configUrl)
  if (!response.ok) {
    throw new Error(`Payload configuration request failed (${response.status})`)
  }

  const data: unknown = await response.json()
  if (!isPayloadRuntimeConfig(data)) {
    throw new Error("Payload configuration response is invalid")
  }

  return data
}

const getPayloadReturnTo = (iframeUrl: string | undefined) => {
  if (iframeUrl === undefined || iframeUrl.length === 0) {
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
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const ssoBase = getAdminUrl(backendUrl, "/admin/payload/sso")
  const configUrl = getAdminUrl(backendUrl, "/admin/payload/config")
  const {
    data: runtimeConfig,
    isError: configError,
    isLoading: configLoading,
  } = useQuery({
    queryFn: async () => await fetchPayloadRuntimeConfig(configUrl),
    queryKey: ["payload-runtime-config", configUrl],
  })

  const iframeUrl = runtimeConfig?.iframeUrl
  const isIframeEnabled = runtimeConfig?.isIframeEnabled ?? true
  const returnTo = getPayloadReturnTo(iframeUrl)
  const iframeSrc = `${ssoBase}?returnTo=${encodeURIComponent(returnTo)}`

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const hasOpenedRef = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    let observer: ResizeObserver | undefined

    if (container !== null) {
      const updateHeight = () => {
        const rect = container.getBoundingClientRect()
        const parent = container.parentElement
        const parentStyles =
          parent === null ? null : window.getComputedStyle(parent)
        const parsedPadding =
          parentStyles === null ? 0 : Number(parentStyles.paddingBottom)
        const paddingBottom = Number.isNaN(parsedPadding) ? 0 : parsedPadding
        const nextHeight = Math.max(
          0,
          window.innerHeight - rect.top - paddingBottom,
        )
        setHeight(nextHeight)
      }

      updateHeight()
      observer = new ResizeObserver(updateHeight)
      observer.observe(container)
      if (container.parentElement !== null) {
        observer.observe(container.parentElement)
      }
    }

    return () => {
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    const shouldOpen =
      !isIframeEnabled &&
      !hasOpenedRef.current &&
      iframeUrl !== undefined &&
      iframeUrl.length > 0

    if (shouldOpen) {
      hasOpenedRef.current = true
      window.open(iframeSrc, "_blank", "noopener,noreferrer")
    }
  }, [iframeSrc, iframeUrl, isIframeEnabled])

  if (configLoading) {
    return <PayloadDarkStatus>Loading Payload configuration…</PayloadDarkStatus>
  }

  if (configError && runtimeConfig === undefined) {
    return (
      <PayloadDarkStatus>
        Unable to load Payload configuration.
      </PayloadDarkStatus>
    )
  }

  if (iframeUrl === undefined || iframeUrl.length === 0) {
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
        backgroundColor: payloadFrameBackground,
        colorScheme: "dark",
        height: height === null ? iframeHeight : `${height}px`,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <iframe
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation"
        src={iframeSrc}
        style={{
          backgroundColor: payloadFrameBackground,
          border: "0",
          colorScheme: "dark",
          display: "block",
          height: "100%",
          width: "100%",
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
