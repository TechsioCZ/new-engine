import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useRef, useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import { FormInput } from "../../src/molecules/form-input"
import {
  FormErrorSummary,
  type FormErrorSummaryError,
  type FormErrorSummaryProps,
} from "../../src/molecules/form-error-summary"

const errors: FormErrorSummaryError[] = [
  { id: "name", label: "Enter your full name.", targetId: "name-field" },
  {
    id: "email",
    label: "Enter a valid email address.",
    targetId: "email-field",
  },
]
const meta: Meta<typeof FormErrorSummary> = {
  title: "Molecules/FormErrorSummary",
  component: FormErrorSummary,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A focusable summary of errors after form submission, with links that move keyboard focus to each invalid field. Use it above long or multi-field forms alongside inline StatusText feedback; use inline feedback alone for a single local problem. This is a display component, not a value-holding control, so it has no control-size or read-only axis.",
      },
    },
  },
  argTypes: {
    title: { control: "text" },
    errors: { control: "object" },
    onFieldFocus: { control: false },
    ref: { control: false },
  },
  args: { title: "There is a problem", errors },
  render: (args) => <LinkedSummary {...args} />,
}
export default meta
type Story = StoryObj<typeof FormErrorSummary>

function LinkedSummary({ errors, ...props }: FormErrorSummaryProps) {
  const prefix = useId()
  const linkedErrors = errors.map((error) => ({
    ...error,
    targetId: `${prefix}-${error.targetId}`,
  }))
  return (
    <div className="flex w-full max-w-md flex-col gap-200">
      <FormErrorSummary {...props} errors={linkedErrors} />
      {linkedErrors.map((error) => (
        <FormInput
          key={error.id}
          id={error.targetId}
          label={
            error.id === "email"
              ? "Email address"
              : error.id === "name"
                ? "Full name"
                : error.id
          }
          validateStatus="error"
          helpText={error.label}
        />
      ))}
    </div>
  )
}
export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Edit the title and errors in Controls, then activate a summary link to focus its real target field.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("link", { name: "Enter your full name." })
    )
    await expect(
      canvas.getByRole("textbox", { name: "Full name" })
    ).toHaveFocus()
  },
}
export const OneError: Story = {
  args: { errors: errors.slice(0, 1) },
  parameters: {
    docs: {
      description: {
        story:
          "A single actionable error links directly to the field that needs attention.",
      },
    },
  },
}
export const MultipleErrors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A short list of plain-language errors lets users choose where to begin correcting a form.",
      },
    },
  },
}
export const Hidden: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An empty error list renders no alert or empty container when there is nothing to correct.",
      },
    },
  },
  render: () => (
    <div className="w-xs max-w-full">
      <StatusText>No errors to display.</StatusText>
      <FormErrorSummary errors={[]} />
    </div>
  ),
}
export const WithForm: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Submitting validates real local values, focuses the newly mounted summary and confirms successful correction without navigation.",
      },
    },
  },
  render: () => <FormErrorSummaryExample />,
}
function FormErrorSummaryExample() {
  const id = useId()
  const summary = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<FormErrorSummaryError[]>([])
  const [attempt, setAttempt] = useState(0)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    if (attempt > 0) summary.current?.focus()
  }, [attempt])
  return (
    <form
      className="flex w-full max-w-md flex-col gap-200"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        setErrors(
          valid
            ? []
            : [
                {
                  id: "email",
                  label: "Enter a valid email address.",
                  targetId: id,
                },
              ]
        )
        setSaved(valid)
        setAttempt((value) => value + 1)
      }}
    >
      <FormErrorSummary ref={summary} errors={errors} />
      <FormInput
        id={id}
        label="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        validateStatus={errors.length ? "error" : "default"}
        helpText={
          errors.length
            ? "Enter a valid email address."
            : "We will send your order confirmation here."
        }
      />
      {saved && (
        <StatusText status="success">
          Email saved locally. No data was sent.
        </StatusText>
      )}
      <div className="flex justify-end gap-150">
        <Button
          type="button"
          theme="outlined"
          variant="secondary"
          onClick={() => {
            setEmail("")
            setErrors([])
            setSaved(false)
          }}
        >
          Cancel
        </Button>
        <Button type="submit">Save email</Button>
      </div>
    </form>
  )
}
