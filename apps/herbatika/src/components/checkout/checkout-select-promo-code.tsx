import { Icon } from "@techsio/ui-kit/atoms/icon"
import {
  Select,
  type SelectItem,
} from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"

const PROMO_CODE_ITEMS: SelectItem[] = []

export const CheckoutSelectPromoCode = () => {
  const tCheckout = useTranslations("checkout")

  return (
    <Select items={PROMO_CODE_ITEMS} readOnly>
      <Select.Label className="sr-only">
        {tCheckout("promo_code_label")}
      </Select.Label>
      <Select.Control>
        <Select.Trigger
          className="min-h-12 border-1 bg-base px-400"
          iconSize="lg"
        >
          <Icon icon="token-icon-label" size="lg" />
          <Select.ValueText
            className="text-sm data-[placeholder]:text-fg-primary"
            placeholder={tCheckout("promo_code_placeholder")}
          />
        </Select.Trigger>
      </Select.Control>
    </Select>
  )
}
