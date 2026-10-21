import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks"
import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Checkbox, type CheckboxProps } from "../../src/atoms/checkbox"

function CheckboxDocs() {
  return (
    <>
      <Title />
      <Subtitle />
      <Description of="meta" />
      <h2>Playground</h2>
      <Description of="story" />
      <Primary />
      <Controls />
      {/* Stories forces initial args; do not duplicate the live Playground. */}
      <Stories includePrimary={false} />
    </>
  )
}

const meta = {
  title: "Atoms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      page: CheckboxDocs,
      description: {
        component:
          "A native checkbox for selecting rows, list items, or a whole group in a custom composition. Use FormCheckbox for a labeled form field with help or errors, Switch for a setting that applies immediately, and RadioGroup for one exclusive choice. Always supply an accessible name. The indeterminate prop represents a partially selected group; invalid exposes both visual and ARIA state, but needs an associated error message.",
      },
    },
  },
  argTypes: {
    checked: {
      control: "boolean",
      description: "Controlled selection; update it in onChange.",
    },
    defaultChecked: {
      control: false,
      description:
        "Initial selection for an uncontrolled checkbox; do not combine with checked.",
    },
    indeterminate: {
      control: "boolean",
      description: "Mixed selection state for a group.",
    },
    disabled: { control: "boolean" },
    invalid: { control: "boolean" },
    required: { control: "boolean" },
    "aria-label": {
      control: "text",
      description: "Accessible name for a bare selection control.",
    },
  },
  args: {
    "aria-label": "Select Alpine daypack",
    checked: false,
    indeterminate: false,
    disabled: false,
    invalid: false,
    required: false,
    onChange: fn(),
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Toggle a product selection with live Controls synchronization to inspect checked, mixed, disabled, and invalid states without a read-only demo.",
      },
    },
  },
  render: function Render() {
    const [args, updateArgs] = useArgs<CheckboxProps>()
    const descriptionId = useId()
    return (
      <div className="flex w-full max-w-md flex-col gap-150">
        <div className="flex items-center gap-150">
          <Checkbox
            {...args}
            id={args.id ?? `${descriptionId}-control`}
            aria-describedby={descriptionId}
            onChange={(event) => {
              args.onChange?.(event)
              updateArgs({
                checked: event.currentTarget.checked,
                indeterminate: false,
              })
            }}
          />
          <label htmlFor={args.id ?? `${descriptionId}-control`}>
            Alpine daypack
          </label>
        </div>
        <p id={descriptionId} className="text-sm text-fg-secondary">
          {args.invalid
            ? "Selection error: choose at least one available product."
            : args.disabled
              ? "Selection unavailable while this product is archived."
              : "Use Space to change selection; use FormCheckbox when the row is a form field."}
        </p>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox")
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
    await expect(checkbox).not.toBePartiallyChecked()
    await userEvent.keyboard(" ")
    await expect(checkbox).not.toBeChecked()
  },
}

