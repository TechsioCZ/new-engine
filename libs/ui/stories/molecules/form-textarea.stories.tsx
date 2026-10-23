import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { FormTextarea } from "../../src/molecules/form-textarea"

const meta: Meta<typeof FormTextarea> = {
  title: "Molecules/FormTextarea",
  component: FormTextarea,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FormTextarea combines a visible label, multiline input and associated inline feedback for complete form fields. Use Textarea for custom compositions; use FormInput for single-line text.",
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
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    placeholder: { control: "text" },
    resize: { control: "select", options: ["none", "y", "x", "both", "auto"] },
    rows: { control: "number" },
    id: { control: false },
    ref: { control: false },
    label: { control: "text" },
    helpText: { control: "text" },
    showHelpTextIcon: { control: "boolean" },
  },
}
export default meta
type Story = StoryObj<typeof FormTextarea>

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
    label: "Delivery instructions",
    helpText: "Shown to the courier with your order.",
    placeholder: "Add instructions for the courier…",
    size: "md",
    validateStatus: "default",
    readOnly: false,
    disabled: false,
    rows: 3,
    resize: "y",
  },
  render: (args) => <FormTextarea {...args} />,
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
        <FormTextarea
          defaultValue="Leave the parcel at reception."
          helpText={message}
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
        <FormTextarea
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
    <FormTextarea
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
    <FormTextarea
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
    <FormTextarea
      defaultValue="Leave the parcel at reception."
      label="Delivery instructions"
      resize="auto"
    />
  ),
}

export const FeedbackLifecycle: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Validation references disappear when an error clears, while caller-supplied guidance remains associated.",
      },
    },
  },
  render() {
    const [invalid, setInvalid] = useState(true)
    const id = useId()
    return (
      <div className="flex flex-col gap-200">
        <p id={id}>Only used for this order.</p>
        <FormTextarea
          aria-describedby={id}
          helpText={
            invalid ? "Add delivery instructions before saving." : undefined
          }
          label="Delivery instructions"
          validateStatus={invalid ? "error" : "default"}
        />
        <Button onClick={() => setInvalid(false)} variant="secondary">
          Clear validation
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox")
    await expect(input).toHaveAttribute("aria-errormessage")
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear validation" })
    )
    await expect(input).not.toHaveAttribute("aria-errormessage")
    await expect(input).toHaveAccessibleDescription("Only used for this order.")
  },
}

export const CallerOwnedError: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Caller-owned errors stay associated when wrapper validation clears, until the caller clears its own error.",
      },
    },
  },
  render() {
    const id = useId()
    const [localError, setLocalError] = useState(true)
    const [callerError, setCallerError] = useState(true)
    return (
      <div className="flex w-full max-w-md flex-col gap-200">
        {callerError && (
          <StatusText id={id} status="error">
            Add the delivery instructions.
          </StatusText>
        )}
        <FormTextarea
          aria-describedby={callerError ? id : undefined}
          aria-errormessage={callerError ? id : undefined}
          aria-invalid={callerError || undefined}
          helpText={
            localError ? "Check the delivery details before saving." : undefined
          }
          label="Delivery details"
          validateStatus={localError ? "error" : "default"}
        />
        <Button onClick={() => setLocalError(false)} variant="secondary">
          Clear field validation
        </Button>
        <Button onClick={() => setCallerError(false)} variant="secondary">
          Clear caller error
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox")
    const callerId = canvas
      .getByText("Add the delivery instructions.")
      .closest('[role="alert"]')?.id
    await expect(input.getAttribute("aria-errormessage")?.split(" ")).toContain(
      callerId
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear field validation" })
    )
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAttribute("aria-errormessage", callerId)
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear caller error" })
    )
    await expect(input).not.toHaveAttribute("aria-errormessage")
  },
}
