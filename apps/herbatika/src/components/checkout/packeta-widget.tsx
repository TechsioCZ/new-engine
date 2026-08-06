"use client"

import { useImperativeHandle } from "react"
import type { RefObject } from "react"

import { runDetachedPromise } from "@/lib/storefront/detached-promise"

import { loadPacketaWidget } from "./packeta-widget-loader"
import type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "./packeta-widget.types"

export type { PacketaWidgetHandle } from "./packeta-widget.types"

interface PacketaPickupWidgetProps {
  apiKey: string
  options?: PacketaWidgetOptions
  onClose?: () => void
  onError?: (error: PacketaWidgetError) => void
  onSelect?: (point: PacketaPickupPoint) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const readNullableString = (value: unknown) =>
  typeof value === "string" || value === null ? value : undefined

const parsePacketaPickupPoint = (value: unknown): PacketaPickupPoint | null => {
  if (!isRecord(value)) {
    return null
  }

  const city = readNullableString(Reflect.get(value, "city"))
  const country = readNullableString(Reflect.get(value, "country"))
  const error = readNullableString(Reflect.get(value, "error"))
  const group = readNullableString(Reflect.get(value, "group"))
  const id = readNullableString(Reflect.get(value, "id"))
  const name = readNullableString(Reflect.get(value, "name"))
  const pickupPointType = readNullableString(
    Reflect.get(value, "pickupPointType"),
  )
  const place = readNullableString(Reflect.get(value, "place"))
  const street = readNullableString(Reflect.get(value, "street"))
  const zip = readNullableString(Reflect.get(value, "zip"))

  return {
    ...(city === undefined ? {} : { city }),
    ...(country === undefined ? {} : { country }),
    ...(error === undefined ? {} : { error }),
    ...(group === undefined ? {} : { group }),
    ...(id === undefined ? {} : { id }),
    ...(name === undefined ? {} : { name }),
    ...(pickupPointType === undefined ? {} : { pickupPointType }),
    ...(place === undefined ? {} : { place }),
    ...(street === undefined ? {} : { street }),
    ...(zip === undefined ? {} : { zip }),
  }
}

const closePacketaWidget = () => {
  try {
    window.Packeta?.Widget.close()
  } catch {
    // Packeta may already have removed its modal after selection.
  }
}

export const PacketaPickupWidget = ({
  apiKey,
  options,
  onClose,
  onError,
  onSelect,
  ref,
}: PacketaPickupWidgetProps & {
  ref?: RefObject<PacketaWidgetHandle | null>
}) => {
  const openWidget = async () => {
    let packeta
    try {
      packeta = await loadPacketaWidget()
    } catch (error) {
      onError?.({
        code: "loader_failed",
        message:
          error instanceof Error
            ? error.message
            : "Packeta widget sa nepodarilo načítať.",
      })
      return
    }

    try {
      packeta.Widget.pick(
        apiKey,
        (point: unknown) => {
          if (point === null) {
            onClose?.()
            return
          }

          const pickupPoint = parsePacketaPickupPoint(point)
          if (pickupPoint === null) {
            onError?.({
              code: "invalid_selection",
              message: "Packeta returned an invalid pickup point payload.",
            })
            return
          }

          onSelect?.(pickupPoint)
        },
        options,
      )
    } catch (error) {
      onError?.({
        code: "open_failed",
        message:
          error instanceof Error
            ? error.message
            : "Packeta widget sa nepodarilo otvoriť.",
      })
    }
  }

  useImperativeHandle(ref, () => ({
    close: closePacketaWidget,
    open: () => {
      runDetachedPromise(openWidget())
    },
  }))

  return <span aria-hidden hidden />
}
