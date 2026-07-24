/**
 * Accordion — @techsio/ui-kit template.
 *
 * @component Accordion
 * @componentVersion v1.0.0
 * @skill accordion-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the accordion-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { IconType } from "../atoms/icon"
import { Accordion, type AccordionProps } from "../molecules/accordion"

export interface AccordionItem {
  value: string
  title: string
  content: React.ReactNode
  disabled?: boolean
}

export interface AccordionTemplateProps
  extends Omit<AccordionProps, "children"> {
  items: AccordionItem[]
  showIndicator?: boolean
  indicatorIcon?: IconType
}

export function AccordionTemplate({
  items,
  showIndicator = true,
  indicatorIcon = "token-icon-accordion-chevron",
  variant = "default",
  size = "md",
  shadow = "none",
  collapsible = true,
  multiple = false,
  defaultValue,
  value,
  onChange,
  ref,
  className,
  ...accordionProps
}: AccordionTemplateProps) {
  return (
    <Accordion
      className={className}
      collapsible={collapsible}
      defaultValue={defaultValue}
      multiple={multiple}
      onChange={onChange}
      ref={ref}
      shadow={shadow}
      size={size}
      value={value}
      variant={variant}
      {...accordionProps}
    >
      {items.map((item) => (
        <Accordion.Item
          disabled={item.disabled}
          key={item.value}
          value={item.value}
        >
          <Accordion.Header>
            <Accordion.Title>{item.title}</Accordion.Title>
            {showIndicator && <Accordion.Indicator icon={indicatorIcon} />}
          </Accordion.Header>
          <Accordion.Content>{item.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
