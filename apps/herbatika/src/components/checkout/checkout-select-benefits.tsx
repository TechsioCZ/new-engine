import { Icon } from "@techsio/ui-kit/atoms/icon"
import {
  Select,
  type SelectItem,
} from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"

const BENEFIT_ITEMS: SelectItem[] = []

export const CheckoutSelectBenefits = () => {
  const tCheckout = useTranslations("checkout")

  return (
    <Select className="gap-y-50" items={BENEFIT_ITEMS} readOnly>
      <Select.Label className="font-medium text-sm">
        {tCheckout("benefits_label")}
      </Select.Label>
      <Select.Control>
        <Select.Trigger
          className="min-h-12 bg-surface-secondary px-400"
          iconSize="lg"
        >
          <Icon icon="token-icon-shopping-basket-in" size="lg" />
          <Select.ValueText
            className="text-sm data-[placeholder]:text-fg-primary"
            placeholder={tCheckout("return_policy_benefit")}
          />
        </Select.Trigger>
      </Select.Control>
    </Select>
  )
}
