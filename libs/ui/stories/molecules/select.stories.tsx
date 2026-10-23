import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import {
  Select,
  type SelectItem,
  type SelectProps,
} from "../../src/molecules/select"

import { SelectTemplate } from "../../src/templates/select"

const countries: SelectItem[] = [
  { label: "United States", value: "us" },
  { label: "Canada", value: "ca" },
  { label: "Czech Republic", value: "cz" },
  { label: "Germany", value: "de" },
  { label: "France", value: "fr" },
  { label: "United Kingdom", value: "gb" },
  { label: "Spain (not available)", value: "es", disabled: true },
]

type DemoProps = Omit<SelectProps, "children"> & { helpText?: string }
function CountrySelect({ helpText, ...props }: DemoProps) {
  return (
    <Select {...props}>
      <Select.Label>Country</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select a country" />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {props.items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
      {helpText && <Select.StatusText>{helpText}</Select.StatusText>}
    </Select>
  )
}

const meta: Meta<typeof Select> = {
  title: "Molecules/Select",
  component: Select,
  tags: ["autodocs"],
  parameters: {
    controls: { include: ["size", "validateStatus", "disabled", "readOnly", "multiple", "closeOnSelect", "loopFocus", "items"] },
    layout: "padded",
    docs: {
      description: {
        component: `Choose one or more values from a known list with a keyboard-accessible popup. Use SelectTemplate for a props-only API, Combobox for searchable lists, RadioGroup for a few visible choices, or CascadeSelect for a hierarchy. Canonical sizes are sm/md/lg; legacy xs remains supported.

### Compound member reference

| Member | Contract and rendered/ref target |
| --- | --- |
| \`Select\` | Root provider and layout \`div\` (root \`ref\`); accepts required \`items\` collection. There is no \`Select.Root\`. |
| \`Select.Label\` | Visible \`label\` associated with the trigger; keep it under Select. |
| \`Select.Control\` | Layout \`div\`; contains Trigger and optional sibling ClearTrigger, never nest ClearTrigger inside the trigger button. |
| \`Select.Trigger\` | Focusable \`button\` / \`HTMLButtonElement\` ref. Caller \`aria-labelledby\` wins; an explicit \`aria-label\` omits the generated label reference. |
| \`Select.ValueText\` | \`span\` / \`HTMLSpanElement\` ref inside Trigger; displays selected items or \`placeholder\`, not an editable input. |
| \`Select.ClearTrigger\` | Optional clear \`button\` / \`HTMLButtonElement\` ref; sibling of Trigger. |
| \`Select.Positioner\` | Floating layout \`div\` / \`HTMLDivElement\` ref wrapping Content; \`portalled={false}\` keeps it inline. |
| \`Select.Content\` | Listbox \`ul\` / \`HTMLUListElement\` ref containing options. Keep under Positioner. |
| \`Select.Item\` | Option \`li\` / \`HTMLLIElement\` ref; required \`item\` must belong to the root's \`items\`. Contains ItemText and optional ItemIndicator. |
| \`Select.ItemText\` / \`Select.ItemIndicator\` | Presentational text/indicator \`span\` parts inside Item. ItemText defaults to its item's label. |
| \`Select.ItemGroup\` / \`Select.ItemGroupLabel\` | Optional grouped-option \`div\` parts; use matching \`id\` / \`htmlFor\` to name the group. |
| \`Select.StatusText\` | Helper/validation feedback registered with the trigger's description. |
| Hidden native select | Automatically rendered by Select, not a public \`Select.HiddenInput\` member. Root \`name\`, \`form\`, \`required\`, \`multiple\` and disabled state govern native submission. |

\`value\` / \`defaultValue\` are arrays of item \`value\` strings, even in single-select mode. Every selected value must exist in \`items\`; use \`onValueChange={({ value }) => ...}\` for controlled state. Rich labels need \`displayValue\` for native text/typeahead. Preserve this nesting:

\`\`\`tsx
import { Select } from "@techsio/ui-kit/molecules/select"

const items = [{ label: "Canada", value: "ca" }];

export function CountryExample() {
  return (
    <Select items={items} defaultValue={["ca"]} name="country">
      <Select.Label>Country</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select a country" />
        </Select.Trigger>
        <Select.ClearTrigger />
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {items.map((item) => (
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
\`\`\`
`,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    ref: { control: false, table: { disable: true } },
    id: { control: false, table: { disable: true } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    validateStatus: { description: 'Style the field and linked StatusText; error sets aria-invalid and associates mounted error messages.',
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    disabled: { control: "boolean" },
    readOnly: { description: 'Keep the selected value focusable and submitted, but prevent opening, clearing and selection.', control: "boolean" },
    multiple: { description: 'Select several values; value/defaultValue and onValueChange always use string arrays. Default false.', control: "boolean" },
    closeOnSelect: { description: 'Close the popup after selection (default true); set false to keep browsing, especially in multiple mode.', control: "boolean" },
    loopFocus: { description: 'Wrap arrow-key navigation at the first/last option (default true).', control: "boolean" },
    items: { description: 'Authoritative options. Removed selections clear with a change notification; controlled parents should apply the correction.', control: "object" },
    children: { control: false },
  },
  args: {
    items: countries,
    size: "md",
    disabled: false,
    readOnly: false,
    multiple: false,
    validateStatus: "default",
    onValueChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <CountrySelect
      {...args}
      helpText={
        args.validateStatus === "error"
          ? "Choose a delivery country before continuing."
          : args.validateStatus === "warning"
            ? "Delivery to this country may take longer."
            : args.validateStatus === "success"
              ? "Delivery country confirmed."
              : "Choose the country for your delivery address."
      }
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Explore selection, validation, multiple values and state controls with a realistic delivery field.",
      },
    },
  },
}

export const Sizes: Story = {
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={
            ["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? "Medium (md)"
          }
          fullWidth
        >
          <CountrySelect
            {...args}
            size={size}
            defaultValue={["de"]}
            helpText="Choose the country for your delivery address."
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    controls: { exclude: ["size"] },
    docs: {
      description: {
        story:
          "Small, medium and large use the same country, copy and field anatomy so the canonical scale is easy to compare.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    for (const control of canvasElement.querySelectorAll('[data-scope="select"][data-part="control"]')) {
      const value = control.querySelector('[data-part="value-text"]')?.getBoundingClientRect()
      const clear = control.querySelector('[data-part="clear-trigger"]')?.getBoundingClientRect()
      if (!value || !clear) throw new Error("Missing value or clear action")
      await expect(value.right).toBeLessThanOrEqual(clear.x)
    }
  },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: ["de"] },
  render: (args) => (
    <CountrySelect
      {...args}
      helpText="Country selection is unavailable while the address is syncing."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A temporarily unavailable field keeps its value visible but removes all control tab stops.",
      },
    },
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  args: { readOnly: true, defaultValue: ["de"], defaultOpen: true },
  render: (args) => (
    <CountrySelect
      {...args}
      helpText="This saved delivery country cannot be changed."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A read-only selection stays focusable and copyable, never opens, and omits clear and dropdown affordances.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Country" })
    await userEvent.click(trigger)
    await userEvent.keyboard("{ArrowDown}f{Enter}{Space}")
    await expect(trigger).toHaveTextContent("Germany")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).not.toBeDisabled()
    await expect(
      canvas.queryByRole("button", { name: "Clear selection" })
    ).toBeNull()
  },
}

