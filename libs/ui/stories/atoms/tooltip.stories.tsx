import type { Meta, StoryObj } from "@storybook/react"
import { type ComponentPropsWithoutRef, useState } from "react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Tooltip } from "../../src/atoms/tooltip"

const meta = {
  title: "Atoms/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "Tooltip provides a short, non-interactive hint on hover or keyboard focus. Keep essential instructions visible with StatusText. Use Popover for links, buttons or editable content; a tooltip must not contain interactive controls." } },
  },
  argTypes: {
    content: { control: "text" },
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: { control: "select", options: ["default", "outline"] },
    placement: { control: "select", options: ["top", "right", "bottom", "left"] },
    disabled: { control: "boolean" },
    openDelay: { control: { type: "range", min: 0, max: 1500, step: 100 } },
    closeDelay: { control: { type: "range", min: 0, max: 1500, step: 100 } },
    children: { control: false }, ref: { control: false }, id: { control: false },
    open: { control: false }, onOpenChange: { control: false },
  },
  args: { content: "Download a copy of this order as a PDF.", size: "md", openDelay: 200, closeDelay: 200, children: <Button variant="secondary">Download order</Button> },
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Hover or focus the action, then change the content, size, variant and delays using Controls." } } },
  render: (args) => <Tooltip {...args} />,
}

export const Variants: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Default and outline hints share an opaque surface; the outline adds separation against busy backgrounds." } } },
  render: () => <div className="flex flex-wrap gap-300">{(["default", "outline"] as const).map((variant) => <Tooltip key={variant} content="Download a PDF copy." variant={variant}><Button variant="secondary">{variant === "default" ? "Default" : "Outline"}</Button></Tooltip>)}</div>,
}

export const Sizes: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Small (sm), Medium (md) and Large (lg) use identical hints so the type and spacing scale can be compared." } } },
  render: () => <VariantContainer>{([["sm", "Small (sm)"], ["md", "Medium (md)"], ["lg", "Large (lg)"]] as const).map(([size, label]) => <VariantGroup key={size} title={label}><Tooltip content="Download a PDF copy." size={size}><Button size={size} variant="secondary">Download order</Button></Tooltip></VariantGroup>)}</VariantContainer>,
}

export const States: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Available actions show optional hints; disabled actions remain visibly unavailable without relying on a tooltip for essential instructions." } } },
  render: () => <div className="flex flex-wrap gap-300"><Tooltip content="Download a PDF copy."><Button variant="secondary">Download order</Button></Tooltip><Tooltip disabled content="Download a PDF copy."><Button variant="secondary" disabled>Download unavailable</Button></Tooltip></div>,
}

export const LongContent: Story = {
  args: { content: "Order reference: AKROS-2026-" + "AB1234567890".repeat(9), children: <Button variant="secondary">Show order reference</Button>, openDelay: 0, closeDelay: 0 },
  parameters: { docs: { description: { story: "Even an unbroken order reference wraps inside a viewport-bounded surface instead of overflowing a phone screen." } } },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button"))
    const hint = await within(canvasElement.ownerDocument.body).findByRole("tooltip")
    await expect(hint).toBeVisible()
    const rect = hint.getBoundingClientRect()
    await expect(rect.width).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientWidth)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(hint).not.toBeInTheDocument())
  },
}

const tooltipChildRefCleanup = fn()
const tooltipChildRef = fn((node: HTMLButtonElement | null) =>
  node ? tooltipChildRefCleanup : undefined
)

function StatefulTooltipTrigger(props: ComponentPropsWithoutRef<typeof Button>) {
  const [count, setCount] = useState(0)
  return (
    <Button {...props} ref={tooltipChildRef} onClick={() => setCount(count + 1)}>
      Keyboard trigger {count}
    </Button>
  )
}

export const KeyboardDescription: Story = {
  tags: ['ui-semantic-regression'],
  parameters: { docs: { description: { story: 'Keyboard focus opens the hint without replacing an existing description or resetting the trigger ref.' } } },
  render: () => (
    <div className="grid gap-150">
      <p id="tooltip-caller-description">Caller description.</p>
      <Tooltip
        content="Tooltip description."
        openDelay={0}
        closeDelay={0}
        closeOnClick={false}
        closeOnPointerDown={false}
      >
        <>
          <StatefulTooltipTrigger aria-describedby="tooltip-caller-description" />
        </>
      </Tooltip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const button = canvas.getByRole('button', { name: 'Keyboard trigger 0' })
    const cleanupsBeforeOpen = tooltipChildRefCleanup.mock.calls.length
    await expect(button).toHaveAccessibleDescription('Caller description.')
    await userEvent.tab()
    await expect(button).toHaveFocus()
    await expect(await page.findByRole('tooltip')).toBeVisible()
    await waitFor(() => {
      expect(button).toHaveAccessibleDescription('Caller description. Tooltip description.')
    })
    await userEvent.click(button)
    await expect(button).toHaveTextContent('Keyboard trigger 1')
    await expect(tooltipChildRefCleanup.mock.calls.length).toBe(cleanupsBeforeOpen)

    await userEvent.keyboard('{Escape}')
    await waitFor(() => {
      expect(page.queryByRole('tooltip')).toBeNull()
      expect(button).toHaveAccessibleDescription('Caller description.')
      expect(button).toHaveTextContent('Keyboard trigger 1')
      expect(tooltipChildRefCleanup.mock.calls.length).toBe(cleanupsBeforeOpen)
    })
  },
}
