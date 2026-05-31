import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";

type CheckoutPurchaseTypeToggleProps = {
  id: string;
  isCompanyPurchase: boolean;
  onValueChange: (isCompanyPurchase: boolean) => void;
};

const PRIVATE_PURCHASE_LABEL = "Súkromná osoba";
const COMPANY_PURCHASE_LABEL = "Nakupujem na firmu";

export function CheckoutPurchaseTypeToggle({
  id,
  isCompanyPurchase,
  onValueChange,
}: CheckoutPurchaseTypeToggleProps) {
  return (
    <RadioGroup
      className="w-auto font-rubik"
      id={id}
      onValueChange={(value) => {
        onValueChange(value === "company");
      }}
      orientation="horizontal"
      size="sm"
      value={isCompanyPurchase ? "company" : "private"}
      variant="subtle"
    >
      <RadioGroup.Label className="sr-only">Typ nákupu</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        <RadioGroup.Item value="private">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{PRIVATE_PURCHASE_LABEL}</RadioGroup.ItemText>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
        <RadioGroup.Item value="company">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{COMPANY_PURCHASE_LABEL}</RadioGroup.ItemText>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
      </RadioGroup.ItemGroup>
    </RadioGroup>
  );
}
