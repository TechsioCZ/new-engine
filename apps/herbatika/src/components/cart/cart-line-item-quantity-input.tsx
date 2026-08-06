"use client"

import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"

interface CartLineItemQuantityInputProps {
  className?: string
  controlClassName?: string
  inputClassName?: string
  isPending: boolean
  itemName: string
  lineItemId: string
  maxQuantity: number
  onRemove: (lineItemId: string) => void
  onUpdateQuantity: (lineItemId: string, quantity: number) => void
  quantity: number
  size?: "sm" | "md" | "lg"
}

interface QuantityDraft {
  lineItemId: string
  quantity: number
  sourceQuantity: number
}

export const CartLineItemQuantityInput = ({
  className,
  controlClassName,
  inputClassName,
  isPending,
  itemName,
  lineItemId,
  maxQuantity,
  onRemove,
  onUpdateQuantity,
  quantity,
  size = "md",
}: CartLineItemQuantityInputProps) => {
  const t = useTranslations("cart")
  const [quantityDraft, setQuantityDraft] = useState<QuantityDraft | null>(null)
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localQuantity =
    quantityDraft !== null &&
    quantityDraft.lineItemId === lineItemId &&
    quantityDraft.sourceQuantity === quantity
      ? quantityDraft.quantity
      : quantity

  const clearPendingUpdate = () => {
    if (updateTimeoutRef.current === null) {
      return
    }

    clearTimeout(updateTimeoutRef.current)
    updateTimeoutRef.current = null
  }

  useEffect(() => {
    if (updateTimeoutRef.current !== null) {
      clearTimeout(updateTimeoutRef.current)
      updateTimeoutRef.current = null
    }
  }, [lineItemId, quantity])

  useEffect(
    () => () => {
      if (updateTimeoutRef.current !== null) {
        clearTimeout(updateTimeoutRef.current)
      }
    },
    [],
  )

  const handleQuantityChange = (nextQuantity: number) => {
    if (!Number.isFinite(nextQuantity)) {
      return
    }

    const roundedQuantity = Math.round(nextQuantity)
    if (roundedQuantity <= 0) {
      clearPendingUpdate()
      onRemove(lineItemId)
      return
    }

    const normalizedQuantity = Math.max(
      1,
      Math.min(roundedQuantity, maxQuantity),
    )
    setQuantityDraft({
      lineItemId,
      quantity: normalizedQuantity,
      sourceQuantity: quantity,
    })
    clearPendingUpdate()

    if (normalizedQuantity === quantity) {
      return
    }

    updateTimeoutRef.current = setTimeout(() => {
      onUpdateQuantity(lineItemId, normalizedQuantity)
      updateTimeoutRef.current = null
    }, 250)
  }

  return (
    <NumericInput
      allowOverflow={false}
      className={className}
      max={maxQuantity}
      min={0}
      onChange={handleQuantityChange}
      size={size}
      value={localQuantity}
    >
      <NumericInput.Control className={controlClassName}>
        <NumericInput.DecrementTrigger
          disabled={isPending || localQuantity <= 0}
        />
        <NumericInput.Input
          aria-label={t("quantity_aria", { itemName })}
          className={inputClassName}
        />
        <NumericInput.IncrementTrigger
          disabled={isPending || localQuantity >= maxQuantity}
        />
      </NumericInput.Control>
    </NumericInput>
  )
}