export const ValidationStates: Story = {
  render: (args) => (
    <VariantContainer>
      {(["error", "warning", "success"] as const).map((status) => (
        <VariantGroup title={status} key={status} fullWidth>
          <CountrySelect
            {...args}
            validateStatus={status}
            defaultValue={status === "error" ? [] : ["de"]}
            helpText={
              status === "error"
                ? "Choose a delivery country before continuing."
                : status === "warning"
                  ? "Delivery to this country may take longer."
                  : "Delivery country confirmed."
            }
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Validation messages include state icons and stable descriptions, with error messages linked directly to the focusable trigger.",
      },
    },
  },
}

export const Multiple: Story = {
  args: {
    multiple: true,
    closeOnSelect: false,
    defaultValue: ["cz", "de", "fr"],
  },
  render: (args) => (
    <CountrySelect {...args} helpText="Choose every country you deliver to." />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Multiple selection displays every selected label rather than silently hiding all but the first value.",
      },
    },
  },
}

export const Controlled: Story = {
  render: function ControlledSelect(args) {
    const [value, setValue] = useState(["de"])
    return (
      <CountrySelect
        {...args}
        value={value}
        onValueChange={(details) => {
          setValue(details.value)
          args.onValueChange?.(details)
        }}
        helpText="Your selection updates immediately."
      />
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "The parent owns the selected values through value and onValueChange.",
      },
    },
  },
}

