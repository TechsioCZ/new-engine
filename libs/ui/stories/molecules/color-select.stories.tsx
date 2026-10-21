import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  ColorSelect,
  type ColorItem,
  type ColorSelectProps,
} from "../../src/molecules/color-select"

const colors: ColorItem[] = [
  { color: "#1e3a8a", label: "Navy" },
  { color: "#d4b896", label: "Sand" },
  { color: "#92400e", label: "Chestnut", disabled: true },
  { color: "#16a34a", label: "Forest" },
]

function SelectionDemo(args: ColorSelectProps) {
  const [selected, setSelected] = useState<string[]>(
    args.colors.filter((item) => item.selected).map((item) => item.color)
  )
  useEffect(() => {
    setSelected(
      args.colors.filter((item) => item.selected).map((item) => item.color)
    )
  }, [args.colors])
  useEffect(() => {
    if (args.selectionMode !== "multiple")
      setSelected((current) => current.slice(0, 1))
  }, [args.selectionMode])
  return (
    <ColorSelect
      {...args}
      colors={args.colors.map((item) => ({
        ...item,
        selected: selected.includes(item.color),
      }))}
      onColorClick={(color) => {
        setSelected((current) =>
          args.selectionMode === "multiple"
            ? current.includes(color)
              ? current.filter((value) => value !== color)
              : [...current, color]
            : [color]
        )
        args.onColorClick?.(color)
      }}
    />
  )
}

const meta: Meta<typeof ColorSelect> = {
  title: "Molecules/ColorSelect",
  component: ColorSelect,
  tags: ["autodocs"],
  parameters: {
    controls: { include: ["colors", "size", "radius", "layout", "selectionMode", "label", "helpText", "validateStatus", "disabled", "readOnly"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "Choose product colors from named swatches with visible labels and checkmarks. Single selection uses a named radio group with one tab stop and arrow navigation; multiple selection uses checkboxes. Use Select or RadioGroup for textual choices and a dedicated color input for arbitrary colors. Canonical sm/md/lg sizes default to md; full is a compatibility fill-container mode, not another control size.",
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
    id: { control: false, table: { disable: true } },
    colors: { control: "object" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    radius: { control: "select", options: ["sm", "md", "lg", "full"] },
    layout: { control: "select", options: ["list", "grid"] },
    selectionMode: { control: "select", options: ["single", "multiple"] },
    label: { control: "text" },
    helpText: { control: "text" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
  args: {
    colors,
    label: "Fabric color",
    size: "md",
    radius: "full",
    layout: "grid",
    selectionMode: "single",
    disabled: false,
    readOnly: false,
    onColorClick: fn(),
  },
}
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <SelectionDemo {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Choose a fabric color and explore the layout, shape, selection and validation controls.",
      },
    },
  },
}

export const Sizes: Story = {
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          title={
            ["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? "Medium (md)"
          }
          key={size}
          fullWidth
        >
          <SelectionDemo {...args} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The same four named colors show the actual small, medium and large swatch dimensions.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fonts = canvas.getAllByRole("radiogroup").map((group) =>
      Number.parseFloat(getComputedStyle(within(group).getByText("Navy")).fontSize)
    )
    await expect(fonts).toHaveLength(3)
    await expect(fonts[0]).toBeLessThan(fonts[1] ?? 0)
    await expect(fonts[1]).toBeLessThan(fonts[2] ?? 0)
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    colors: colors.map((item, index) => ({ ...item, selected: index === 0 })),
    helpText: "Color selection is unavailable while stock is updating.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Disabled colors retain their selected checkmark but cannot receive focus or change the selection.",
      },
    },
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  args: {
    readOnly: true,
    colors: colors.map((item, index) => ({ ...item, selected: index === 0 })),
    helpText: "The fabric color on this order cannot be changed.",
  },
  render: (args) => <SelectionDemo {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Read-only swatches keep their contrast and focus target while ignoring pointer and keyboard changes.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const navy = canvas.getByRole("radio", { name: "Select color Navy" })
    await userEvent.click(navy)
    await userEvent.keyboard("{ArrowRight}{Space}")
    await userEvent.click(
      canvas.getByRole("radio", { name: "Select color Sand" })
    )
    await expect(navy).toHaveAttribute("aria-checked", "true")
    await expect(navy).not.toBeDisabled()
  },
}

export const Layouts: Story = {
  render: (args) => (
    <VariantContainer>
      {(["grid", "list"] as const).map((layout) => (
        <VariantGroup
          key={layout}
          title={layout === "grid" ? "Grid" : "List"}
          fullWidth
        >
          <SelectionDemo {...args} layout={layout} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Grid and vertical list arrangements preserve the same labels, disabled option and keyboard order.",
      },
    },
  },
}

export const Radius: Story = {
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg", "full"] as const).map((radius) => (
        <VariantGroup
          key={radius}
          title={radius === "full" ? "Circular" : `Corner radius: ${radius}`}
          fullWidth
        >
          <SelectionDemo {...args} radius={radius} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Corner radius changes swatch shape independently of its control size.",
      },
    },
  },
}

export const MultipleSelection: Story = {
  args: {
    selectionMode: "multiple",
    helpText: "Choose every color you would like to see.",
  },
  render: (args) => <SelectionDemo {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          "Independent checkbox swatches allow several colors to be selected and toggled off.",
      },
    },
  },
}

export const Validation: Story = {
  args: {
    validateStatus: "error",
    helpText: "Choose an available fabric color before continuing.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A textual error with an icon is linked to every focusable swatch without relying on color alone.",
      },
    },
  },
}

const submit = fn((event: React.SubmitEvent<HTMLFormElement>) =>
  event.preventDefault()
)
export const KeyboardNavigation: Story = {
  render: (args) => (
    <form onSubmit={submit}>
      <SelectionDemo {...args} />
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Arrow keys move a single radio tab stop, skip unavailable colors and select without submitting an enclosing form.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    submit.mockClear()
    const canvas = within(canvasElement)
    const navy = canvas.getByRole("radio", { name: "Select color Navy" })
    const sand = canvas.getByRole("radio", { name: "Select color Sand" })
    const forest = canvas.getByRole("radio", { name: "Select color Forest" })
    await expect(
      canvas.getByRole("radiogroup", { name: "Fabric color" })
    ).toBeVisible()
    await expect(navy).toHaveAttribute("tabindex", "0")
    await expect(sand).toHaveAttribute("tabindex", "-1")
    await userEvent.click(navy)
    await userEvent.keyboard("{ArrowRight}")
    await expect(sand).toHaveFocus()
    await expect(sand).toHaveAttribute("aria-checked", "true")
    await userEvent.keyboard("{ArrowRight}")
    await expect(forest).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(submit).not.toHaveBeenCalled()
  },
}
