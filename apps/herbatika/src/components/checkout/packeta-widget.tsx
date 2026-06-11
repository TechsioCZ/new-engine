"use client"

import { type RefObject, useCallback, useImperativeHandle, useRef } from "react"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "./packeta-widget.types"
import { loadPacketaWidget } from "./packeta-widget-loader"

export type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "./packeta-widget.types"

type PacketaPickupWidgetProps = {
  apiKey: string
  options?: PacketaWidgetOptions
  onClose?: () => void
  onError?: (error: PacketaWidgetError) => void
  onSelect?: (point: PacketaPickupPoint) => void
}

export const PacketaPickupWidget = function PacketaPickupWidget({
  apiKey,
  options,
  onClose,
  onError,
  onSelect,
  ref,
}: PacketaPickupWidgetProps & { ref?: RefObject<PacketaWidgetHandle | null> }) {
  const onCloseRef = useRef(onClose)
  const onErrorRef = useRef(onError)
  const onSelectRef = useRef(onSelect)
  const optionsRef = useRef(options)

  onCloseRef.current = onClose
  onErrorRef.current = onError
  onSelectRef.current = onSelect
  optionsRef.current = options

  const closeWidget = useCallback(() => {
    try {
      window.Packeta?.Widget.close()
    } catch {
      // Packeta may already have removed its modal after selection.
    }
  }, [])

  const openWidget = useCallback(() => {
    runDetachedPromise(
      loadPacketaWidget()
        .then((packeta) => {
          try {
            packeta.Widget.pick(
              apiKey,
              (point) => {
                if (point) {
                  onSelectRef.current?.(point)
                  return
                }

                onCloseRef.current?.()
              },
              optionsRef.current
            )
          } catch (error) {
            onErrorRef.current?.({
              code: "open_failed",
              message:
                error instanceof Error
                  ? error.message
                  : "Packeta widget sa nepodarilo otvoriť.",
            })
          }
        })
        .catch((error) => {
          onErrorRef.current?.({
            code: "loader_failed",
            message:
              error instanceof Error
                ? error.message
                : "Packeta widget sa nepodarilo načítať.",
          })
        })
    )
  }, [apiKey])

  useImperativeHandle(
    ref,
    () => ({
      close: closeWidget,
      open: openWidget,
    }),
    [closeWidget, openWidget]
  )

  return null
}
