/**
 * Select — @techsio/ui-kit template.
 *
 * @component Select
 * @componentVersion v1.3.2
 * @skill select-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the select-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react"
import {
  Select,
  type SelectItem,
  type SelectProps,
  type SelectSize,
} from "../molecules/select"

type SelectTemplateLabelProps = Omit<
  ComponentPropsWithoutRef<"label">,
  "children"
> & {
  ref?: Ref<HTMLLabelElement>
}

type SelectTemplateValueTextProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  size?: SelectSize
  ref?: Ref<HTMLSpanElement>
}

export type SelectTemplateProps = Omit<SelectProps, "children"> & {
  /** StatusText below the field, linked to its trigger; follows validateStatus. */
  helpText?: ReactNode
  /** DOM attributes and events for the focusable trigger. */
  triggerProps?: ComponentPropsWithoutRef<"button">
  label?: ReactNode
  labelProps?: SelectTemplateLabelProps
  placeholder?: string
  valueText?: ReactNode | ((items: SelectItem[]) => ReactNode)
  valueTextProps?: SelectTemplateValueTextProps
  /** Show selected-option checkmarks (default true), not the trigger chevron. */
  showIndicator?: boolean
  renderItem?: (item: SelectItem) => ReactNode
  ref?: Ref<HTMLDivElement>
}

export function SelectTemplate({
  items,
  helpText,
  triggerProps,
  label,
  labelProps,
  placeholder,
  valueText,
  valueTextProps,
  showIndicator = true,
  renderItem,
  ref,
  ...selectProps
}: SelectTemplateProps) {
  return (
    <Select items={items} ref={ref} {...selectProps}>
      {label ? <Select.Label {...labelProps}>{label}</Select.Label> : null}
      <Select.Control>
        <Select.Trigger {...triggerProps}>
          <Select.ValueText placeholder={placeholder} {...valueTextProps}>
            {valueText}
          </Select.ValueText>
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {items.map((item) => (
            <Select.Item item={item} key={item.value}>
              {renderItem ? (
                <>
                  {renderItem(item)}
                  <Select.ItemText className="sr-only" />
                </>
              ) : (
                <Select.ItemText />
              )}
              {showIndicator && <Select.ItemIndicator />}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
      {helpText && <Select.StatusText>{helpText}</Select.StatusText>}
    </Select>
  )
}