export const WithItemGroups: Story = {
  render: (args) => (
    <Select {...args}>
      <Select.Label>Country</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select a country" />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {[
            { id: "europe", label: "Europe", values: ["cz", "de", "fr", "gb"] },
            { id: "america", label: "North America", values: ["us", "ca"] },
          ].map((group) => (
            <Select.ItemGroup id={group.id} key={group.id}>
              <Select.ItemGroupLabel htmlFor={group.id}>
                {group.label}
              </Select.ItemGroupLabel>
              {countries
                .filter((item) => group.values.includes(item.value))
                .map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText />
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
            </Select.ItemGroup>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Named option groups make a longer list easier to scan without changing its selection behavior.",
      },
    },
  },
}

const triggerClick = fn()
export const ComposedTriggerHandler: Story = {
  render: (args) => (
    <Select {...args}>
      <Select.Label>Country</Select.Label>
      <Select.Control>
        <Select.Trigger onClick={triggerClick}>
          <Select.ValueText placeholder="Select a country" />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {countries.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A consumer click handler runs alongside Zag's trigger handler without replacing the popup interaction.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    triggerClick.mockClear()
    const trigger = within(canvasElement).getByRole("combobox", {
      name: "Country",
    })
    await userEvent.click(trigger)
    await expect(triggerClick).toHaveBeenCalledOnce()
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{Escape}")
  },
}

export const WithinForm: Story = {
  render: function DeliveryForm(args) {
    const [saved, setSaved] = useState(false)
    return (
      <form
        className="flex flex-col gap-300"
        onSubmit={(event) => {
          event.preventDefault()
          setSaved(true)
        }}
      >
        <CountrySelect
          {...args}
          name="country"
          defaultValue={["de"]}
          helpText="Choose the country for your delivery address."
        />
        <div className="flex justify-end gap-150">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setSaved(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save delivery country
          </Button>
        </div>
        {saved && (
          <StatusText status="success">Delivery country saved.</StatusText>
        )}
      </form>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "The native hidden select submits country codes while the local form demonstrates secondary Cancel and primary Save actions without reloading.",
      },
    },
  },
}

export const MachineOptions: Story = {
  args: {
    dir: "rtl",
    defaultOpen: true,
    ids: {
      trigger: "delivery-country-trigger",
      content: "delivery-country-popup",
    },
    positioning: { placement: "bottom-end", gutter: 12 },
  },
  render: (args) => (
    <CountrySelect
      {...args}
      helpText="Choose the country for your delivery address."
    />
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Zag direction, initial open state, custom element IDs and positioning are forwarded to the actual control and popup.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("combobox", {
      name: "Country",
    })
    await expect(trigger).toHaveAttribute("id", "delivery-country-trigger")
    await expect(trigger).toHaveAttribute("dir", "rtl")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      "delivery-country-popup"
    )
  },
}

export const AccessibleDescriptions: Story = {
  render: function LinkedDescriptions(args) {
    const [invalid, setInvalid] = useState(true)
    const externalId = useId()
    return (
      <div className="flex flex-col gap-300">
        <span id={externalId}>Delivery settings.</span>
        <Select {...args} validateStatus={invalid ? "error" : "default"}>
          <Select.Label>Country</Select.Label>
          <Select.Control>
            <Select.Trigger aria-describedby={externalId}>
              <Select.ValueText placeholder="Select a country" />
            </Select.Trigger>
          </Select.Control>
          <Select.StatusText status="default">
            Choose a supported delivery country.
          </Select.StatusText>
          {invalid && (
            <Select.StatusText status="error">
              Choose a country before saving your address.
            </Select.StatusText>
          )}
        </Select>
        <Button
          variant="secondary"
          onClick={() => setInvalid((value) => !value)}
        >
          Toggle validation
        </Button>
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story:
          "Multiple messages have unique IDs, preserve an external description and unregister their error association when validation clears.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Country" })
    const error = canvas.getByRole("alert")
    await expect(trigger).toHaveAttribute("aria-errormessage", error.id)
    await expect(trigger).toHaveAccessibleDescription(
      "Delivery settings. Choose a supported delivery country. Choose a country before saving your address."
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle validation" })
    )
    await expect(trigger).not.toHaveAttribute("aria-errormessage")
    await expect(trigger).toHaveAccessibleDescription(
      "Delivery settings. Choose a supported delivery country."
    )
  },
}

