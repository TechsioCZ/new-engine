import type { Meta, StoryObj } from "@storybook/react"
import { expect, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import type { SelectItem } from "../../src/molecules/select"
import { SelectTemplate } from "../../src/templates/select"

const items: SelectItem[] = [
  { value: "cz", label: "Czech Republic" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "pl", label: "Poland" },
]
const meta: Meta<typeof SelectTemplate> = {
  title: "Templates/SelectTemplate",
  component: SelectTemplate,
  tags: ["autodocs"],
  parameters: {
    controls: { include: ["items", "label", "placeholder", "helpText", "size", "validateStatus", "disabled", "readOnly", "required", "multiple", "showIndicator"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "A ready-to-use Select with a props-only API for labels, validation and option rendering. Use it for standard form choices; use the compound Select when you need custom anatomy, Combobox for searchable choices, or RadioGroup for a few visible options. Canonical sizes are sm/md/lg; xs remains a compatibility alias.",
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
    items: { control: "object" },
    label: { control: "text" },
    placeholder: { control: "text" },
    helpText: { description: 'Linked StatusText below the field; its appearance and error association follow validateStatus.', control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    validateStatus: { description: 'Field and helper status; error marks the focusable trigger invalid and links the error message. Default default.',
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    multiple: { description: 'Allow multiple values (default false). Controlled value is a string array paired with onValueChange.', control: "boolean" },
    showIndicator: { description: 'Show checkmarks beside selected options (default true); does not hide the trigger chevron.', control: "boolean" },
  },
  args: {
    items,
    label: "Country",
    placeholder: "Select a country",
    helpText: "Choose the country for your delivery address.",
    size: "md",
    disabled: false,
    readOnly: false,
  },
}
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore the props-only API, including helper text, state, size and selection controls.",
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
          <SelectTemplate {...args} size={size} defaultValue={["de"]} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "The canonical small, medium and large fields use identical copy and selected values.",
      },
    },
  },
}
export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: ["de"],
    helpText: "Country selection is unavailable while the address is syncing.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "An unavailable selection remains visible but is removed from the keyboard tab order.",
      },
    },
  },
}
export const ReadOnly: Story = {
  name: "Read-only",
  args: {
    readOnly: true,
    defaultValue: ["de"],
    helpText: "This saved delivery country cannot be changed.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A locked selection preserves its normal focus target and full-contrast value without opening the popup.",
      },
    },
  },
}
export const Validation: Story = {
  args: {
    validateStatus: "error",
    helpText: "Choose a delivery country before continuing.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "The template renders a linked StatusText error with its state icon instead of relying on a red border alone.",
      },
    },
  },
}
export const Multiple: Story = {
  args: {
    multiple: true,
    closeOnSelect: false,
    defaultValue: ["cz", "de", "fr"],
    helpText: "Choose every country you deliver to.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "All three selected country labels are shown by default, even when values differ from visible labels.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("combobox", { name: "Country" })
    ).toHaveTextContent("Czech Republic, Germany, France")
  },
}
export const StaticValueText: Story = {
  args: {
    multiple: true,
    defaultValue: ["cz", "de", "fr"],
    valueText: "3 delivery countries",
    helpText:
      "A custom summary can replace the default list of selected labels.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A static valueText summary is honored just like a render function when there is a selection.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("combobox", { name: "Country" })
    ).toHaveTextContent("3 delivery countries")
  },
}
