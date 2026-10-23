import { ChoiceContract, checkChoiceContract, DynamicRadioChoices, checkDynamicRadioChoices } from "./choice-contract"
import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  RadioGroup,
  type RadioGroupProps,
} from "../../src/molecules/radio-group"
const describe = (story: string) => ({ docs: { description: { story } } })

const deliveryOptions = [
  {
    value: "standard",
    label: "Standard delivery",
    description: "Arrives in 3–5 business days.",
    price: "Free",
  },
  {
    value: "express",
    label: "Express delivery",
    description: "Arrives the next business day.",
    price: "€8.90",
  },
  {
    value: "pickup",
    label: "Store pickup",
    description: "Available after the store confirms your order.",
    price: "Free",
  },
]

function DeliveryOptions({
  helpText = "Choose how you would like to receive your order.",
  ...props
}: Omit<RadioGroupProps, "children"> & { helpText?: string }) {
  return (
    <RadioGroup {...props}>
      <RadioGroup.Label>Delivery method</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        {deliveryOptions.map((option) => (
          <RadioGroup.Item key={option.value} value={option.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemContent>
              <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
              <RadioGroup.ItemDescription>
                {option.description}
              </RadioGroup.ItemDescription>
            </RadioGroup.ItemContent>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      <RadioGroup.StatusText>{helpText}</RadioGroup.StatusText>
    </RadioGroup>
  )
}
const playgroundSource = String.raw`import { useState } from "react"
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"

export function DeliveryField() {
  const [value, setValue] = useState<string | null>("standard")
  return (
    <RadioGroup name="delivery" value={value} onValueChange={setValue} orientation="vertical">
      <RadioGroup.Label>Delivery method</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        {[
          { value: "standard", label: "Standard delivery" },
          { value: "express", label: "Express delivery" },
        ].map((option) => (
          <RadioGroup.Item key={option.value} value={option.value}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      <RadioGroup.StatusText>Choose a delivery method.</RadioGroup.StatusText>
    </RadioGroup>
  )
}`

const meta: Meta<typeof RadioGroup> = {
  title: "Molecules/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Compact mutually exclusive options. Pair controlled value with onValueChange={setValue}; callbacks propose changes and never overwrite a refused controlled value. readOnly keeps selection and form submission intact while preventing pointer and keyboard edits. disabled removes controls from interaction/submission. validateStatus=\"error\" marks inputs invalid; render StatusText for an associated error with a next step. Native handlers on ItemHiddenInput run before cancellable machine actions; preventDefault() rejects activation. Use form=\"owner-id\" on Root for an external owner; accepted resets silently restore uncontrolled defaults; controlled values stay with their parent. Canceled resets preserve edits and never notify.\n\n### Compound member contracts\n\n- **`RadioGroup`** — children required; value + onValueChange is controlled, defaultValue is uncontrolled. No parent context. `ref`: `HTMLDivElement`.\n\n- **`RadioGroup.Label`** — Visible group name or supply aria-label/aria-labelledby to Root. Inside RadioGroup. `ref`: `HTMLLabelElement`.\n\n- **`RadioGroup.ItemGroup`** — Optional layout wrapper. Inside RadioGroup. `ref`: `HTMLDivElement`.\n\n- **`RadioGroup.Item`** — Unique nonempty value; disabled optional. Inside RadioGroup. `ref`: `HTMLLabelElement`.\n\n- **`RadioGroup.ItemHiddenInput`** — Required in every Item; native form submission, focus and input event handlers. Inside Item. `ref`: `HTMLInputElement`.\n\n- **`RadioGroup.ItemControl`** — Visual surface; never replace ItemHiddenInput. Inside Item. `ref`: `HTMLSpanElement`.\n\n- **`RadioGroup.ItemContent`** — Optional content layout. Inside Item. `ref`: `HTMLDivElement`.\n\n- **`RadioGroup.ItemText`** — Option name; render for generated accessible naming. Inside Item. `ref`: `HTMLSpanElement`.\n\n- **`RadioGroup.ItemDescription`** — Optional description; automatically registered. Inside Item. `ref`: `HTMLDivElement`.\n\n- **`RadioGroup.StatusText`** — Group helper/validation; status inherits validateStatus. Inside RadioGroup. `ref`: `HTMLDivElement`.\n\n- **`useRadioGroupContext()`** — import from `@techsio/ui-kit/molecules/radio-group` for custom members inside RadioGroup. Returns the group `api` and presentation/description context; throws outside Root. It accepts no props and has no ref target.",
      },
    },
  },
  argTypes: {
    id: { table: { disable: true } },
    ref: { table: { disable: true } },
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: {
      control: "inline-radio",
      options: ["outline", "subtle", "solid"],
    },
    value: {
      control: "select",
      options: ["standard", "express", "pickup", null],
    },
    defaultValue: { control: false },
    onValueChange: { control: false, description: "Controlled selection proposal; pair value with this callback. Canceled activation does not call it.", table: { type: { summary: "(value: string | null) => void" } } },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    orientation: {
      description: "Group orientation; arrange the options to match.",
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
  },
  args: {
    value: "standard",
    size: "md",
    variant: "outline",
    orientation: "vertical",
    disabled: false,
    readOnly: false,
    validateStatus: "default",
    onValueChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof RadioGroup>
export const Playground: Story = {
  parameters: {
    ...describe("Select a delivery method and use controls to inspect variants, sizing and validation."),
    docs: {
      description: { story: "Select a delivery method and use controls to inspect variants, sizing and validation." },
      source: { code: playgroundSource, language: "tsx", type: "code" },
    },
  },
  render: function Playground(args) {
    const [, updateArgs] = useArgs()
    return (
      <DeliveryOptions
        {...args}
        onValueChange={(value) => {
          args.onValueChange?.(value)
          updateArgs({ value })
        }}
      />
    )
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("radio", {
      name: "Standard delivery",
    })
    await waitFor(() => expect(input).toHaveAccessibleDescription(
      "Choose how you would like to receive your order. Arrives in 3–5 business days."
    ))
  },
}
export const Variants: Story = {
  parameters: describe(
    "Outline, subtle and solid treatments preserve a clear checked mark and readable option content."
  ),
  render: () => (
    <VariantContainer>
      {(["outline", "subtle", "solid"] as const).map((variant) => (
        <VariantGroup key={variant} title={variant} fullWidth>
          <DeliveryOptions variant={variant} defaultValue="standard" />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  play: async ({ canvasElement }) => {
    for (const control of canvasElement.querySelectorAll<HTMLElement>(
      '[data-part="item-control"][data-state="checked"]'
    )) {
      for (const hovered of [false, true]) {
        if (hovered) await userEvent.hover(control)
        await waitFor(async () => {
          await expect(indicatorContrast(control)).toBeGreaterThanOrEqual(3)
        })
        if (hovered) await userEvent.unhover(control)
      }
    }
  },
}
export const Sizes: Story = {
  parameters: describe(
    "Small, medium and large scale identical delivery choices, descriptions and guidance together."
  ),
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size, index) => (
        <VariantGroup
          key={size}
          title={["Small (sm)", "Medium (md)", "Large (lg)"][index] ?? size}
          fullWidth
        >
          <DeliveryOptions size={size} defaultValue="standard" />
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
}
export const States: Story = {
  parameters: describe(
    "Actionable feedback includes status icons and is associated with every focusable radio input."
  ),
  render: () => (
    <div className="flex flex-col gap-300">
      <DeliveryOptions
        required
        validateStatus="error"
        helpText="Select a delivery method before continuing."
      />
      <DeliveryOptions
        defaultValue="express"
        validateStatus="warning"
        helpText="Express delivery is unavailable on public holidays."
      />
      <DeliveryOptions
        defaultValue="standard"
        validateStatus="success"
        helpText="Your delivery preference is saved."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getAllByRole("radio")[0]
    if (!input) throw new Error("Missing radio regression target")
    // Compound messages register after mount; wait for their associations,
    // not just the root's synchronous invalid state.
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "true")
      const id = input.getAttribute("aria-errormessage")
      expect(id).toBeTruthy()
      expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(id)
      expect(canvasElement.ownerDocument.getElementById(id ?? "")).toHaveTextContent(
        "Select a delivery method before continuing."
      )
    })
  },
}
export const Disabled: Story = {
  parameters: describe(
    "An unavailable delivery group retains its selected value and removes all native input tab stops."
  ),
  render: () => (
    <DeliveryOptions
      disabled
      defaultValue="standard"
      helpText="Delivery is not available until you add an address."
    />
  ),
  play: async ({ canvasElement }) => {
    for (const input of within(canvasElement).getAllByRole("radio"))
      await expect(input).toBeDisabled()
  },
}
export const ReadOnly: Story = {
  name: "Read-only",
  parameters: describe(
    "Controlled and uncontrolled read-only groups preserve focus and form values while rejecting clicks, Space and arrow selection."
  ),
  render: () => (
    <div className="flex flex-col gap-300">
      <DeliveryOptions
        name="saved-delivery"
        readOnly
        defaultValue="standard"
        helpText="The delivery method cannot change after dispatch."
      />
      <DeliveryOptions
        name="controlled-delivery"
        readOnly
        value="standard"
        helpText="The delivery method cannot change after dispatch."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const input of canvas.getAllByRole("radio", {
      name: "Standard delivery",
    })) {
      await expect(input).not.toBeDisabled()
      input.focus()
      await expect(input).toHaveFocus()
      await userEvent.keyboard("{ArrowRight} ")
      await expect(input).toBeChecked()
    }
    for (const input of canvas.getAllByRole("radio", {
      name: "Express delivery",
    })) {
      await userEvent.click(input)
      await expect(input).not.toBeChecked()
    }
  },
}
export const MultipleDescriptions: Story = {
  parameters: describe(
    "Several mounted helper and error messages receive unique IDs, merge with caller descriptions and clean up when validation clears."
  ),
  render: function FeedbackDemo() {
    const [invalid, setInvalid] = useState(true)
    return (
      <div className="flex flex-col gap-200">
        <p id="delivery-context">Delivery for order TS-2048.</p>
        <RadioGroup
          aria-describedby="delivery-context"
          validateStatus={invalid ? "error" : "default"}
          defaultValue="standard"
        >
          <RadioGroup.Label>Delivery method</RadioGroup.Label>
          <RadioGroup.ItemGroup>
            <RadioGroup.Item value="standard">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl />
              <RadioGroup.ItemText>Standard delivery</RadioGroup.ItemText>
            </RadioGroup.Item>
          </RadioGroup.ItemGroup>
          <RadioGroup.StatusText status="default">
            Your address determines available delivery methods.
          </RadioGroup.StatusText>
          {invalid && (
            <RadioGroup.StatusText>
              Select an available delivery method before continuing.
            </RadioGroup.StatusText>
          )}
        </RadioGroup>
        <Button theme="outlined" size="sm" onClick={() => setInvalid(false)}>
          Clear validation
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("radio")
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "true")
      expect(input).toHaveAttribute("aria-errormessage")
      const descriptions = input.getAttribute("aria-describedby")?.split(" ") ?? []
      expect(new Set(descriptions).size).toBe(3)
      expect(input).toHaveAccessibleDescription(
        "Delivery for order TS-2048. Your address determines available delivery methods. Select an available delivery method before continuing."
      )
    })
    const errorId = input.getAttribute("aria-errormessage")
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear validation" })
    )
    await waitFor(() => {
      expect(input).not.toHaveAttribute("aria-errormessage")
      expect(input).not.toHaveAttribute("aria-invalid")
      expect(input.getAttribute("aria-describedby")).not.toContain(errorId)
      expect(input).toHaveAccessibleDescription(
        "Delivery for order TS-2048. Your address determines available delivery methods."
      )
    })
  },
}

function indicatorContrast(control: HTMLElement) {
  const indicator = control.querySelector("span")
  const context = document.createElement("canvas").getContext("2d")
  if (!indicator || !context) throw new Error("Missing radio contrast target")
  context.fillStyle = "white"
  context.fillRect(0, 0, 1, 1)
  const ancestors: Element[] = []
  for (let node: Element | null = control; node; node = node.parentElement) {
    ancestors.unshift(node)
  }
  for (const node of ancestors) {
    context.fillStyle = getComputedStyle(node).backgroundColor
    context.fillRect(0, 0, 1, 1)
  }
  const backgroundColor = context.getImageData(0, 0, 1, 1).data
  context.fillStyle = getComputedStyle(indicator).color
  context.fillRect(0, 0, 1, 1)
  const foregroundColor = context.getImageData(0, 0, 1, 1).data
  const luminance = (channels: Uint8ClampedArray) => {
    return Array.from(channels)
      .slice(0, 3)
      .reduce((sum, channel, index) => {
        const value = channel / 255
        const linear =
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0)
      }, 0)
  }
  const foreground = luminance(foregroundColor)
  const background = luminance(backgroundColor)
  return (
    (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05)
  )
}

