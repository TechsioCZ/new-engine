import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Select } from "@techsio/ui-kit/molecules/select"


export const CheckoutSelectBenefits = () => {

    const testItems = [{label: 'test',
    value: 'test',
    role: 'code'}
    ]

    return(
        <Select items={testItems} className="gap-y-50">
            <Select.Label className="text-sm font-medium">Benefity</Select.Label>
            <Select.Control>
                <Select.Trigger className="bg-surface-secondary min-h-12 px-400" iconSize="lg">
                    <Icon icon="token-icon-shopping-basket-in" size="lg" />
                    <Select.ValueText className="data-[placeholder]:text-fg-primary text-sm" placeholder="Vrátenie do 14 dní zadarmo" />
                </Select.Trigger>
                <Select.ClearTrigger />
            </Select.Control>
            <Select.Positioner>
                <Select.Content>
                {testItems?.map((item) => (
                    <Select.Item key={item.value} item={item}>
                    <Select.ItemText />
                    <Select.ItemIndicator />
                    </Select.Item>
                ))}
                </Select.Content>
            </Select.Positioner>
        </Select>
    )
}