"use client"

import Script from "next/script"
import { useTranslations } from "next-intl"
import { useEffect, useId, useRef } from "react"

declare global {
  // biome-ignore lint/style/useConsistentTypeDefinitions: Window augmentation requires an interface
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          callback: (token: string) => void
          "error-callback": () => void
          sitekey: string
          theme: "auto"
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

const enabled = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED === "1"
const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? ""

type TurnstileWidgetProps = {
  onTokenChange: (token: string | null) => void
}

export function TurnstileWidget({ onTokenChange }: TurnstileWidgetProps) {
  const tCatalog = useTranslations("catalog")
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenChangeRef = useRef(onTokenChange)
  const reactId = useId()
  onTokenChangeRef.current = onTokenChange

  useEffect(() => {
    const renderWidget = () => {
      if (!(enabled && siteKey && containerRef.current && window.turnstile)) {
        return
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token) => onTokenChangeRef.current(token),
        "error-callback": () => onTokenChangeRef.current(null),
      })
    }
    onTokenChangeRef.current(null)
    renderWidget()
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [])

  if (!enabled) {
    return null
  }

  if (!siteKey) {
    return (
      <p className="text-danger text-sm">
        {tCatalog("reviews.form.captcha_unavailable")}
      </p>
    )
  }

  return (
    <>
      <Script
        id={`turnstile-script-${reactId.replaceAll(":", "")}`}
        onLoad={() => {
          if (!(containerRef.current && window.turnstile)) {
            return
          }
          widgetIdRef.current = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: "auto",
            callback: (token) => onTokenChangeRef.current(token),
            "error-callback": () => onTokenChangeRef.current(null),
          })
        }}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
    </>
  )
}

export const isTurnstileRequired = enabled
