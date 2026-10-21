import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useRef, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { NumericInput } from "../../src/atoms/numeric-input"
import { StatusText } from "../../src/atoms/status-text"
import { Combobox } from "../../src/molecules/combobox"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
import {
  FormErrorSummary,
  type FormErrorSummaryError,
} from "../../src/molecules/form-error-summary"
import { FormInput } from "../../src/molecules/form-input"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"
import { FormTextarea } from "../../src/molecules/form-textarea"
import { Select } from "../../src/molecules/select"
import { Slider } from "../../src/molecules/slider"
import { Switch } from "../../src/molecules/switch"

type FormArgs = {
  size: "sm" | "md" | "lg"
  validateStatus: "default" | "error" | "success" | "warning"
  disabled: boolean
  readOnly: boolean
}
const meta: Meta<FormArgs> = {
  title: "Templates/Comprehensive Form",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A working project-enquiry form demonstrating shared sizing, validation, error-summary focus and local submission. Use it as a reference for accessible multi-field forms; use individual field molecules for smaller tasks. No data leaves this demo.",
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    validateStatus: {
      control: "select",
      options: ["default", "error", "success", "warning"],
    },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
  },
  args: {
    size: "md",
    validateStatus: "default",
    disabled: false,
    readOnly: false,
  },
}
export default meta
type Story = StoryObj<typeof meta>
const initialData = {
  name: "",
  email: "",
  message: "",
  department: "",
  topic: "",
  quantity: "1",
  updates: false,
  consent: false,
  budget: [25],
}
const departments = [
  { label: "Sales", value: "sales" },
  { label: "Technical support", value: "support" },
  { label: "Partnerships", value: "partners" },
]
const topics = [
  { label: "Office supplies", value: "office" },
  { label: "Warehouse equipment", value: "warehouse" },
  { label: "Custom order", value: "custom" },
]

