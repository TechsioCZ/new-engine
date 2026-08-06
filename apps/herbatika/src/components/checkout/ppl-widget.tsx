"use client"

import {
  createElement,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import type { RefObject } from "react"

import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import { loadPplWidgetLoader } from "./ppl-widget-loader"
import type {
  PplAccessPoint,
  PplWidgetConfig,
  PplWidgetElement,
  PplWidgetError,
  PplWidgetHandle,
} from "./ppl-widget.types"

export type { PplWidgetHandle } from "./ppl-widget.types"

interface PplAccessPointWidgetProps {
  apiKey: string
  config?: PplWidgetConfig
  onClose?: () => void
  onError?: (error: PplWidgetError) => void
  onReady?: () => void
  onSelect?: (accessPoint: PplAccessPoint) => void
}

const EMPTY_CONFIG: PplWidgetConfig = {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readNullableString = (value: unknown) =>
  typeof value === "string" || value === null ? value : undefined

const parsePplAddress = (value: unknown): PplAccessPoint["address"] => {
  if (!isRecord(value)) {
    return value === null ? null : undefined
  }

  const city = readNullableString(Reflect.get(value, "city"))
  const country = readNullableString(Reflect.get(value, "country"))
  const countryCode = readNullableString(Reflect.get(value, "countryCode"))
  const street = readNullableString(Reflect.get(value, "street"))
  const zipCode = readNullableString(Reflect.get(value, "zipCode"))
  return {
    ...(city === undefined ? {} : { city }),
    ...(country === undefined ? {} : { country }),
    ...(countryCode === undefined ? {} : { countryCode }),
    ...(street === undefined ? {} : { street }),
    ...(zipCode === undefined ? {} : { zipCode }),
  }
}

const parsePplAccessPoint = (value: unknown): PplAccessPoint | null => {
  if (!isRecord(value)) {
    return null
  }

  const address = parsePplAddress(Reflect.get(value, "address"))
  const code = readNullableString(Reflect.get(value, "code"))
  const name = readNullableString(Reflect.get(value, "name"))
  const type = readNullableString(Reflect.get(value, "type"))
  return {
    ...(address === undefined ? {} : { address }),
    ...(code === undefined ? {} : { code }),
    ...(name === undefined ? {} : { name }),
    ...(type === undefined ? {} : { type }),
  }
}

const isPplWidgetError = (value: unknown): value is PplWidgetError =>
  isRecord(value) &&
  typeof Reflect.get(value, "code") === "string" &&
  typeof Reflect.get(value, "message") === "string"

export const PplAccessPointWidget = ({
  apiKey,
  config = EMPTY_CONFIG,
  onClose,
  onError,
  onReady,
  onSelect,
  ref,
}: PplAccessPointWidgetProps & { ref?: RefObject<PplWidgetHandle | null> }) => {
  const shouldOpenAfterLoadRef = useRef(false)
  const [widget, setWidget] = useState<PplWidgetElement | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const serializedConfig = JSON.stringify(config)

  const handleCloseEvent = useEffectEvent(() => {
    onClose?.()
  })
  const handleErrorEvent = useEffectEvent((widgetError: PplWidgetError) => {
    onError?.(widgetError)
  })
  const handleReadyEvent = useEffectEvent(() => {
    onReady?.()
  })
  const handleSelectEvent = useEffectEvent((accessPoint: PplAccessPoint) => {
    onSelect?.(accessPoint)
  })

  useImperativeHandle(ref, () => ({
    close: () => {
      widget?.close?.()
    },
    getSelectedAccessPoint: () => widget?.getSelectedAccessPoint?.() ?? null,
    open: () => {
      if (typeof widget?.open === "function") {
        widget.open()
        return
      }

      shouldOpenAfterLoadRef.current = true
    },
    reset: () => {
      widget?.reset?.()
    },
  }))

  useEffect(() => {
    let cancelled = false

    const loadWidget = async () => {
      try {
        await loadPplWidgetLoader()
        if (!cancelled) {
          setIsLoaded(true)
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        handleErrorEvent({
          code: "loader_failed",
          message:
            error instanceof Error
              ? error.message
              : "PPL widget sa nepodarilo načítať.",
        })
      }
    }

    runDetachedPromise(loadWidget())

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!(isLoaded && widget !== null)) {
      return
    }

    widget.configure?.(config)

    if (shouldOpenAfterLoadRef.current) {
      shouldOpenAfterLoadRef.current = false
      widget.open?.()
    }
  }, [config, isLoaded, widget])

  useEffect(() => {
    const handleSelect = (event: Event) => {
      if ("detail" in event) {
        const accessPoint = parsePplAccessPoint(event.detail)
        if (accessPoint !== null) {
          handleSelectEvent(accessPoint)
        }
      }
    }
    const handleClose = () => {
      handleCloseEvent()
    }
    const handleReady = () => {
      handleReadyEvent()
    }
    const handleError = (event: Event) => {
      if ("detail" in event && isPplWidgetError(event.detail)) {
        handleErrorEvent(event.detail)
      }
    }

    if (isLoaded && widget !== null) {
      widget.addEventListener("ppl-accesspointwidget-select", handleSelect)
      widget.addEventListener("ppl-accesspointwidget-close", handleClose)
      widget.addEventListener("ppl-accesspointwidget-ready", handleReady)
      widget.addEventListener("ppl-accesspointwidget-error", handleError)
    }

    return () => {
      if (widget !== null) {
        widget.removeEventListener("ppl-accesspointwidget-select", handleSelect)
        widget.removeEventListener("ppl-accesspointwidget-close", handleClose)
        widget.removeEventListener("ppl-accesspointwidget-ready", handleReady)
        widget.removeEventListener("ppl-accesspointwidget-error", handleError)
      }
    }
  }, [isLoaded, widget])

  if (!isLoaded) {
    return null
  }

  return (
    <>
      {createElement("ppl-access-point-widget", {
        "api-key": apiKey,
        config: serializedConfig,
        ref: setWidget,
      })}
    </>
  )
}
