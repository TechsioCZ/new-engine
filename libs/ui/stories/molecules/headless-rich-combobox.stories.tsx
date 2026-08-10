import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { Input } from "../../src/atoms/input"
import { useCombobox } from "../../src/molecules/combobox"
import type { ComboboxItem } from "../../src/molecules/combobox"

interface RichSuggestion {
  description: string
  group: "Guides" | "Products"
  href: string
}

const ITEMS: ComboboxItem<RichSuggestion>[] = [
  {
    data: {
      description: "Safe rich-text rendering",
      group: "Guides",
      href: "#safe-html",
    },
    label: "SafeHtml usage",
    value: "safe-html",
  },
  {
    data: {
      description: "Keyboard-first product discovery",
      group: "Products",
      href: "#search",
    },
    label: "Search autocomplete",
    value: "search-autocomplete",
  },
]

const GROUPS = ["Guides", "Products"] as const

const HeadlessRichCombobox = () => {
  const [inputValue, setInputValue] = useState("")
  const { api, options } = useCombobox({
    allowCustomValue: true,
    inputValue,
    items: ITEMS,
    onInputValueChange: setInputValue,
    open: true,
    openOnChange: true,
    selectionBehavior: "preserve",
  })
  const { size: _nativeSize, ...inputProps } = api.getInputProps()
  void _nativeSize

  return (
    <div {...api.getRootProps()} className="w-full max-w-lg">
      <label
        {...api.getLabelProps()}
        htmlFor={api.getInputProps().id}
        className="mb-100 block text-fg-primary"
      >
        Search documentation
      </label>
      <div {...api.getControlProps()}>
        <Input {...inputProps} placeholder="Search" />
      </div>
      {api.open ? (
        <div
          {...api.getContentProps()}
          className="mt-100 rounded-combobox border border-border-secondary bg-surface p-100"
        >
          <div {...api.getListProps()}>
            {GROUPS.map((group) => {
              const groupItems = options.filter(
                (item) => item.data?.group === group,
              )
              return groupItems.length > 0 ? (
                <div key={group} {...api.getItemGroupProps({ id: group })}>
                  <div
                    {...api.getItemGroupLabelProps({ htmlFor: group })}
                    className="p-100 text-xs font-semibold text-fg-secondary"
                  >
                    {group}
                  </div>
                  {groupItems.map((item) => (
                    <a
                      key={item.value}
                      {...api.getItemProps({ item })}
                      className="block rounded-combobox-sm p-200 text-fg-primary data-[highlighted]:bg-combobox-item-bg-hover"
                      href={item.data?.href}
                    >
                      <span className="block font-semibold">{item.label}</span>
                      <span className="block text-sm text-fg-secondary">
                        {item.data?.description}
                      </span>
                    </a>
                  ))}
                </div>
              ) : null
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const meta: Meta<typeof HeadlessRichCombobox> = {
  component: HeadlessRichCombobox,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Molecules/Combobox/Headless rich links",
}

export default meta
type Story = StoryObj<typeof HeadlessRichCombobox>

export const GroupedLinkedSuggestions: Story = {}
