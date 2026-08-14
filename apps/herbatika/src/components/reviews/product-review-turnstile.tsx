"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import Script from "next/script"
import { useCallback, useEffect, useRef, useState } from "react"
import { productReviewTurnstileConfig } from "./product-review-turnstile-config"

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script"
const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type TurnstileWidgetId = string

type TurnstileRenderOptions = {
  action: string
  appearance: "always"
  callback: (token: string) => void
  "error-callback": () => void
  "expired-callback": () => void
  language: "auto"
  "response-field": false
  sitekey: string
  size: "flexible"
  theme: "auto"
  "timeout-callback": () => void
}

type TurnstileApi = {
  remove: (widgetId: TurnstileWidgetId) => void
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions
  ) => TurnstileWidgetId
  reset: (widgetId: TurnstileWidgetId) => void
}

type TurnstileWindow = Window & {
  turnstile?: TurnstileApi
}

type ProductReviewTurnstileProps = {
  errorMessage?: string
  label: string
  resetKey?: number
  unavailableMessage: string
  onTokenChange: (token: string | null) => void
}

const getTurnstileApi = () => (window as TurnstileWindow).turnstile

export const isProductReviewTurnstileEnabled =
  productReviewTurnstileConfig.enabled

export function ProductReviewTurnstile({
  errorMessage,
  label,
  resetKey,
  unavailableMessage,
  onTokenChange,
}: ProductReviewTurnstileProps) {
  const containerRef = useRef<HTMLFieldSetElement>(null)
  const onTokenChangeRef = useRef(onTokenChange)
  const widgetIdRef = useRef<TurnstileWidgetId | null>(null)
  const [isScriptReady, setIsScriptReady] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)

  useEffect(() => {
    onTokenChangeRef.current = onTokenChange
  }, [onTokenChange])

  const removeWidget = useCallback(() => {
    const turnstile = getTurnstileApi()

    if (turnstile && widgetIdRef.current) {
      turnstile.remove(widgetIdRef.current)
    }

    widgetIdRef.current = null
  }, [])

  const resetWidget = useCallback(() => {
    onTokenChangeRef.current(null)

    const turnstile = getTurnstileApi()
    if (turnstile && widgetIdRef.current) {
      turnstile.reset(widgetIdRef.current)
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resetKey` intentionally recreates the single-use Turnstile widget after a form submission or reset.
  useEffect(() => {
    if (
      !(
        productReviewTurnstileConfig.enabled &&
        productReviewTurnstileConfig.siteKey &&
        isScriptReady &&
        containerRef.current
      )
    ) {
      return
    }

    const turnstile = getTurnstileApi()
    if (!turnstile) {
      setWidgetError(unavailableMessage)
      return
    }

    removeWidget()
    onTokenChangeRef.current(null)
    setWidgetError(null)

    widgetIdRef.current = turnstile.render(containerRef.current, {
      action: "product_review",
      appearance: "always",
      callback: (token) => {
        setWidgetError(null)
        onTokenChangeRef.current(token)
      },
      "error-callback": () => {
        onTokenChangeRef.current(null)
        setWidgetError(unavailableMessage)
      },
      "expired-callback": resetWidget,
      language: "auto",
      "response-field": false,
      sitekey: productReviewTurnstileConfig.siteKey,
      size: "flexible",
      theme: "auto",
      "timeout-callback": () => {
        setWidgetError(unavailableMessage)
        resetWidget()
      },
    })

    return removeWidget
  }, [isScriptReady, removeWidget, resetKey, resetWidget, unavailableMessage])

  if (!productReviewTurnstileConfig.enabled) {
    return null
  }

  if (!productReviewTurnstileConfig.siteKey) {
    return (
      <StatusText align="start" showIcon status="error">
        {unavailableMessage}
      </StatusText>
    )
  }

  return (
    <div className="space-y-150">
      <Script
        id={TURNSTILE_SCRIPT_ID}
        onError={() => setWidgetError(unavailableMessage)}
        onReady={() => setIsScriptReady(true)}
        src={TURNSTILE_SCRIPT_SRC}
        strategy="afterInteractive"
      />
      <fieldset ref={containerRef}>
        <legend className="sr-only">{label}</legend>
      </fieldset>
      {errorMessage || widgetError ? (
        <StatusText align="start" showIcon status="error">
          {errorMessage ?? widgetError}
        </StatusText>
      ) : null}
    </div>
  )
}
