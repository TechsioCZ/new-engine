import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Select } from "@techsio/ui-kit/molecules/select"

export const CheckoutSelectBenefits = () => {
  const testItems = [{ label: "test", value: "test", role: "code" }]

  return (
    <Select className="gap-y-50" items={testItems}>
      <Select.Label className="font-medium text-sm">Benefity</Select.Label>
      <Select.Control>
        <Select.Trigger
          className="min-h-12 bg-surface-secondary px-400"
          iconSize="lg"
        >
          <Icon icon="token-icon-shopping-basket-in" size="lg" />
          <Select.ValueText
            className="text-sm data-[placeholder]:text-fg-primary"
            placeholder="Vrátenie do 14 dní zadarmo"
          />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {testItems?.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  )
}
