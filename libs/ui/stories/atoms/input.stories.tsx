import type { Meta, StoryObj } from "@storybook/react"
import { useId } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Input, type InputProps } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"

function Field({
  label = "Contact name",
  helpText,
  variant = "default",
  size = "md",
  ...props
}: InputProps & { label?: string; helpText?: string }) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={props.disabled} htmlFor={id} size={size}>
        {label}
      </Label>
      <Input
        {...props}
        aria-describedby={helpText ? messageId : undefined}
        aria-errormessage={
          variant === "error" && helpText ? messageId : undefined
        }
        aria-invalid={variant === "error" || undefined}
        id={id}
        size={size}
        variant={variant}
      />
      {helpText && (
        <StatusText id={messageId} size={size} status={variant}>
          {helpText}
        </StatusText>
      )}
    </div>
  )
}

const meta: Meta<typeof Input> = {
  title: "Atoms/Input",
  component: Input,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Input is a low-level single-line text control for custom compositions. Supply a visible label and associated feedback; choose FormInput for complete form fields or Textarea for multiline text.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    placeholder: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "tel", "url"],
    },
    hideSearchClear: { control: "boolean" },
    id: { control: false },
    ref: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof Input>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust size, state and text properties to try this single-line field in a realistic form.",
      },
    },
  },
  args: {
    placeholder: "e.g. Alex Morgan",
    size: "md",
    variant: "default",
    readOnly: false,
    disabled: false,
  },
  render: (args) => <Field {...args} />,
}

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Meaningful inline feedback includes a state icon and remains associated with its field, even when the message wraps.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-300">
      {(
        [
          ["default", "Use the name shown on your delivery address."],
          [
            "error",
            "Enter a first and last name so we can address your delivery correctly.",
          ],
          [
            "warning",
            "Confirm this is the name the recipient uses at reception.",
          ],
          ["success", "Contact name saved."],
        ] as const
      ).map(([state, message]) => (
        <Field
          defaultValue="Alex Morgan"
          helpText={message}
          key={state}
          label={`Contact name — ${state}`}
          variant={state}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "Contact name — error" })
    await expect(input).toHaveAttribute("aria-invalid", "true")
    const messageId = input.getAttribute("aria-errormessage")
    await expect(messageId).toBeTruthy()
    await expect(input.getAttribute("aria-describedby")).toContain(messageId)
    await expect(
      canvas.getByRole("alert").querySelector('[aria-hidden="true"]')
    ).not.toBeNull()
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Small, medium and large share identical copy so field, label and message sizing can be compared directly.",
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-300">
      {(
        [
          ["sm", "Small (sm)"],
          ["md", "Medium (md)"],
          ["lg", "Large (lg)"],
        ] as const
      ).map(([size, label]) => (
        <Field
          defaultValue="Alex Morgan"
          helpText="Use the name shown on your delivery address."
          key={size}
          label={label}
          size={size}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const fields = canvas.getAllByRole("textbox")
    await expect(new Set(fields.map((field) => field.id)).size).toBe(3)
    await userEvent.click(canvas.getByText("Small (sm)"))
    await expect(fields[0]).toHaveFocus()
  },
}

export const Disabled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Disabled fields are unavailable and removed from keyboard navigation; the helper explains why.",
      },
    },
  },
  render: () => (
    <Field
      defaultValue="Alex Morgan"
      disabled
      helpText="Available after the order is confirmed."
      label="Contact name"
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled()
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  parameters: {
    docs: {
      description: {
        story:
          "Read-only values retain normal contrast, focus and text selection while native editing is blocked.",
      },
    },
  },
  render: () => (
    <Field
      defaultValue="Alex Morgan"
      helpText="Contact support to change the confirmed order."
      label="Contact name"
      readOnly
    />
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox")
    await userEvent.click(input)
    await expect(input).toHaveFocus()
    await userEvent.paste("Unwanted replacement")
    await userEvent.keyboard("Changed{Backspace}{Delete}")
    await expect(input).toHaveValue("Alex Morgan")
    await expect(input).not.toBeDisabled()
  },
}