export const KeyboardTypeahead: Story = {
  render: (args) => <CountrySelect {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Typing a country label selects the matching option even when its submitted country code starts with a different letter.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Country" })
    trigger.focus()
    await userEvent.keyboard("g")
    await expect(trigger).toHaveTextContent("Germany")
  },
}

function ChangingCountries() {
  const [removed, setRemoved] = useState(false)
  const [value, setValue] = useState(["a"])
  const [changes, setChanges] = useState(0)
  const items = removed ? [{ label: "Beta renamed", value: "b" }] : [
    { label: "Alpha", value: "a" }, { label: "Beta", value: "b" },
  ]
  return <form className="flex flex-col gap-200" onSubmit={(event) => event.preventDefault()}>
    <CountrySelect items={items} name="uncontrolled" required defaultValue={["a"]}
      onValueChange={() => setChanges((count) => count + 1)} />
    <SelectTemplate label="Controlled country" items={items} name="controlled" required
      value={value} onValueChange={({ value: next }) => setValue(next)} />
    <SelectTemplate label="Multiple countries" items={items} name="multiple" multiple
      defaultValue={["a", "b"]} />
    <Button variant="secondary" onClick={() => setRemoved(true)}>Replace countries</Button>
    <output aria-label="Collection changes">{changes}</output>
  </form>
}

export const CollectionUpdates: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story:
    "Replace the authoritative options while open: removed values clear once, valid multiple values survive with refreshed labels, and native forms never invent a replacement." } } },
  render: () => <ChangingCountries />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("combobox", { name: "Country" }))
    const replace = canvas.getByRole("button", { name: "Replace countries" })
    // Keyboard focus remains owned by the open listbox while the application updates data.
    replace.click()
    await waitFor(() => expect(canvas.getByRole("status", { name: "Collection changes" })).toHaveTextContent("1"))
    const form = canvasElement.querySelector("form")
    if (!form) throw new Error("Missing collection form")
    await expect(new FormData(form).get("uncontrolled")).toBe("")
    await expect(new FormData(form).get("controlled")).toBe("")
    await expect(new FormData(form).getAll("multiple")).toEqual(["b"])
    await expect(form.querySelector<HTMLSelectElement>('select[name="uncontrolled"]')?.checkValidity()).toBe(false)
    await expect(canvas.getByRole("combobox", { name: "Country" })).toHaveTextContent("Select a country")
    await expect(canvas.getByRole("combobox", { name: "Multiple countries" })).toHaveTextContent("Beta renamed")
    for (const node of canvasElement.ownerDocument.querySelectorAll("[aria-activedescendant]")) {
      await expect(canvasElement.ownerDocument.getElementById(node.getAttribute("aria-activedescendant") ?? "")).not.toBeNull()
    }
    await userEvent.keyboard("{Escape}")
    await expect(body.queryByRole("listbox")).toBeNull()
  },
}

function ObservedCountry() {
  const [clicks, setClicks] = useState(0)
  const [keys, setKeys] = useState(0)
  const [cancel, setCancel] = useState(false)
  return <div className="flex flex-col gap-200">
    <Select items={countries}>
      <Select.Label>Observed country</Select.Label>
      <Select.Control><Select.Trigger onClick={(event) => { setClicks((n) => n + 1); if (cancel) event.preventDefault() }}>
        <Select.ValueText />
      </Select.Trigger></Select.Control>
      <Select.Positioner><Select.Content onKeyDown={(event) => { setKeys((n) => n + 1); if (cancel || event.key === "Home") event.preventDefault() }}>
        {countries.map((item) => <Select.Item key={item.value} item={item}><Select.ItemText /><Select.ItemIndicator /></Select.Item>)}
      </Select.Content></Select.Positioner>
    </Select>
    <Button variant="secondary" onClick={() => setCancel((next) => !next)}>Toggle cancellation</Button>
    <output aria-label="Observed events">{clicks} clicks, {keys} keys</output>
  </div>
}

export const ComposedEvents: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story:
    "Consumer click and key observers preserve machine opening/navigation; preventDefault explicitly cancels a machine action." } } },
  render: () => <ObservedCountry />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("combobox", { name: "Observed country" })
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(body.getByRole("listbox")).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Home}{Enter}")
    await waitFor(() => expect(trigger).toHaveTextContent("Canada"))
    await expect(canvas.getByRole("status", { name: "Observed events" })).toHaveTextContent("1 clicks, 4 keys")
    await userEvent.click(canvas.getByRole("button", { name: "Toggle cancellation" }))
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(body.queryByRole("listbox")).toBeNull()
  },
}
