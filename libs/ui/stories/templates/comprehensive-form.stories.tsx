import { CalendarDate } from "@internationalized/date"
import type { Meta, StoryObj } from "@storybook/react"
import { useEffect, useId, useRef, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { NumericInput } from "../../src/atoms/numeric-input"
import { StatusText } from "../../src/atoms/status-text"
import { CascadeSelect } from "../../src/molecules/cascade-select"
import { DatePicker } from "../../src/molecules/date-picker"
import { Dialog } from "../../src/molecules/dialog"
import { Drawer } from "../../src/molecules/drawer"
import { SearchSuggestions } from "../../src/templates/search-suggestions"
import { FileUpload } from "../../src/molecules/file-upload"
import { SearchForm } from "../../src/molecules/search-form"
import { SelectTemplate } from "../../src/templates/select"
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
    layout: "padded",
    docs: {
      description: {
        component:
          "A working project-enquiry form demonstrating shared sizing, validation, error-summary focus and local submission. Use it as a reference for accessible multi-field forms; use individual field molecules for smaller tasks. No data leaves this demo.",
      },
    },
  },
  decorators: [(Story) => <div className="mx-auto w-full min-w-0 max-w-3xl"><Story /></div>],
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
      className="flex w-full min-w-0 max-w-3xl flex-col gap-300 wrap-anywhere"
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
      <FormErrorSummary className="w-full min-w-0" errors={errors} ref={summaryRef} />
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
      <div className="flex min-w-0 flex-wrap justify-end gap-150 [&>button]:min-w-0 [&>button]:max-w-full [&>button]:whitespace-normal">
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


// Test-only composition: all native projections must follow the same owner lifecycle.
function PopupLifecycleFixture() {
  const prefix = useId()
  const [owner, setOwner] = useState("a")
  const [cancel, setCancel] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [initialFiles] = useState(() => [
    new File(["initial"], "initial.txt", { type: "text/plain" }),
  ])
  const form = `${prefix}-${owner}`
  const items = [
    { label: "Alpha", value: "a" },
    { label: "Beta", value: "b" },
  ]
  return (
    <div className="flex w-full min-w-0 max-w-xl flex-col gap-200">
      {(["a", "b"] as const).map((key) => (
        <form
          key={key}
          id={`${prefix}-${key}`}
          aria-label={`Owner ${key}`}
          onReset={(event) => {
            if (cancel) event.preventDefault()
          }}
        />
      ))}
      <fieldset disabled={disabled}>
        <legend>
          <Slider
            label="Legend exemption"
            defaultValue={[10]}
            aria-label={["Legend exemption"]}
          />
        </legend>
        <fieldset className="flex min-w-0 flex-col gap-200">
          <legend>Popup lifecycle fields</legend>
          <SelectTemplate
            label="Lifecycle select"
            name="select"
            form={form}
            items={items}
            defaultValue={["a"]}
          />
          <Combobox
            label="Lifecycle combobox"
            name="combobox"
            inputProps={{ form }}
            items={items}
            defaultValue={["a"]}
            defaultInputValue="Alpha"
          />
          <CascadeSelect
            items={[{ label: "Group", value: "group", children: items }]}
            defaultValue={[["group", "a"]]}
            name="cascade"
            form={form}
          >
            <CascadeSelect.Label>Lifecycle cascade</CascadeSelect.Label>
            <CascadeSelect.Control>
              <CascadeSelect.Trigger>
                <CascadeSelect.ValueText />
                <CascadeSelect.Indicator />
              </CascadeSelect.Trigger>
            </CascadeSelect.Control>
            <CascadeSelect.Positioner>
              <CascadeSelect.Content>
                <CascadeSelect.Node />
              </CascadeSelect.Content>
            </CascadeSelect.Positioner>
          </CascadeSelect>
          <DatePicker.Root
            name="date"
            form={form}
            defaultValue={new CalendarDate(2026, 10, 20)}
          >
            <DatePicker.Label>Lifecycle date</DatePicker.Label>
            <DatePicker.Control>
              <DatePicker.Segments />
              <DatePicker.IndicatorGroup>
                <DatePicker.ClearTrigger />
                <DatePicker.Trigger />
              </DatePicker.IndicatorGroup>
            </DatePicker.Control>
            <DatePicker.Positioner>
              <DatePicker.Content>
                <DatePicker.Calendar />
              </DatePicker.Content>
            </DatePicker.Positioner>
          </DatePicker.Root>
          <Slider
            label="Lifecycle range"
            name="range"
            form={form}
            defaultValue={[20, 80]}
            aria-label={["Range minimum", "Range maximum"]}
          />
          <FileUpload
            name="files"
            defaultAcceptedFiles={initialFiles}
            maxFiles={3}
          >
            <FileUpload.Label>Lifecycle files</FileUpload.Label>
            <FileUpload.HiddenInput form={form} />
            <FileUpload.Trigger>Choose lifecycle files</FileUpload.Trigger>
            <FileUpload.Context>
              {(api) => (
                <output>
                  {api.acceptedFiles.map((file) => file.name).join(", ")}
                </output>
              )}
            </FileUpload.Context>
          </FileUpload>
          <SearchForm defaultValue="Initial query">
            <SearchForm.Label>Lifecycle search</SearchForm.Label>
            <SearchForm.Input name="query" form={form} />
          </SearchForm>
        </fieldset>
      </fieldset>
      <div className="flex flex-wrap gap-150">
        <Button
          variant="secondary"
          onClick={() => setOwner((current) => (current === "a" ? "b" : "a"))}
        >
          Reassociate owner
        </Button>
        <Button
          variant="secondary"
          onClick={() => setCancel((current) => !current)}
        >
          Toggle cancellation
        </Button>
        <Button
          variant="secondary"
          onClick={() => setDisabled((current) => !current)}
        >
          Toggle ancestor disabled
        </Button>
        <Button variant="secondary" type="reset" form={`${prefix}-a`}>
          Reset owner a
        </Button>
        <Button variant="secondary" type="reset" form={`${prefix}-b`}>
          Reset owner b
        </Button>
      </div>
    </div>
  )
}

