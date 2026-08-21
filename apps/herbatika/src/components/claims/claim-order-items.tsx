"use client"

import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import { useTranslations } from "next-intl"
import type { VerifiedOrderItem } from "@/lib/claims/claims-api"

export type SelectedClaimItem = VerifiedOrderItem & { selectedQuantity: number }

type ClaimOrderItemsProps = {
  items: VerifiedOrderItem[]
  selectedItems: SelectedClaimItem[]
  onChange: (items: SelectedClaimItem[]) => void
}

export function ClaimOrderItems({
  items,
  selectedItems,
  onChange,
}: ClaimOrderItemsProps) {
  const t = useTranslations("claims")

  return (
    <fieldset className="flex flex-col gap-300">
      <legend className="mb-200 font-bold text-fg-primary text-lg">
        {t("select_products")}
      </legend>
      {items.map((item) => {
        const selected = selectedItems.find(({ id }) => id === item.id)
        return (
          <div
            className="grid gap-200 rounded-lg border border-border-base p-300 md:grid-cols-2 md:items-center"
            key={item.id}
          >
            <FormCheckbox
              checked={Boolean(selected)}
              id={`claim-item-${item.id}`}
              label={`${item.title} (${t("ordered_quantity", { quantity: item.quantity })})`}
              onCheckedChange={(checked) => {
                onChange(
                  checked
                    ? [...selectedItems, { ...item, selectedQuantity: 1 }]
                    : selectedItems.filter(({ id }) => id !== item.id)
                )
              }}
            />
            {selected ? (
              <NumericInput
                aria-label={t("item_quantity", { title: item.title })}
                id={`claim-quantity-${item.id}`}
                max={item.quantity}
                min={1}
                onChange={(quantity) =>
                  onChange(
                    selectedItems.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, selectedQuantity: quantity }
                        : candidate
                    )
                  )
                }
                size="sm"
                value={selected.selectedQuantity}
              >
                <NumericInput.Control>
                  <NumericInput.Input />
                  <NumericInput.TriggerContainer>
                    <NumericInput.IncrementTrigger />
                    <NumericInput.DecrementTrigger />
                  </NumericInput.TriggerContainer>
                </NumericInput.Control>
              </NumericInput>
            ) : null}
          </div>
        )
      })}
    </fieldset>
  )
}
