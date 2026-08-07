import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"

type CheckoutPurchaseTypeToggleProps = {
  companyLabel: string
  groupLabel: string
  id: string
  isCompanyPurchase: boolean
  onValueChange: (isCompanyPurchase: boolean) => void
  privateLabel: string
}

export function CheckoutPurchaseTypeToggle({
  companyLabel,
  groupLabel,
  id,
  isCompanyPurchase,
  onValueChange,
  privateLabel,
}: CheckoutPurchaseTypeToggleProps) {
  return (
    <RadioGroup
      className="w-auto font-rubik"
      id={id}
      onValueChange={(value) => {
        onValueChange(value === "company")
      }}
      orientation="horizontal"
      size="sm"
      value={isCompanyPurchase ? "company" : "private"}
      variant="subtle"
    >
      <RadioGroup.Label className="sr-only">{groupLabel}</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        <RadioGroup.Item value="private">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{privateLabel}</RadioGroup.ItemText>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
        <RadioGroup.Item value="company">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{companyLabel}</RadioGroup.ItemText>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
      </RadioGroup.ItemGroup>
    </RadioGroup>
  )
}