export const PopupLifecycleContracts: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "Integration regression for cancellation-safe reset, external owner reassociation, disabled ancestors and first-legend exemptions across custom popup fields.",
      },
    },
  },
  render: () => <PopupLifecycleFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "Lifecycle combobox" })
    const query = canvas.getByRole("searchbox", { name: "Lifecycle search" })
    const range = canvas.getByRole("slider", { name: "Range minimum" })
    const snapshot = (owner: "a" | "b") =>
      Array.from(
        new FormData(
          canvas.getByRole("form", {
            name: `Owner ${owner}`,
          }) as HTMLFormElement
        ).entries()
      ).map(([name, value]) => [
        name,
        typeof value === "string" ? value : (value as unknown as File).name,
      ])
    const baseline = snapshot("a")
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Lifecycle select" })
    )
    await userEvent.click(await body.findByRole("option", { name: "Beta" }))
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Lifecycle cascade" })
    )
    await userEvent.click(await body.findByRole("treeitem", { name: "Group" }))
    await userEvent.click(await body.findByRole("treeitem", { name: "Beta" }))
    await userEvent.keyboard("{Escape}")
    await userEvent.clear(input)
    await userEvent.type(input, "Bet")
    await userEvent.click(await body.findByRole("option", { name: "Beta" }))
    const picker = canvas.getByLabelText("Lifecycle files") as HTMLInputElement
    await userEvent.upload(
      picker,
      new File(["changed"], "changed.txt", { type: "text/plain" })
    )
    await userEvent.click(
      canvasElement.querySelector<HTMLElement>(
        '[data-scope="date-picker"][data-part="clear-trigger"]'
      )!
    )
    await userEvent.clear(query)
    await userEvent.type(query, "Changed query")
    range.focus()
    await userEvent.keyboard("{ArrowRight}")
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle cancellation" })
    )
    await userEvent.clear(input)
    await userEvent.type(input, "Draft")
    ;(canvas.getByRole("form", { name: "Owner a" }) as HTMLFormElement).reset()
    await new Promise((resolve) => setTimeout(resolve, 20))
    await expect(query).toHaveValue("Changed query")
    await expect(input).toHaveValue("Draft")
    await expect(range).toHaveAttribute("aria-valuenow", "21")
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle cancellation" })
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Reassociate owner" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Reset owner a" }))
    await new Promise((resolve) => setTimeout(resolve, 20))
    await expect(query).toHaveValue("Changed query")
    input.focus()
    await userEvent.type(input, "draft")
    ;(canvas.getByRole("form", { name: "Owner b" }) as HTMLFormElement).reset()
    await waitFor(() => expect(query).toHaveValue("Initial query"))
    await waitFor(() => expect(input).toHaveValue("Alpha"))
    await waitFor(() => expect(range).toHaveAttribute("aria-valuenow", "20"))
    await expect(snapshot("b")).toEqual(baseline)
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle ancestor disabled" })
    )
    await waitFor(() => expect(input).toBeDisabled())
    await expect(
      canvas.getByRole("slider", { name: "Legend exemption" })
    ).toHaveAttribute("tabindex", "0")
    await expect(range).not.toHaveAttribute("tabindex", "0")
    await expect(snapshot("b")).toEqual([])
    await userEvent.click(
      canvas.getByRole("button", { name: "Toggle ancestor disabled" })
    )
    await waitFor(() => expect(input).toBeEnabled())
    await expect(range).toHaveAttribute("tabindex", "0")
    await expect(snapshot("b")).toEqual(baseline)
  },
}

