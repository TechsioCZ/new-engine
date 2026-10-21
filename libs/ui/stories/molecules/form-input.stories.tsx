import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { FormInput } from "../../src/molecules/form-input"

const meta: Meta<typeof FormInput> = {
  title: "Molecules/FormInput",
  component: FormInput,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "FormInput combines a visible label, single-line input and associated inline feedback for complete form fields. Use Input for custom compositions; use FormTextarea for multiline text.",
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
    validateStatus: {
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
    label: { control: "text" },
    helpText: { control: "text" },
    showHelpTextIcon: { control: "boolean" },
  },
}
export default meta
type Story = StoryObj<typeof FormInput>

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
    label: "Contact name",
    helpText: "Use the name shown on your delivery address.",
    placeholder: "e.g. Alex Morgan",
    size: "md",
    validateStatus: "default",
    readOnly: false,
    disabled: false,
  },
  render: (args) => <FormInput {...args} />,
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
        <FormInput
          defaultValue="Alex Morgan"
          helpText={message}
          key={state}
          label={`Contact name — ${state}`}
          validateStatus={state}
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
        <FormInput
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
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Disabled fields are unavailable and removed from keyboard navigation; the helper explains why.",
      },
    },
  },
  render: () => (
    <FormInput
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
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Read-only values retain normal contrast, focus and text selection while native editing is blocked.",
      },
    },
  },
  render: () => (
    <FormInput
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
        <FormInput
          aria-describedby={id}
          helpText={
            invalid
              ? "Enter the recipient’s full name before saving."
              : undefined
          }
          label="Contact name"
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
            Enter the recipient’s full name.
          </StatusText>
        )}
        <FormInput
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
      .getByText("Enter the recipient’s full name.")
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
