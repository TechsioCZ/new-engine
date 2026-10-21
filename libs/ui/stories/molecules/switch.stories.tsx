import { checkSwitchThumbContrast } from "./switch-contrast"
import { ChoiceContract, checkChoiceContract } from "./choice-contract"
import type { Meta, StoryObj } from "@storybook/react"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Switch } from "../../src/molecules/switch"
const describe = (story: string) => ({ docs: { description: { story } } })

const meta: Meta<typeof Switch> = {
  title: "Molecules/Switch",
  component: Switch,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "An accessible on/off switch for settings that apply immediately, with a labeled value and inline guidance. Use FormCheckbox for consent or choices saved with a form, and RadioGroup for more than two options.",
      },
    },
  },
  argTypes: {
    id: { table: { disable: true } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    checked: { control: "boolean" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    helpText: { control: "text" },
    children: { control: "text" },
    defaultChecked: { control: false },
    onCheckedChange: { control: false },
    showHelpTextIcon: {
      control: false,
      description:
        "Compatibility prop; validation always includes its status icon.",
    },
    dir: { control: "inline-radio", options: ["ltr", "rtl"] },
  },
  args: {
    children: "Email notifications",
    helpText: "Receive account activity updates by email.",
    checked: false,
    size: "md",
    disabled: false,
    readOnly: false,
    validateStatus: "default",
    onCheckedChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof Switch>

export const Playground: Story = {
  parameters: describe(
    "Change the setting and controls to inspect its value, size and accessible inline feedback."
  ),
  render: function Playground(args) {
    const [, updateArgs] = useArgs()
    return (
      <Switch
        {...args}
        onCheckedChange={(checked) => {
          args.onCheckedChange?.(checked)
          updateArgs({ checked })
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("switch")
    await expect(input).toHaveAccessibleName("Email notifications")
    await expect(input).toHaveAccessibleDescription(
      "Receive account activity updates by email."
    )
  },
}
export const Sizes: Story = {
  parameters: describe(
    "Small, medium and large keep identical copy while scaling the control, label and guidance together."
  ),
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <Switch
            size={size}
            children="Email notifications"
            helpText="Receive account activity updates by email."
            defaultChecked
          />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const States: Story = {
  parameters: describe(
    "Neutral guidance and actionable error, warning and success messages communicate state with text and icons."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <Switch
        children="Email notifications"
        helpText="Receive account activity updates by email."
      />
      <Switch
        children="Email notifications"
        validateStatus="error"
        helpText="Turn on email notifications to receive security alerts."
      />
      <Switch
        children="Email notifications"
        validateStatus="warning"
        helpText="Review this preference before continuing."
      />
      <Switch
        children="Email notifications"
        validateStatus="success"
        helpText="Your notification preference is saved."
        defaultChecked
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByRole("switch")[1]
    if (!input) throw new Error("Missing switch regression target")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    const errorId = input.getAttribute("aria-errormessage")
    await expect(errorId).toBeTruthy()
    await expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(
      errorId
    )
  },
}
export const Disabled: Story = {
  parameters: describe(
    "Unavailable values remain visible, including checked values, but cannot receive keyboard focus."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <Switch
        children="Email notifications"
        disabled
        helpText="Your administrator manages this preference."
      />
      <Switch
        children="Email notifications"
        disabled
        defaultChecked
        helpText="Your administrator manages this preference."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("switch"))
      await expect(input).toBeDisabled()
  },
}
export const ReadOnly: Story = {
  name: "Read-only",
  parameters: describe(
    "Controlled and uncontrolled read-only values stay focusable and full contrast without accepting pointer or keyboard edits."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <Switch
        name="uncontrolled-preference"
        children="Email notifications"
        readOnly
        defaultChecked
        helpText="This preference is locked by your account policy."
      />
      <Switch
        name="controlled-preference"
        children="Email notifications"
        readOnly
        checked
        helpText="This preference is locked by your account policy."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("switch")) {
      await expect(input).not.toBeDisabled()
      input.focus()
      await expect(input).toHaveFocus()
      await userEvent.keyboard(" ")
      await userEvent.click(input)
      await expect(input).toBeChecked()
    }
  },
}

export const RightToLeft: Story = {
  parameters: describe(
    "Checked and unchecked thumbs remain inside their tracks in right-to-left layouts."
  ),
  render: () => (
    <div dir="rtl" className="flex flex-col gap-250">
      <Switch dir="rtl" defaultChecked>
        Email notifications
      </Switch>
      <Switch dir="rtl">Email notifications</Switch>
    </div>
  ),
}

export const NativeFormContract: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Rejected proposals preserve the submitted value; restoring defaults updates native, accessible and visible state together, including external form ownership." } } },
  render: () => <ChoiceContract kind="switch" />,
  play: async ({ canvasElement }) => checkChoiceContract(canvasElement),
}

export const ThumbVisibility: Story = {
  parameters: describe("Enabled thumb boundaries remain distinguishable in checked, unchecked, invalid and read-only combinations, including hovered tracks."),
  render: () => <div className="flex w-full max-w-md flex-col gap-200">
    {[false, true].flatMap((checked) => [false, true].flatMap((readOnly) => [false, true].map((invalid) => <Switch key={`${checked}-${readOnly}-${invalid}`} checked={checked} readOnly={readOnly} validateStatus={invalid ? "error" : "default"}>
      {checked ? "Enabled" : "Off"}{readOnly ? ", read-only" : ""}{invalid ? ", needs attention" : ""}
    </Switch>)))}
  </div>,
  play: async ({ canvasElement }) => checkSwitchThumbContrast(canvasElement),
}
