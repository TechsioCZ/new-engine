import type { Meta, StoryObj } from "@storybook/react"
import { useId } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { Textarea, type TextareaProps } from "../../src/atoms/textarea"

function Field({
  label = "Delivery instructions",
  helpText,
  variant = "default",
  size = "md",
  ...props
}: TextareaProps & { label?: string; helpText?: string }) {
  const id = useId()
  const messageId = `${id}-message`
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={props.disabled} htmlFor={id} size={size}>
        {label}
      </Label>
      <Textarea
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
        <StatusText
          id={messageId}
          size={size}
          status={variant === "borderless" ? "default" : variant}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}

const meta: Meta<typeof Textarea> = {
  title: "Atoms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Textarea is a low-level multiline text control for custom compositions. Supply a visible label and associated feedback; choose FormTextarea for complete form fields or Input for single-line text.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full min-w-0 max-w-md">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: {
      control: "select",
      options: ["default", "error", "warning", "success", "borderless"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    placeholder: { control: "text" },
    resize: { control: "select", options: ["none", "y", "x", "both", "auto"] },
    rows: { control: "number" },
    id: { control: false },
    ref: { control: false },
  },
}
export default meta
type Story = StoryObj<typeof Textarea>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust size, state and text properties to try this multiline field in a realistic form.",
      },
    },
  },
  args: {
    placeholder: "Add instructions for the courier…",
    size: "md",
    variant: "default",
    readOnly: false,
    disabled: false,
    rows: 3,
    resize: "y",
  },
  render: (args) => <Field {...args} />,
}

export const Variants: Story = {
  parameters: {
    controls: { disable: true },
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
          ["default", "Shown to the courier with your order."],
          [
            "error",
            "Add delivery instructions or enter ‘No special instructions’ so the courier knows what to do.",
          ],
          ["warning", "Keep private information out of delivery instructions."],
          ["success", "Delivery instructions saved."],
        ] as const
      ).map(([state, message]) => (
        <Field
          defaultValue="Leave the parcel at reception."
          helpText={message}
          key={state}
          label={`Delivery instructions — ${state}`}
          variant={state}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: "Delivery instructions — error",
    })
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
    controls: { disable: true },
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
          defaultValue="Leave the parcel at reception."
          helpText="Shown to the courier with your order."
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
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Disabled fields are unavailable and removed from keyboard navigation; the helper explains why.",
      },
    },
  },
  render: () => (
    <Field
      defaultValue="Leave the parcel at reception."
      disabled
      helpText="Available after the order is confirmed."
      label="Delivery instructions"
    />
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled()
  },
}

export const ReadOnly: Story = {
  name: "Read-only",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Read-only values retain normal contrast, focus and text selection while native editing is blocked.",
      },
    },
  },
  render: () => (
    <Field
      defaultValue="Leave the parcel at reception."
      helpText="Contact support to change the confirmed order."
      label="Delivery instructions"
      readOnly
    />
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox")
    await userEvent.click(input)
    await expect(input).toHaveFocus()
    await userEvent.paste("Unwanted replacement")
    await userEvent.keyboard("Changed{Backspace}{Delete}")
    await expect(input).toHaveValue("Leave the parcel at reception.")
    await expect(input).not.toBeDisabled()
  },
}

export const AutoSizing: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Content-sized notes grow as lines are added without forcing a one-line control height.",
      },
    },
  },
  render: () => (
    <Field
      defaultValue="Leave the parcel at reception."
      label="Delivery instructions"
      resize="auto"
    />
  ),
}
