import { Icon } from "@techsio/ui-kit/atoms/icon"
import type { IconType } from "@techsio/ui-kit/atoms/icon"
import { RadioCard } from "@techsio/ui-kit/molecules/radio-card"
import type { ReactNode } from "react"

const CheckoutOptionPrice = ({
  priceLabel,
  priceTone = "default",
}: {
  priceLabel: string
  priceTone?: CheckoutOptionRadioCardItem["priceTone"]
}) => (
  <div className="flex shrink-0 flex-col items-end text-right">
    <span
      className={
        priceTone === "success"
          ? "font-medium text-sm text-success leading-tight"
          : "font-medium text-fg-primary text-sm leading-tight"
      }
    >
      {priceLabel}
    </span>
  </div>
)

interface CheckoutOptionRadioCardItem {
  actionLabel?: string
  addon?: ReactNode
  bodyText?: string
  disabled?: boolean
  hint?: string
  icon: IconType
  priceLabel: string
  priceTone?: "default" | "success"
  title: string
  value: string
}

interface CheckoutOptionRadioCardProps {
  expandedValue?: string | null
  label: string
  onValueChange: (value: string) => void
  options: CheckoutOptionRadioCardItem[]
  value?: string | null
}

export const CheckoutOptionRadioCard = ({
  expandedValue,
  label,
  onValueChange,
  options,
  value,
}: CheckoutOptionRadioCardProps) => (
  <RadioCard
    onValueChange={(nextValue) => {
      if (typeof nextValue !== "string" || nextValue.length === 0) {
        return
      }

      onValueChange(nextValue)
    }}
    orientation="vertical"
    size="sm"
    value={value ?? null}
    variant="outline"
  >
    <RadioCard.Label className="sr-only">{label}</RadioCard.Label>

    {options.map((option) => {
      const isSelected = value === option.value
      const isExpanded = isSelected || expandedValue === option.value
      const hasExpandedContent =
        option.bodyText !== undefined ||
        option.actionLabel !== undefined ||
        option.addon !== undefined

      return (
        <RadioCard.Item
          className="data-[state=checked]:border-2"
          disabled={option.disabled}
          key={option.value}
          value={option.value}
        >
          <RadioCard.ItemHiddenInput />
          <RadioCard.ItemControl className="items-center">
            <RadioCard.ItemIndicator />

            <div className="flex min-w-0 flex-1 items-center gap-200">
              <span className="flex shrink-0 items-center justify-center text-fg-primary">
                <Icon icon={option.icon} size="lg" />
              </span>

              <RadioCard.ItemContent className="flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-150 gap-y-50">
                  <RadioCard.ItemText className="data-[state=checked]:font-semibold">
                    {option.title}
                  </RadioCard.ItemText>

                  {option.hint !== undefined && option.hint.length > 0 ? (
                    <span className="text-fg-secondary text-xs leading-tight">
                      {option.hint}
                    </span>
                  ) : null}
                </div>
              </RadioCard.ItemContent>
            </div>

            <CheckoutOptionPrice
              priceLabel={option.priceLabel}
              priceTone={option.priceTone}
            />
          </RadioCard.ItemControl>

          {isExpanded && hasExpandedContent ? (
            <RadioCard.ItemAddon className="space-y-100">
              {option.bodyText !== undefined && option.bodyText.length > 0 ? (
                <p className="text-fg-secondary text-xs leading-relaxed">
                  {option.bodyText}
                </p>
              ) : null}

              {option.actionLabel !== undefined &&
              option.actionLabel.length > 0 ? (
                <span className="inline-flex font-semibold text-primary text-xs underline">
                  {option.actionLabel}
                </span>
              ) : null}

              {option.addon}
            </RadioCard.ItemAddon>
          ) : null}
        </RadioCard.Item>
      )
    })}
  </RadioCard>
)
