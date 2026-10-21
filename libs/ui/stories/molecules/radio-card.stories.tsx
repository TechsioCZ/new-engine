import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { useArgs } from "storybook/preview-api"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { RadioCard, type RadioCardProps } from "../../src/molecules/radio-card"
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
}: Omit<RadioCardProps, "children"> & { helpText?: string }) {
  return (
    <RadioCard {...props}>
      <RadioCard.Label>Delivery method</RadioCard.Label>
      <div
        className={
          props.orientation === "vertical"
            ? "grid w-full gap-150"
            : "grid w-full gap-150 md:grid-cols-3"
        }
      >
        {deliveryOptions.map((option) => (
          <RadioCard.Item key={option.value} value={option.value}>
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemContent>
                <RadioCard.ItemText>{option.label}</RadioCard.ItemText>
                <RadioCard.ItemDescription>
                  {option.description}
                </RadioCard.ItemDescription>
              </RadioCard.ItemContent>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
            <RadioCard.ItemAddon>{option.price}</RadioCard.ItemAddon>
          </RadioCard.Item>
        ))}
      </div>
      <RadioCard.StatusText>{helpText}</RadioCard.StatusText>
    </RadioCard>
  )
}
const meta: Meta<typeof RadioCard> = {
  title: "Molecules/RadioCard",
  component: RadioCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Rich single-choice cards for a short set of options with descriptions or prices. Use RadioGroup for compact text options, Select for long lists, and FormCheckbox for independent choices.",
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
    onValueChange: { control: false },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    required: { control: "boolean" },
    validateStatus: {
      control: "select",
      options: ["default", "error", "warning", "success"],
    },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    itemOrientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    align: { control: "select", options: ["start", "center", "end"] },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between"],
    },
  },
  args: {
    value: "standard",
    size: "md",
    variant: "outline",
    orientation: "horizontal",
    disabled: false,
    readOnly: false,
    validateStatus: "default",
    onValueChange: fn(),
  },
}
export default meta
type Story = StoryObj<typeof RadioCard>
export const Playground: Story = {
  parameters: describe(
    "Select a delivery method and use controls to inspect variants, sizing and validation."
  ),
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
    await expect(input).toHaveAccessibleDescription(
      "Choose how you would like to receive your order. Arrives in 3–5 business days. Free"
    )
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
    for (const card of canvasElement.querySelectorAll<HTMLElement>(
      '[data-part="item"][data-state="checked"]'
    )) {
      for (const hovered of [false, true]) {
        if (hovered) await userEvent.hover(card)
        await waitFor(async () => {
          for (const text of card.querySelectorAll<HTMLElement>(
            '[data-part="item-text"], [data-part="item-description"], [data-part="item-addon"]'
          )) {
            await expect(textContrast(text)).toBeGreaterThanOrEqual(4.5)
          }
        })
        if (hovered) await userEvent.unhover(card)
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
    await expect(input).toHaveAttribute("aria-invalid", "true")
    const id = input.getAttribute("aria-errormessage")
    await expect(id).toBeTruthy()
    await expect(input.getAttribute("aria-describedby")?.split(" ")).toContain(
      id
    )
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
        <RadioCard
          aria-describedby="delivery-context"
          validateStatus={invalid ? "error" : "default"}
          defaultValue="standard"
        >
          <RadioCard.Label>Delivery method</RadioCard.Label>

          <RadioCard.Item value="standard">
            <RadioCard.ItemHiddenInput />
            <RadioCard.ItemControl>
              <RadioCard.ItemText>Standard delivery</RadioCard.ItemText>
              <RadioCard.ItemIndicator />
            </RadioCard.ItemControl>
          </RadioCard.Item>

          <RadioCard.StatusText status="default">
            Your address determines available delivery methods.
          </RadioCard.StatusText>
          {invalid && (
            <RadioCard.StatusText>
              Select an available delivery method before continuing.
            </RadioCard.StatusText>
          )}
        </RadioCard>
        <Button theme="outlined" size="sm" onClick={() => setInvalid(false)}>
          Clear validation
        </Button>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("radio")
    const errorId = input.getAttribute("aria-errormessage")
    await expect(errorId).toBeTruthy()
    const descriptions =
      input.getAttribute("aria-describedby")?.split(" ") ?? []
    await expect(new Set(descriptions).size).toBe(3)
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear validation" })
    )
    await waitFor(() => expect(input).not.toHaveAttribute("aria-errormessage"))
    await expect(input).not.toHaveAttribute("aria-invalid")
    await expect(input.getAttribute("aria-describedby")).not.toContain(errorId)
  },
}

// Resolve theme colors (including color-mix/oklch) in the browser's sRGB canvas.
function textContrast(element: HTMLElement) {
  const context = document.createElement("canvas").getContext("2d")
  if (!context) throw new Error("Canvas color resolution is unavailable")
  context.fillStyle = "white"
  context.fillRect(0, 0, 1, 1)
  const ancestors: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement)
    ancestors.unshift(node)
  for (const node of ancestors) {
    context.fillStyle = getComputedStyle(node).backgroundColor
    context.fillRect(0, 0, 1, 1)
  }
  const background = context.getImageData(0, 0, 1, 1).data
  context.fillStyle = getComputedStyle(element).color
  context.fillRect(0, 0, 1, 1)
  const foreground = context.getImageData(0, 0, 1, 1).data
  const luminance = (color: Uint8ClampedArray) =>
    Array.from(color)
      .slice(0, 3)
      .reduce((sum, channel, index) => {
        const value = channel / 255
        const linear =
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        return sum + linear * ([0.2126, 0.7152, 0.0722][index] ?? 0)
      }, 0)
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}
