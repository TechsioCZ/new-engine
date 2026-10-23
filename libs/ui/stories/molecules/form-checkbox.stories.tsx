import { ChoiceContract, checkChoiceContract } from "./choice-contract"
import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useRef, useState } from "react"
import { Button } from "../../src/atoms/button"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Checkbox } from "../../src/atoms/checkbox"
import { FormCheckbox } from "../../src/molecules/form-checkbox"
const describe = (story: string) => ({ docs: { description: { story } } })

const meta: Meta<typeof FormCheckbox> = {
  title: "Molecules/FormCheckbox",
  component: FormCheckbox,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A labeled checkbox for independent choices saved with a form, with accessible guidance and validation. Use Switch for settings that apply immediately, or RadioGroup for a single exclusive choice.",
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
    label: { control: "text" },
    defaultChecked: { control: false },
    onCheckedChange: { control: false },
    showHelpTextIcon: {
      control: false,
      description:
        "Compatibility prop; validation always includes its status icon.",
    },
    indeterminate: { control: "boolean" },
  },
  args: {
    label: "Send me delivery updates",
    helpText: "Receive a message when your order ships.",
    checked: false,
    size: "md",
    disabled: false,
    readOnly: false,
    validateStatus: "default",
    onCheckedChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof FormCheckbox>

export const Playground: Story = {
  parameters: describe(
    "Change the setting and controls to inspect its value, size and accessible inline feedback."
  ),
  render: function Playground(args) {
    const [, updateArgs] = useArgs()
    return (
      <FormCheckbox
        {...args}
        onCheckedChange={(checked) => {
          args.onCheckedChange?.(checked)
          updateArgs({ checked })
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("checkbox")
    await expect(input).toHaveAccessibleName("Send me delivery updates")
    await expect(input).toHaveAccessibleDescription(
      "Receive a message when your order ships."
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
          <FormCheckbox
            size={size}
            label="Send me delivery updates"
            helpText="Receive a message when your order ships."
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
      <FormCheckbox
        label="Send me delivery updates"
        helpText="Receive a message when your order ships."
      />
      <FormCheckbox
        label="Send me delivery updates"
        validateStatus="error"
        helpText="Accept delivery updates to continue with shipment tracking."
      />
      <FormCheckbox
        label="Send me delivery updates"
        validateStatus="warning"
        helpText="Review this preference before continuing."
      />
      <FormCheckbox
        label="Send me delivery updates"
        validateStatus="success"
        helpText="Your notification preference is saved."
        defaultChecked
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByRole("checkbox")[1]
    if (!input) throw new Error("Missing checkbox regression target")
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
      <FormCheckbox
        label="Send me delivery updates"
        disabled
        helpText="Your administrator manages this preference."
      />
      <FormCheckbox
        label="Send me delivery updates"
        disabled
        defaultChecked
        helpText="Your administrator manages this preference."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("checkbox"))
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
      <FormCheckbox
        name="uncontrolled-preference"
        label="Send me delivery updates"
        readOnly
        defaultChecked
        helpText="This preference is locked by your account policy."
      />
      <FormCheckbox
        name="controlled-preference"
        label="Send me delivery updates"
        readOnly
        checked
        helpText="This preference is locked by your account policy."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("checkbox")) {
      await expect(input).not.toBeDisabled()
      input.focus()
      await expect(input).toHaveFocus()
      await userEvent.keyboard(" ")
      await userEvent.click(input)
      await expect(input).toBeChecked()
    }
  },
}

export const Indeterminate: Story = {
  parameters: describe(
    "A horizontal dash indicates partial selection, distinct from a checked box or radio dot."
  ),
  render: () => (
    <div className="flex flex-col gap-250">
      <FormCheckbox
        label="Select all delivery channels"
        indeterminate
        helpText="Two of three delivery channels are selected."
      />
      <FormCheckbox
        label="Select all delivery channels"
        indeterminate
        disabled
        helpText="Your administrator manages these channels."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("checkbox")) {
      await expect(input).toBePartiallyChecked()
      await expect((input as HTMLInputElement).indeterminate).toBe(true)
      await expect(input).toHaveAttribute("aria-checked", "mixed")
    }
  },
}

export const MixedStateUpdates: Story = {
  parameters: describe(
    "Changes from partial to complete group selection synchronize the native mixed state, checked value and visual mark."
  ),
  render: function MixedStateUpdates() {
    const [mixed, setMixed] = useState(true)
    return (
      <div className="flex flex-col gap-200">
        <FormCheckbox
          label="Select all delivery channels"
          checked={!mixed}
          indeterminate={mixed}
        />
        <Button variant="secondary" onClick={() => setMixed((value) => !value)}>
          Update channel selection
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("checkbox")
    const update = canvas.getByRole("button", {
      name: "Update channel selection",
    })
    await expect(input).toBePartiallyChecked()
    await userEvent.click(update)
    await expect(input).toBeChecked()
    await expect(input).not.toBePartiallyChecked()
    await expect(input).toHaveAttribute("aria-checked", "true")
    await userEvent.click(update)
    await expect(input).toBePartiallyChecked()
    await expect(input).toHaveAttribute("aria-checked", "mixed")
  },
}

export const NativeFormContract: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Rejected proposals preserve the submitted value; restoring defaults updates native, accessible and visible state together, including external form ownership." } } },
  render: () => <ChoiceContract kind="checkbox" />,
  play: async ({ canvasElement }) => checkChoiceContract(canvasElement),
}

export const RichLabels: Story = {
  parameters: describe("Stretching text slots align end-column counts while longer choice labels wrap without squeezing the control."),
  render: () => <div className="flex w-full max-w-xs flex-col gap-200">
    {[["Cotton", "18"], ["Long-staple organic linen for lightweight summer layers", "1099"]].map(([label, count]) => <FormCheckbox key={label} label={<span className="flex min-w-0 flex-1 justify-between gap-150"><span className="min-w-0">{label}</span><span className="shrink-0 text-end tabular-nums" data-choice-count>{count}</span></span>} />)}
  </div>,
  play: async ({ canvasElement }) => {
    const counts = Array.from(canvasElement.querySelectorAll("[data-choice-count]"))
    const [first, second] = counts
    if (!first || !second) throw new Error("Missing aligned label counts")
    await expect(Math.abs(first.getBoundingClientRect().right - second.getBoundingClientRect().right)).toBeLessThan(1)
  },
}

const trackNativeRef = fn()
const trackNativeChange = fn()
export const NativeInputContract: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "ref targets the focusable native input. inputProps forwards native attributes and consumer-first cancellable handlers. Explicit names work without visible children; callback ref disposers and object refs survive replacement and unmount." } } },
  render: function NativeInputContract() {
    const [version, setVersion] = useState(0)
    const [shown, setShown] = useState(true)
    const [revision, setRevision] = useState(0)
    const objectRef = useRef<HTMLInputElement>(null)
    const refs = useMemo(() => [
      (node: HTMLInputElement | null) => { trackNativeRef(node ? "A:attach" : "A:null"); return () => trackNativeRef("A:cleanup") },
      (node: HTMLInputElement | null) => { trackNativeRef(node ? "legacy:attach" : "legacy:null") },
    ], [])
    return <div className="grid gap-200" data-revision={revision}>
      <span id="native-contract-help">Native help.</span>
      {shown && <FormCheckbox ref={version === 2 ? objectRef : refs[version]} aria-label="Named toggle" aria-describedby="native-contract-help" helpText="Generated help." defaultChecked inputProps={{ title: "Native target", onClick: event => event.preventDefault() }} onCheckedChange={trackNativeChange} />}
      <Button onClick={() => setRevision(revision + 1)}>Rerender</Button>
      <Button onClick={() => setVersion(Math.min(version + 1, 2))}>Replace ref</Button>
      <Button onClick={() => objectRef.current?.focus()}>Focus input</Button>
      <Button onClick={() => objectRef.current?.blur()}>Blur input</Button>
      <Button onClick={() => setShown(false)}>Unmount input</Button>
      <Button onClick={() => trackNativeRef(objectRef.current ? "object:attached" : "object:cleared")}>Inspect object ref</Button>
    </div>
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    trackNativeRef.mockClear(); trackNativeChange.mockClear()
    const input = canvas.getByRole("checkbox", { name: "Named toggle" })
    await expect(input).not.toHaveAttribute("aria-labelledby")
    await expect(input).toHaveAccessibleDescription("Native help. Generated help.")
    await userEvent.click(input)
    await expect(input).toBeChecked()
    await expect(trackNativeChange).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Rerender" }))
    await expect(trackNativeRef).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Replace ref" }))
    await expect(trackNativeRef.mock.calls.map(([event]) => event)).toEqual(["A:cleanup", "legacy:attach"])
    await userEvent.click(canvas.getByRole("button", { name: "Replace ref" }))
    await expect(trackNativeRef).toHaveBeenLastCalledWith("legacy:null")
    await userEvent.click(canvas.getByRole("button", { name: "Focus input" }))
    await expect(input).toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "Blur input" }))
    await expect(input).not.toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "Inspect object ref" }))
    await expect(trackNativeRef).toHaveBeenLastCalledWith("object:attached")
    await userEvent.click(canvas.getByRole("button", { name: "Unmount input" }))
    await userEvent.click(canvas.getByRole("button", { name: "Inspect object ref" }))
    await expect(trackNativeRef).toHaveBeenLastCalledWith("object:cleared")
  },
}

export const NativeCheckboxReset: Story = {
  parameters: describe("The standalone Checkbox atom restores native default state without a synthetic change. Its next real activation still notifies React exactly once."),
  render: function NativeCheckboxReset() {
    const [changes, setChanges] = useState(0)
    return <form className="grid gap-200">
      <Checkbox aria-label="Native choice" defaultChecked={false} onChange={() => setChanges(changes + 1)} />
      <span>Native changes: {changes}</span>
      <Button type="reset">Reset native checkbox</Button>
    </form>
  },
  play: async ({canvasElement}) => {
    const canvas=within(canvasElement)
    const input=canvas.getByRole("checkbox",{name:"Native choice"})
    await userEvent.click(input)
    await expect(canvas.getByText("Native changes: 1")).toBeVisible()
    await userEvent.click(canvas.getByRole("button",{name:"Reset native checkbox"}))
    await waitFor(()=>expect(input).not.toBeChecked())
    await userEvent.click(input)
    await expect(input).toBeChecked()
    await expect(canvas.getByText("Native changes: 2")).toBeVisible()
  },
}