export const NativeFormContract: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Rejected proposals preserve the submitted value; restoring defaults updates native, accessible and visible state together, including external form ownership." } } },
  render: () => <ChoiceContract kind="radio-group" />,
  play: async ({ canvasElement }) => checkChoiceContract(canvasElement),
}

export const ChangingOptions: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Removing a focused delivery method moves focus to the next available method without silently changing the saved selection." } } },
  render: () => <DynamicRadioChoices kind="radio-group" />,
  play: async ({ canvasElement }) => checkDynamicRadioChoices(canvasElement),
}

const trackCancelledChoice = fn()
const trackObservedChoice = fn()
export const CancellableActivation: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Consumer ItemHiddenInput.onClick can cancel controlled and uncontrolled proposals; observational handlers still run. Arrow keys wrap consistently, including mobile WebKit." } } },
  render: () => <div className="grid gap-250">{[false, true].map(controlled => <RadioGroup key={String(controlled)} aria-label={controlled ? "Controlled choices" : "Default choices"} value={controlled ? "one" : undefined} defaultValue={controlled ? undefined : "one"} onValueChange={trackCancelledChoice}>
    {["one", "two", "three"].map(value => <RadioGroup.Item key={value} value={value}>
      <RadioGroup.ItemHiddenInput onClick={event => { trackObservedChoice(value); if (value === "two") event.preventDefault() }} />
      <RadioGroup.ItemControl /><RadioGroup.ItemText>{value}</RadioGroup.ItemText>
    </RadioGroup.Item>)}
  </RadioGroup>)}</div>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    trackCancelledChoice.mockClear(); trackObservedChoice.mockClear()
    for (const group of canvas.getAllByRole("radiogroup")) {
      const radios = within(group).getAllByRole("radio")
      await userEvent.click(radios[1]!)
      await expect(radios[0]).toBeChecked()
      await expect(radios[1]).not.toBeChecked()
    }
    await expect(trackCancelledChoice).not.toHaveBeenCalled()
    await expect(trackObservedChoice).toHaveBeenCalledTimes(2)
    const radios = within(canvas.getByRole("radiogroup", { name: "Default choices" })).getAllByRole("radio")
    radios[0]!.focus()
    await userEvent.keyboard("{ArrowUp}")
    await expect(radios[2]).toBeChecked()
    await expect(trackObservedChoice).toHaveBeenCalledTimes(3)
  },
}

export const KeyboardWrapping: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Native inputs provide focus and form values; one arrow implementation prevents duplicate native/machine changes and wraps in either direction." } } },
  render: () => <DeliveryOptions defaultValue="standard" />,
  play: async ({ canvasElement }) => {
    const radios = within(canvasElement).getAllByRole("radio")
    radios[0]!.focus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(radios[1]).toBeChecked()
    await userEvent.keyboard("{ArrowUp}")
    await expect(radios[0]).toBeChecked()
    await userEvent.keyboard("{ArrowUp}")
    await expect(radios[2]).toBeChecked()
    await expect(radios[2]).toHaveFocus()
  },
}