export const Indeterminate: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Show the mixed-selection dash beside checked and unchecked controls so partial selection is distinguishable without color.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="No products selected">
        <Checkbox aria-label="No products selected" />
      </VariantGroup>
      <VariantGroup title="All products selected">
        <Checkbox aria-label="All products selected" defaultChecked />
      </VariantGroup>
      <VariantGroup title="Some products selected">
        <Checkbox aria-label="Some products selected" indeterminate />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AllStates: Story = {
  name: "States",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare selection, disabled, mixed, and invalid states with visible explanations so status is not conveyed by color alone.",
      },
    },
  },
  render: function Render() {
    const errorId = useId()
    return (
      <VariantContainer>
        <VariantGroup title="Available">
          <Checkbox aria-label="Select available product" />
        </VariantGroup>
        <VariantGroup title="Selected">
          <Checkbox aria-label="Select chosen product" defaultChecked />
        </VariantGroup>
        <VariantGroup title="Partially selected">
          <Checkbox
            aria-label="Select partially selected group"
            indeterminate
          />
        </VariantGroup>
        <VariantGroup title="Mixed takes precedence over checked">
          <Checkbox
            aria-label="Mixed group with checked value"
            defaultChecked
            indeterminate
          />
        </VariantGroup>
        <VariantGroup title="Archived: selection unavailable">
          <Checkbox aria-label="Archived unselected product" disabled />
          <Checkbox
            aria-label="Archived selected product"
            disabled
            defaultChecked
          />
          <Checkbox
            aria-label="Archived partially selected group"
            disabled
            indeterminate
          />
        </VariantGroup>
        <VariantGroup title="Selection error" fullWidth>
          <Checkbox
            aria-label="Select a product to continue"
            invalid
            aria-describedby={errorId}
          />
          <p id={errorId} className="text-sm text-danger-fg">
            Select at least one available product to continue.
          </p>
        </VariantGroup>
      </VariantContainer>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const mixed = canvas.getByRole("checkbox", {
      name: "Archived partially selected group",
    })
    await expect(mixed).toBeDisabled()
    await expect(mixed).toBePartiallyChecked()
    for (const name of [
      "Archived partially selected group",
      "Mixed group with checked value",
    ]) {
      const input = canvas.getByRole("checkbox", { name })
      await expect(input).toBePartiallyChecked()
      const dash = getComputedStyle(input, "::after")
      await expect(parseFloat(dash.width)).toBeGreaterThan(
        parseFloat(dash.height) * 2
      )
      await expect(dash.maskImage).toBe("none")
    }
    const invalid = canvas.getByRole("checkbox", {
      name: "Select a product to continue",
    })
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    await expect(invalid).toHaveAccessibleDescription(
      "Select at least one available product to continue."
    )
    const available = canvas.getByRole("checkbox", {
      name: "Select available product",
    })
    available.focus()
    await userEvent.tab()
    await userEvent.tab({ shift: true })
    await expect(available).toHaveFocus()
    await expect(getComputedStyle(available).outlineStyle).toBe("solid")
    await expect(
      parseFloat(getComputedStyle(available).outlineWidth)
    ).toBeGreaterThan(0)
    await expect(
      parseFloat(getComputedStyle(available).borderRadius)
    ).toBeLessThan(available.getBoundingClientRect().width / 2)
  },
}

export const IndeterminateTest: Story = {
  name: "Select all products",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Select individual product rows or the whole group to demonstrate a mixed parent state that stays synchronized with its children.",
      },
    },
  },
  render: function Render() {
    const id = useId()
    const [items, setItems] = useState([
      { name: "Alpine daypack", checked: false },
      { name: "Trail water bottle", checked: true },
      { name: "Merino hiking socks", checked: true },
    ])
    const checkedCount = items.filter((item) => item.checked).length
    return (
      <div className="w-full max-w-md rounded-lg border border-border-primary p-250">
        <div className="mb-200 flex items-center gap-150 font-semibold">
          <Checkbox
            id={`${id}-all`}
            checked={checkedCount === items.length}
            indeterminate={checkedCount > 0 && checkedCount < items.length}
            onChange={(event) => {
              const checked = event.currentTarget.checked
              setItems((previous) =>
                previous.map((item) => ({ ...item, checked }))
              )
            }}
          />
          <label htmlFor={`${id}-all`}>
            Select all products ({checkedCount}/{items.length})
          </label>
        </div>
        <ul className="flex flex-col gap-150 ps-250">
          {items.map((item, index) => (
            <li className="flex items-center gap-150" key={item.name}>
              <Checkbox
                id={`${id}-${index}`}
                checked={item.checked}
                onChange={(event) => {
                  const checked = event.currentTarget.checked
                  setItems((previous) =>
                    previous.map((product, productIndex) =>
                      productIndex === index ? { ...product, checked } : product
                    )
                  )
                }}
              />
              <label htmlFor={`${id}-${index}`}>{item.name}</label>
            </li>
          ))}
        </ul>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const selectAll = canvas.getByRole("checkbox", {
      name: /Select all products/,
    })
    await expect(selectAll).toBePartiallyChecked()
    selectAll.focus()
    await userEvent.keyboard(" ")
    await expect(selectAll).toBeChecked()
    await expect(selectAll).not.toBePartiallyChecked()
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "Alpine daypack" })
    )
    await expect(selectAll).toBePartiallyChecked()
    await userEvent.click(selectAll)
    await userEvent.click(selectAll)
    for (const checkbox of canvas.getAllByRole("checkbox"))
      await expect(checkbox).not.toBeChecked()
  },
}
