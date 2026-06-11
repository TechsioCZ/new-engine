"use client"

import {
  createElement,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import type {
  PplAccessPoint,
  PplWidgetConfig,
  PplWidgetElement,
  PplWidgetError,
  PplWidgetHandle,
} from "./ppl-widget.types"
import { loadPplWidgetLoader } from "./ppl-widget-loader"

export type {
  PplAccessPoint,
  PplWidgetConfig,
  PplWidgetError,
  PplWidgetHandle,
} from "./ppl-widget.types"

type PplAccessPointWidgetProps = {
  apiKey: string
  config?: PplWidgetConfig
  onClose?: () => void
  onError?: (error: PplWidgetError) => void
  onReady?: () => void
  onSelect?: (accessPoint: PplAccessPoint) => void
}

export const PplAccessPointWidget = function PplAccessPointWidget({
  apiKey,
  config = {},
  onClose,
  onError,
  onReady,
  onSelect,
  ref,
}: PplAccessPointWidgetProps & { ref?: RefObject<PplWidgetHandle | null> }) {
  const shouldOpenAfterLoadRef = useRef(false)
  const widgetRef = useRef<PplWidgetElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const serializedConfig = useMemo(() => JSON.stringify(config), [config])

  useImperativeHandle(ref, () => ({
    close: () => {
      widgetRef.current?.close?.()
    },
    getSelectedAccessPoint: () =>
      widgetRef.current?.getSelectedAccessPoint?.() ?? null,
    open: () => {
      if (widgetRef.current?.open) {
        widgetRef.current.open()
        return
      }

      shouldOpenAfterLoadRef.current = true
    },
    reset: () => {
      widgetRef.current?.reset?.()
    },
  }))

  useEffect(() => {
    let cancelled = false

    loadPplWidgetLoader()
      .then(() => {
        if (!cancelled) {
          setIsLoaded(true)
        }
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        onError?.({
          code: "loader_failed",
          message:
            error instanceof Error
              ? error.message
              : "PPL widget sa nepodarilo načítať.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [onError])

  useEffect(() => {
    const widget = widgetRef.current

    if (!(isLoaded && widget)) {
      return
    }

    widget.configure?.(config)

    if (shouldOpenAfterLoadRef.current) {
      shouldOpenAfterLoadRef.current = false
      widget.open?.()
    }
  }, [config, isLoaded])

  useEffect(() => {
    const widget = widgetRef.current

    if (!(isLoaded && widget)) {
      return
    }

    const handleSelect = (event: Event) => {
      onSelect?.((event as CustomEvent<PplAccessPoint>).detail)
    }
    const handleClose = () => {
      onClose?.()
    }
    const handleReady = () => {
      onReady?.()
    }
    const handleError = (event: Event) => {
      onError?.((event as CustomEvent<PplWidgetError>).detail)
    }

    widget.addEventListener("ppl-accesspointwidget-select", handleSelect)
    widget.addEventListener("ppl-accesspointwidget-close", handleClose)
    widget.addEventListener("ppl-accesspointwidget-ready", handleReady)
    widget.addEventListener("ppl-accesspointwidget-error", handleError)

    return () => {
      widget.removeEventListener("ppl-accesspointwidget-select", handleSelect)
      widget.removeEventListener("ppl-accesspointwidget-close", handleClose)
      widget.removeEventListener("ppl-accesspointwidget-ready", handleReady)
      widget.removeEventListener("ppl-accesspointwidget-error", handleError)
    }
  }, [isLoaded, onClose, onError, onReady, onSelect])

  if (!isLoaded) {
    return null
  }

  return createElement("ppl-access-point-widget", {
    "api-key": apiKey,
    config: serializedConfig,
    ref: widgetRef,
  })
}
