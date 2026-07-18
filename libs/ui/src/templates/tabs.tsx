import type * as React from "react"
import type { Ref } from "react"

import { Tabs, type TabsProps } from "../molecules/tabs"

export interface TabItem {
  value: string
  label: string
  content: React.ReactNode
  disabled?: boolean | undefined
}

export interface TabsTemplateProps extends Omit<TabsProps, "children" | "ref"> {
  items: TabItem[]
  showIndicator?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

export function TabsTemplate({
  items,
  showIndicator = false,
  variant = "default",
  size = "md",
  fitted = false,
  justify = "start",
  orientation = "horizontal",
  defaultValue,
  value,
  onValueChange,
  ref,
  className,
  ...tabsProps
}: TabsTemplateProps) {
  return (
    <Tabs
      className={className}
      defaultValue={defaultValue}
      fitted={fitted}
      justify={justify}
      onValueChange={onValueChange}
      orientation={orientation}
      ref={ref}
      size={size}
      value={value}
      variant={variant}
      {...tabsProps}
    >
      <Tabs.List>
        {items.map((item) => (
          <Tabs.Trigger
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </Tabs.Trigger>
        ))}
        {showIndicator && <Tabs.Indicator />}
      </Tabs.List>

      {items.map((item) => (
        <Tabs.Content key={item.value} value={item.value}>
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs>
  )
}