function ModalPopupFields() {
  return (
    <div className="flex min-w-0 flex-col gap-200">
      <CascadeSelect
        items={[
          {
            label: "Group",
            value: "group",
            children: [{ label: "Leaf", value: "leaf" }],
          },
        ]}
      >
        <CascadeSelect.Label>Modal category</CascadeSelect.Label>
        <CascadeSelect.Control>
          <CascadeSelect.Trigger>
            <CascadeSelect.ValueText />
            <CascadeSelect.Indicator />
          </CascadeSelect.Trigger>
        </CascadeSelect.Control>
        <CascadeSelect.Positioner>
          <CascadeSelect.Content>
            <CascadeSelect.Node />
          </CascadeSelect.Content>
        </CascadeSelect.Positioner>
      </CascadeSelect>
      <SearchSuggestions
        label="Modal suggestions"
        portalled
        groups={[
          {
            id: "results",
            label: "Results",
            items: [
              { label: "Sample result", value: "result", href: "#result" },
            ],
          },
        ]}
        navigate={() => undefined}
      />
    </div>
  )
}

export const ModalPopupContracts: Story = {
  tags: ["!autodocs"],
  parameters: {
    docs: {
      description: {
        story:
          "CascadeSelect and explicitly portalled SearchSuggestions remain inside Dialog and Drawer accessible focus scopes without an extra portal.",
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap gap-200">
      <Dialog title="Popup dialog" triggerText="Open popup dialog">
        <ModalPopupFields />
      </Dialog>
      <Drawer>
        <Drawer.Trigger>Open popup drawer</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Popup drawer</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <ModalPopupFields />
              </Drawer.Body>
              <Drawer.Footer>
                <Drawer.CloseTrigger>Close drawer</Drawer.CloseTrigger>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Portal>
      </Drawer>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    for (const host of ["dialog", "drawer"]) {
      const trigger = canvas.getByRole("button", { name: `Open popup ${host}` })
      await userEvent.click(trigger)
      const modal = await body.findByRole("dialog", { name: `Popup ${host}` })
      const category = within(modal).getByRole("combobox", {
        name: "Modal category",
      })
      category.focus()
      await userEvent.keyboard("{ArrowDown}")
      const tree = await body.findByRole("tree")
      await expect(modal.contains(tree)).toBe(true)
      await expect(tree.closest('[aria-hidden="true"], [inert]')).toBeNull()
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(category).toHaveFocus())
      const search = within(modal).getByRole("combobox", {
        name: "Modal suggestions",
      })
      search.focus()
      await userEvent.keyboard("{ArrowDown}")
      const list = await body.findByRole("listbox")
      await expect(modal.contains(list)).toBe(true)
      await expect(list.closest('[aria-hidden="true"], [inert]')).toBeNull()
      await waitFor(() =>
        expect(
          body.getByRole("option", { name: "Sample result" })
        ).toBeVisible()
      )
      await userEvent.keyboard("{Escape}")
      await expect(search).toHaveFocus()
      await expect(modal).toBeVisible()
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(modal).not.toBeInTheDocument())
      await waitFor(() => expect(trigger).toHaveFocus())
    }
  },
}