function EnquiryForm({ size, validateStatus, disabled, readOnly }: FormArgs) {
  const prefix = useId()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [data, setData] = useState(
    readOnly || disabled
      ? {
          ...initialData,
          name: "Alex Morgan",
          email: "alex@example.com",
          message:
            "Office supplies for a new team of 25 people, delivered in September.",
          department: "sales",
          topic: "office",
          quantity: "25",
          consent: true,
        }
      : initialData
  )
  const [errors, setErrors] = useState<FormErrorSummaryError[]>([])
  const [feedback, setFeedback] = useState("")
  const [submission, setSubmission] = useState(0)
  const fieldId = (field: string) => `${prefix}-${field}`
  useEffect(() => {
    if (submission > 0) summaryRef.current?.focus()
  }, [submission])
  const update = <K extends keyof typeof initialData>(
    key: K,
    value: (typeof initialData)[K]
  ) => {
    if (!readOnly && !disabled) {
      setData((current) => ({ ...current, [key]: value }))
      setFeedback("")
    }
  }
  const errorFor = (field: string) =>
    errors.find((error) => error.id === field)?.label
  const statusFor = (field: string) =>
    errorFor(field) ? ("error" as const) : validateStatus
  const messageFor = (field: string, hint: string) =>
    errorFor(field) ??
    (validateStatus === "error"
      ? "Check this value before sending your enquiry."
      : validateStatus === "warning"
        ? "Please confirm these details before sending."
        : validateStatus === "success"
          ? "These details are ready to send."
          : hint)
  const shared = { size, disabled, readOnly }
  return (
    <form
      className="flex w-full max-w-3xl flex-col gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (disabled || readOnly) return
        const nextErrors: FormErrorSummaryError[] = []
        const add = (field: string, label: string) =>
          nextErrors.push({ id: field, label, targetId: fieldId(field) })
        if (!data.name.trim()) add("name", "Enter your full name.")
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
          add("email", "Enter a valid email address, such as alex@example.com.")
        if (data.message.trim().length < 10)
          add(
            "message",
            "Tell us about your project in at least 10 characters."
          )
        if (!data.consent)
          add("consent", "Allow us to contact you about this enquiry.")
        setErrors(nextErrors)
        setFeedback(
          nextErrors.length
            ? ""
            : `Enquiry prepared for ${data.name.trim()}. This demo did not send any data.`
        )
        setSubmission((count) => count + 1)
      }}
    >
      <div>
        <h2 className="font-semibold text-xl">Plan your next project</h2>
        <p className="text-fg-secondary">
          Tell our team what you need. Required fields are marked.
        </p>
      </div>
      <FormErrorSummary errors={errors} ref={summaryRef} />
      <div className="grid grid-cols-1 gap-300 md:grid-cols-2">
        <FormInput
          {...shared}
          id={fieldId("name")}
          label="Full name"
          required
          autoComplete="name"
          value={data.name}
          onChange={(event) => update("name", event.target.value)}
          validateStatus={statusFor("name")}
          helpText={messageFor(
            "name",
            "Use the name we should address in our reply."
          )}
        />
        <FormInput
          {...shared}
          id={fieldId("email")}
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={data.email}
          onChange={(event) => update("email", event.target.value)}
          validateStatus={statusFor("email")}
          helpText={messageFor(
            "email",
            "We will only use this to reply to your enquiry."
          )}
        />
        <Select
          {...shared}
          items={departments}
          value={data.department ? [data.department] : []}
          onValueChange={({ value }) => update("department", value[0] ?? "")}
          validateStatus={validateStatus}
        >
          <Select.Label>Team</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="Choose a team" />
            </Select.Trigger>
            <Select.ClearTrigger />
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {departments.map((item) => (
                <Select.Item item={item} key={item.value}>
                  <Select.ItemText />
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
          <Select.StatusText>
            {messageFor("department", "Choose the team best placed to help.")}
          </Select.StatusText>
        </Select>
        <Combobox
          {...shared}
          label="Project category"
          placeholder="Search categories"
          items={topics}
          value={data.topic}
          onChange={(value) =>
            update("topic", Array.isArray(value) ? (value[0] ?? "") : value)
          }
          validateStatus={validateStatus}
          helpText={messageFor(
            "topic",
            "Choose the closest category, or leave it empty."
          )}
        />
        <FormNumericInput
          {...shared}
          label="Estimated quantity"
          value={data.quantity}
          onValueChange={({ value }) => update("quantity", value)}
          min={1}
          max={1000}
          validateStatus={validateStatus}
          helpText={messageFor(
            "quantity",
            "An estimate is fine; we will confirm it with you."
          )}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
        <Slider
          {...shared}
          label="Estimated budget (thousands of euros)"
          defaultValue={[25]}
          min={0}
          max={100}
          value={data.budget}
          onChange={(value) => update("budget", value)}
          validateStatus={validateStatus}
          helpText={messageFor(
            "budget",
            "Use the arrow keys for a rough budget estimate."
          )}
          showValueText
        />
      </div>
      <FormTextarea
        {...shared}
        id={fieldId("message")}
        label="Project details"
        required
        value={data.message}
        onChange={(event) => update("message", event.target.value)}
        validateStatus={statusFor("message")}
        helpText={messageFor(
          "message",
          "Include quantities, delivery dates and any special requirements."
        )}
      />
      <Switch
        {...shared}
        checked={data.updates}
        onCheckedChange={(checked) => update("updates", checked)}
      >
        Send occasional product updates
      </Switch>
      <FormCheckbox
        {...shared}
        id={fieldId("consent")}
        label="You may contact me about this enquiry"
        required
        checked={data.consent}
        onCheckedChange={(checked) => update("consent", checked)}
        validateStatus={statusFor("consent")}
        helpText={messageFor(
          "consent",
          "Your details are not shared with other companies."
        )}
      />
      {feedback && <StatusText status="success">{feedback}</StatusText>}
      {readOnly && (
        <StatusText>
          This enquiry is read-only. You can inspect the details but cannot send
          changes.
        </StatusText>
      )}
      <div className="flex flex-wrap justify-end gap-150">
        <Button
          type="button"
          size={size}
          theme="outlined"
          variant="secondary"
          disabled={disabled || readOnly}
          onClick={() => {
            setData(initialData)
            setErrors([])
            setFeedback("Enquiry cleared. No data was sent.")
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size={size}
          variant="primary"
          disabled={disabled || readOnly}
        >
          Send enquiry
        </Button>
      </div>
    </form>
  )
}
export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Complete the enquiry, submit invalid details to focus its summary, then correct the fields and send a local confirmation.",
      },
    },
  },
  render: (args) => <EnquiryForm {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("slider")).toHaveAttribute(
      "aria-valuenow",
      "25"
    )
    await expect(canvas.queryByRole("alert")).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("textbox", { name: /Full name/ })
    ).not.toHaveFocus()
  },
}
export const ValidationWorkflow: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Keyboard regression for invalid submission, every summary target, partial correction and successful local submission.",
      },
    },
  },
  render: (args) => <EnquiryForm {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const submit = canvas.getByRole("button", { name: "Send enquiry" })
    await userEvent.click(submit)
    await expect(
      canvas.getByRole("alert", { name: "There is a problem" })
    ).toHaveFocus()
    for (const link of canvas.getAllByRole("link")) {
      link.focus()
      await userEvent.keyboard("{Enter}")
      const target = canvasElement.ownerDocument.getElementById(
        link.getAttribute("href")!.slice(1)
      )
      await expect(target).toHaveFocus()
    }
    await userEvent.type(
      canvas.getByRole("textbox", { name: /Full name/ }),
      "Alex Morgan"
    )
    await userEvent.click(submit)
    await expect(
      canvas.queryByRole("link", { name: "Enter your full name." })
    ).not.toBeInTheDocument()
    await userEvent.type(
      canvas.getByRole("textbox", { name: /Email/ }),
      "alex@example.com"
    )
    await userEvent.type(
      canvas.getByRole("textbox", { name: /project/i }),
      "Office supplies for our new team."
    )
    await userEvent.click(canvas.getByRole("checkbox", { name: /contact/i }))
    await userEvent.click(submit)
    await expect(
      canvas.queryByRole("alert", { name: "There is a problem" })
    ).not.toBeInTheDocument()
    await expect(
      canvas.getByText(/Enquiry prepared for Alex Morgan/)
    ).toBeVisible()
    for (const field of canvasElement.querySelectorAll(
      '[aria-invalid="true"], [aria-errormessage]'
    ))
      await expect(field).not.toBeInTheDocument()
  },
}
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare the same enquiry at the three canonical control sizes without changing its copy or values.",
      },
    },
  },
  render: (args) => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          fullWidth
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
        >
          <EnquiryForm {...args} size={size} />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const Disabled: Story = {
  ...Playground,
  play: undefined,
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "Disabled enquiries remove editing and submission while retaining their visible content.",
      },
    },
  },
}
export const ReadOnly: Story = {
  ...Playground,
  play: undefined,
  name: "Read-only",
  args: { readOnly: true },
  parameters: {
    docs: {
      description: {
        story:
          "Read-only enquiries preserve focusable full-contrast values while preventing changes and submission.",
      },
    },
  },
}
export const AllFormInputs: Story = {
  ...Playground,
  play: undefined,
  parameters: {
    docs: {
      description: {
        story:
          "A complete controlled form keeps text, selection, numeric, boolean and slider inputs working together.",
      },
    },
  },
}
export const ContactForm: Story = {
  ...Playground,
  play: undefined,
  parameters: {
    docs: {
      description: {
        story:
          "Send validates a local enquiry and Cancel resets it without navigating or making a network request.",
      },
    },
  },
}
export const ErrorState: Story = {
  ...Playground,
  play: undefined,
  args: { validateStatus: "error" },
  parameters: {
    docs: {
      description: {
        story:
          "Compare icon-bearing error messages and their accessible field associations across the enquiry.",
      },
    },
  },
}
export const SuccessState: Story = {
  ...Playground,
  play: undefined,
  args: { validateStatus: "success" },
  parameters: {
    docs: {
      description: {
        story:
          "Positive feedback uses both words and status icons at the size of its associated field.",
      },
    },
  },
}
