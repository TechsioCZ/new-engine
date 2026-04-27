import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

/** Runtime config returned by the Payload admin config endpoint. */
type PayloadRuntimeConfig = {
  iframeUrl?: string
  isIframeEnabled?: boolean
}

/** Admin settings page that embeds (or links to) the Payload admin UI. */
const PayloadRedirectPage = () => {
  const [runtimeConfig, setRuntimeConfig] =
    useState<PayloadRuntimeConfig | null>(null)
  const [configError, setConfigError] = useState(false)
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  const ssoBase = backendUrl
    ? `${backendUrl.replace(/\/$/, "")}/admin/payload/sso`
    : "/admin/payload/sso"
  const configUrl = backendUrl
    ? `${backendUrl.replace(/\/$/, "")}/admin/payload/config`
    : "/admin/payload/config"

  useEffect(() => {
    let isMounted = true
    fetch(configUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data) {
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
  }, [])

  const iframeUrl = runtimeConfig?.iframeUrl
  const isIframeEnabled = runtimeConfig?.isIframeEnabled ?? true

  let returnTo = "/"
  if (iframeUrl) {
    try {
      const parsed = new URL(iframeUrl)
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
      returnTo = path && path.startsWith("/") ? path : "/"
    } catch {
      returnTo = "/"
    }
  }

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
        ? parseFloat(parentStyles.paddingBottom) || 0
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
  }, [iframeSrc, isIframeEnabled])

  if (!runtimeConfig && !configError) {
    return (
      <div style={{ padding: "1.5rem" }}>
        Loading Payload configuration…
      </div>
    )
  }

  if (configError && !runtimeConfig) {
    return (
      <div style={{ padding: "1.5rem" }}>
        Unable to load Payload configuration.
      </div>
    )
  }

  if (!iframeUrl) {
    return (
      <div style={{ padding: "1.5rem" }}>
        Payload iframe URL is not configured.
      </div>
    )
  }

  if (!isIframeEnabled) {
    return (
      <div style={{ padding: "1.5rem" }}>
        <p>Opening Payload Admin in a new tab…</p>
      </div>
    )
  }

  const iframeHeight = "calc(100vh - 64px)"

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: height !== null ? `${height}px` : iframeHeight,
        overflow: "hidden",
      }}
    >
      <iframe
        title="Payload Admin"
        src={iframeSrc}
        style={{
          width: "100%",
          height: "100%",
          border: "0",
        }}
      />
    </div>
  )
}

/** Route metadata for the Payload settings page. */
export const config = defineRouteConfig({
  label: "Payload",
})

export default PayloadRedirectPage
