import {
  Select,
  type SelectItem,
  type SelectSize,
} from "@techsio/ui-kit/molecules/select"
import type { ReactNode } from "react"

export type AdminSelectFieldItem = SelectItem

type AdminSelectFieldProps = {
  className?: string
  disabled?: boolean
  items: AdminSelectFieldItem[]
  label: ReactNode
  name?: string
  onValueChange: (value: string) => void
  placeholder?: string
  size?: SelectSize
  value: string
}

export function AdminSelectField({
  className,
  disabled,
  items,
  label,
  name,
  onValueChange,
  placeholder,
  size = "sm",
  value,
}: AdminSelectFieldProps) {
  const valuePlaceholder =
    placeholder ?? (typeof label === "string" ? label : "Select option")

  return (
    <Select
      className={className}
      disabled={disabled}
      items={items}
      name={name}
      onValueChange={(details) => {
        const nextValue = details.value[0]

        if (nextValue) {
          onValueChange(nextValue)
        }
      }}
      size={size}
      value={value ? [value] : []}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={valuePlaceholder} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {items.map((item) => (
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
