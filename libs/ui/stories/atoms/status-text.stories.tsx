import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const meta = {
  title: "Atoms/StatusText",
  component: StatusText,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "StatusText is inline guidance or feedback for a nearby field or section. Error, warning and success messages include decorative icons by default; neutral helper text has none. Associate field messages through aria-describedby (and aria-errormessage for errors). Use Toast for transient action confirmations, Badge for short labels and FormErrorSummary for a list of submission errors.",
      },
    },
  },
  argTypes: {
    ref: { control: false, table: { disable: true } },
    status: {
      control: "select",
      options: ["default", "error", "success", "warning"],
      description: "Message meaning; error, warning and success have default icons.",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Match the size of the associated control.",
    },
    align: {
      control: "select",
      options: ["start", "center"],
      description: "First-line alignment by default; center is for short single-line messages.",
    },
    showIcon: {
      control: "boolean",
      description: "Defaults to true; do not disable state icons on form validation messages.",
    },
    icon: {
      control: { type: "select", labels: iconLabels },
      options: iconOptions,
      description: "Optional decorative icon override; neutral help has no icon unless supplied.",
    },
    children: { control: "text", description: "A concise message, including a next step for errors." },
  },
  args: {
    status: "error",
    size: "md",
    align: "start",
    showIcon: true,
    children: "Enter a valid email address, such as mara@example.com.",
  },
} satisfies Meta<typeof StatusText>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: { description: { story: "Change the status, size and message to see how inline feedback stays readable without relying on color." } },
  },
  render: (args) => <div className="w-md max-w-full"><StatusText {...args} /></div>,
}

export const AllStatuses: Story = {
  name: "Status meanings",
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Error, success and warning use distinct icons automatically, while neutral guidance stays quiet and icon-free." } },
  },
  render: () => (
    <div className="flex w-md max-w-full flex-col gap-200">
      <StatusText status="error">Enter an email address to receive order updates.</StatusText>
      <StatusText status="success">Email address verified.</StatusText>
      <StatusText status="warning">Delivery may take two additional business days.</StatusText>
      <StatusText>We only send updates about this order.</StatusText>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const status of ["error", "warning", "success"]) {
      const message = canvasElement.querySelector(`[data-status="${status}"]`)
      await expect(message?.querySelector('[aria-hidden="true"]')).not.toBeNull()
    }
    await expect(canvasElement.querySelector('[data-status="default"] [aria-hidden="true"]')).toBeNull()
  },
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "The canonical Small (sm), Medium (md) and Large (lg) sizes use the same message so text and icon proportions can be compared." } },
  },
  render: () => (
    <VariantContainer>
      {([['sm', 'Small (sm)'], ['md', 'Medium (md)'], ['lg', 'Large (lg)']] as const).map(([size, label]) => (
        <VariantGroup key={size} title={label}>
          <StatusText size={size} status="success">Email address verified.</StatusText>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}

function ValidationField() {
  const [valid, setValid] = useState(false)
  return (
    <div className="flex w-md max-w-full flex-col gap-100">
      <Label htmlFor="status-text-email" required>Email address</Label>
      <Input
        aria-describedby="status-text-email-hint status-text-email-message"
        aria-errormessage={valid ? undefined : "status-text-email-message"}
        aria-invalid={!valid}
        defaultValue="mara@"
        id="status-text-email"
        onBlur={(event) => setValid(event.currentTarget.validity.valid)}
        required
        type="email"
        variant={valid ? "success" : "error"}
      />
      <StatusText id="status-text-email-hint" size="sm">We only send updates about this order.</StatusText>
      <StatusText id="status-text-email-message" size="sm" status={valid ? "success" : "error"}>
        {valid ? "Email address verified." : "Enter a valid email address, such as mara@example.com."}
      </StatusText>
    </div>
  )
}

export const FormValidationContext: Story = {
  name: "Associated field feedback",
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Edit the email and leave the field to see associated validation feedback update without losing the permanent helper description." } },
  },
  render: () => <ValidationField />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole("textbox", { name: /email address/i })
    await expect(field).toHaveAttribute("aria-invalid", "true")
    await expect(field).toHaveAccessibleDescription(/We only send updates.*Enter a valid email address/)
    await userEvent.clear(field)
    await userEvent.type(field, "mara@example.com")
    await userEvent.tab()
    await expect(field).toHaveAttribute("aria-invalid", "false")
    await expect(field).not.toHaveAttribute("aria-errormessage")
    await expect(field).toHaveAccessibleDescription(/We only send updates.*Email address verified/)
  },
}

export const LongText: Story = {
  name: "Wrapping messages",
  parameters: {
    controls: { disable: true },
    docs: { description: { story: "Long messages wrap in their own text column with the icon aligned to the first line, including at narrow mobile widths." } },
  },
  render: () => (
    <div className="flex w-xs max-w-full flex-col gap-200">
      <StatusText status="error">Choose a delivery address before continuing, or add a new address in your account settings.</StatusText>
      <StatusText status="warning">Changing your delivery address may change shipping costs and the estimated delivery date.</StatusText>
      <StatusText status="success">Your delivery address has been saved and will be used for future orders.</StatusText>
    </div>
  ),
}
