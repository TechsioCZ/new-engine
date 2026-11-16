import type { Meta, StoryObj } from "@storybook/react"
import { useId } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { Textarea, type TextareaProps } from "../../src/atoms/textarea"

function Field({
  label = "Delivery instructions",
  helpText,
  validateStatus = "default",
  size = "md",
  ...props
}: TextareaProps & { label?: string; helpText?: string }) {
  const id = useId()
  const messageId = `${id}-message`
  // Only Business dims neutral disabled help; other brands and validation
  // messages retain their existing StatusText foreground.
  const helperStatus = validateStatus
  const helperClassName =
    props.disabled && helperStatus === "default"
      ? "in-data-[theme=business]:text-fg-disabled"
      : undefined
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={props.disabled} htmlFor={id} size={size}>
        {label}
      </Label>
      <Textarea
        {...props}
        aria-describedby={helpText ? messageId : undefined}
        aria-errormessage={
          validateStatus === "error" && helpText ? messageId : undefined
        }
        aria-invalid={validateStatus === "error" || undefined}
        id={id}
        size={size}
        validateStatus={validateStatus}
      />
      {helpText && (
        <StatusText
          className={helperClassName}
          id={messageId}
          size={size}
          status={helperStatus}
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
    // Gutter keeps the full focus ring inside narrow captures.
    (Story) => (
      <div className="mx-auto w-full min-w-0 max-w-md px-200 py-100">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    appearance: {
      control: "select",
      options: ["outline", "ghost"],
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
    validateStatus: "default",
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
          defaultValue={state === "error" ? "" : "Leave the parcel at reception."}
          helpText={message}
          placeholder={
            state === "error" ? "Add instructions for the courier…" : undefined
          }
          key={state}
          label={`Delivery instructions — ${state}`}
          validateStatus={state}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", {
      name: "Delivery instructions — error",
    })
    await expect(input).toHaveValue("")
    await expect(input).toHaveAttribute(
      "placeholder",
      "Add instructions for the courier…"
    )
    for (const state of ["default", "warning", "success"]) {
      await expect(
        canvas.getByRole("textbox", {
          name: `Delivery instructions — ${state}`,
        })
      ).toHaveValue("Leave the parcel at reception.")
    }
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
    const [small] = fields
    if (!small) throw new Error("The small textarea example must be rendered")
    await userEvent.click(canvas.getByText("Small (sm)"))
    await expect(small).toHaveFocus()
    // Compare all sizes at rest after verifying the label association.
    small.blur()
    for (const field of fields) {
      await expect(field).not.toHaveFocus()
    }
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
    await userEvent.tab()
    await expect(input).not.toHaveFocus()
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
