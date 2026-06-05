import { Icon } from "@techsio/ui-kit/atoms/icon"
import { Select } from "@techsio/ui-kit/molecules/select"


export const CheckoutSelectPromoCode = () => {

    const testItems = [
        {label: 'test',
		value: 'test',
		role: 'code'}
    ]
    return(
        <Select items={testItems}>
            <Select.Label className="sr-only">Zlavový kód</Select.Label>
            <Select.Control>
                <Select.Trigger className="bg-base border-1 min-h-12 px-400" iconSize="lg">
                    <Icon icon="token-icon-label" size="lg" />
                    <Select.ValueText className="data-[placeholder]:text-fg-primary text-sm" placeholder="Zadať zľavový kód" />
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