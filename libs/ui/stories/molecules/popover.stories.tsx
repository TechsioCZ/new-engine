import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import {
  PopoverTemplate,
  type PopoverTemplateProps,
} from "../../src/templates/popover"

type PopoverStoryArgs = PopoverTemplateProps

function PopoverStory(args: PopoverStoryArgs) {
  return <PopoverTemplate {...args} />
}

const meta = {
  title: "Molecules/Popover",
  component: PopoverStory,
  parameters: {
    layout: "centered",
    docs: { description: { component: "Popover holds a short, interactive surface anchored to an action, such as delivery details or a quick edit. It dismisses without blocking the page. Use Tooltip for non-interactive hints, Menu for commands and Dialog for longer or modal tasks." } },
  },
  tags: ["autodocs"],
  argTypes: {
    placement: {
      control: "select",
      options: [
        "top",
        "bottom",
        "left",
        "right",
        "top-start",
        "top-end",
        "bottom-start",
        "bottom-end",
        "left-start",
        "left-end",
        "right-start",
        "right-end",
      ],
      description: "Position of the popover relative to the trigger",
      table: { defaultValue: { summary: "bottom" } },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size of the popover content area",
      table: { defaultValue: { summary: "md" } },
    },
    shadow: {
      control: "boolean",
      description: "Whether to show shadow on the popover",
      table: { defaultValue: { summary: "true" } },
    },
    border: {
      control: "boolean",
      description: "Whether to show border on the popover",
      table: { defaultValue: { summary: "true" } },
    },
    showArrow: {
      control: "boolean",
      description: "Whether to show the arrow indicator",
      table: { defaultValue: { summary: "true" } },
    },
    showCloseButton: {
      control: "boolean",
      description: "Whether to show the close button in the popover",
      table: { defaultValue: { summary: "false" } },
    },
    modal: {
      control: "boolean",
      description: "Whether the popover behaves as a modal (traps focus)",
      table: { defaultValue: { summary: "false" } },
    },
    disabled: {
      control: "boolean",
      description: "Whether the trigger is disabled",
      table: { defaultValue: { summary: "false" } },
    },
    title: {
      control: "text",
      description: "Optional title for the popover",
    },
    description: {
      control: "text",
      description: "Optional description text",
    },
    trigger: {
      control: "text",
      description: "Content of the trigger button",
    },
    id: {
      table: { disable: true },
    },
    children: {
      table: { disable: true },
    },
  },
  args: {
    placement: "bottom",
    size: "md",
    shadow: true,
    border: true,
    showArrow: true,
    modal: false,
    disabled: false,
    trigger: "Delivery details",
    title: "Delivery details",
    description: "Standard delivery takes 2–4 business days.",
    children: (
      <div className="mt-200">
        <p>We send a tracking link when your order leaves our warehouse.</p>
      </div>
    ),
  },
} satisfies Meta<typeof PopoverStory>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Explore placement, size, surface and arrow controls with realistic delivery information." } } },
  args: {
    id: "playground-popover",
  },
}

export const Variants: Story = {
  parameters: { docs: { description: { story: "Compare border, shadow and arrow choices without changing the content hierarchy." } } },
  args: {},
  render: () => (
    <div className="space-y-400">
      <div>
        <h3 className="mb-200 text-sm font-semibold">Visual Styles</h3>
        <div className="flex flex-wrap gap-200">
          <PopoverTemplate
            border={true}
            id="border-shadow-popover"
            shadow={true}
            title="Default Style"
            trigger="Default"
          >
            <p>Border + Shadow (default)</p>
          </PopoverTemplate>

          <PopoverTemplate
            border={true}
            id="border-only-popover"
            shadow={false}
            title="Flat Style"
            trigger="border-only"
          >
            <p>Border only, no shadow</p>
          </PopoverTemplate>

          <PopoverTemplate
            border={false}
            id="shadow-only-popover"
            shadow={true}
            title="Elevated Style"
            trigger="shadow-only"
          >
            <p>Shadow only, no border</p>
          </PopoverTemplate>

          <PopoverTemplate
            border={false}
            id="minimal-popover"
            shadow={false}
            title="Minimal Style"
            trigger="Minimal"
          >
            <p>No border, no shadow</p>
          </PopoverTemplate>
        </div>
      </div>

      <div>
        <h3 className="mb-200 text-sm font-semibold">Arrow Options</h3>
        <div className="flex flex-wrap gap-200">
          <PopoverTemplate
            id="no-arrow-popover"
            showArrow={false}
            title="Clean Look"
            trigger="No Arrow"
          >
            <p>No arrow indicator</p>
          </PopoverTemplate>
        </div>
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Small (sm), Medium (md) and Large (lg) use identical content to compare panel density, body text and headings." } } },
  render: () => <div className="flex flex-wrap gap-400">{([["sm", "Small (sm)"], ["md", "Medium (md)"], ["lg", "Large (lg)"]] as const).map(([size, label]) => <section className="space-y-200" key={size}><h3 className="font-semibold text-sm">{label}</h3><PopoverTemplate size={size} title="Delivery details" trigger="Delivery details" description="Standard delivery takes 2–4 business days."><p>Track your order from your account.</p></PopoverTemplate></section>)}</div>,
}

export const Disabled: Story = {
  name: "States",
  parameters: { docs: { description: { story: "An unavailable trigger stays out of keyboard interaction and cannot open its panel." } } },
  args: {
    id: "disabled-popover",
    trigger: "Disabled Popover",
    disabled: true,
    title: "Disabled State",
    description: "This popover trigger is disabled and cannot be opened.",
    children: (
      <div className="mt-200">
        <p>This content should not be accessible.</p>
      </div>
    ),
  },
}

export const WithTitleAndDescription: Story = {
  parameters: { docs: { description: { story: "A clear title names the panel while a short description provides context for its body content." } } },
  args: {
    id: "title-description-popover",
    trigger: "Open popover",
    title: "Delivery details",
    description: "This is a helpful description that provides more context.",
    children: (
      <div className="mt-200">
        <p>Additional content can go here.</p>
      </div>
    ),
  },
}

export const Controlled: Story = {
  parameters: { docs: { description: { story: "External actions and the trigger share one controlled open state and dismissal path." } } },
  args: {},
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className="flex flex-col items-center gap-200">
        <div className="flex gap-100">
          <Button onClick={() => setOpen(true)} size="sm" variant="secondary">
            Open Popover
          </Button>
          <Button onClick={() => setOpen(false)} size="sm" variant="secondary">
            Close Popover
          </Button>
        </div>

        <PopoverTemplate
          description="This popover is controlled by external state"
          id="controlled-popover"
          onOpenChange={(details) => setOpen(details.open)}
          open={open}
          title="Controlled Popover"
          trigger="Controlled Popover"
        >
          <div className="mt-200">
            <p>The popover is {open ? "open" : "closed"}.</p>
            <Button
              className="mt-100"
              onClick={() => setOpen(false)}
              size="sm"
              variant="secondary"
            >
              Close from inside
            </Button>
          </div>
        </PopoverTemplate>
      </div>
    )
  },
}

export const WithForm: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A quick profile edit keeps Cancel before Save, closes on completion and confirms the simulated save without reloading." } } },
  render: () => {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [saved, setSaved] = useState(false)
    return <div className="space-y-200"><PopoverTemplate trigger="Edit delivery contact" title="Delivery contact" description="Update the contact name for this order." open={open} onOpenChange={(details) => setOpen(details.open)}>
      <form className="mt-200 space-y-200" onSubmit={(event) => { event.preventDefault(); setSaved(true); setOpen(false) }}>
        <div className="space-y-100"><Label htmlFor={`${id}-name`} size="sm" required>Full name</Label><Input id={`${id}-name`} size="sm" defaultValue="Mara Nováková" required aria-describedby={`${id}-hint`} /><StatusText size="sm" id={`${id}-hint`}>Use the name shown on your delivery address.</StatusText></div>
        <div className="flex justify-end gap-100"><Button onClick={() => setOpen(false)} size="sm" variant="secondary">Cancel</Button><Button size="sm" type="submit">Save contact</Button></div>
      </form>
    </PopoverTemplate>{saved && <StatusText status="success">Delivery contact saved for this preview.</StatusText>}</div>
  },
}

export const CustomTrigger: Story = {
  parameters: { docs: { description: { story: "Compose the anchored panel with an alternative trigger while preserving its accessible name." } } },
  args: {},
  render: () => (
    <div className="flex flex-wrap gap-200">
      <PopoverTemplate
        id="custom-trigger-popover"
        title="Delivery information"
        trigger={
          <div className="flex items-center gap-100">
            <Icon icon="token-icon-info" size="sm" />
            <span>Info</span>
          </div>
        }
        triggerClassName="flex items-center gap-100 px-200 py-100 rounded-md hover:bg-info/10"
      >
        <div className="w-3xs">
          <p>This popover uses a custom trigger with an icon.</p>
        </div>
      </PopoverTemplate>

      <PopoverTemplate
        id="custom-area-trigger-popover"
        title="Custom area details"
        trigger={
          <div className="rounded-lg border-2 border-border border-dashed p-100">
            <p className="text-sm">Click this custom area</p>
          </div>
        }
        triggerClassName="hover:border-primary focus:border-primary"
      >
        <div className="w-3xs">
          <p>This popover uses a completely custom trigger element.</p>
        </div>
      </PopoverTemplate>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    for (const [triggerName, title] of [
      ["Info", "Delivery information"],
      ["Click this custom area", "Custom area details"],
    ]) {
      const trigger = canvas.getByRole("button", { name: triggerName })
      await userEvent.click(trigger)
      const panel = await body.findByRole("dialog", { name: title })
      await expect(panel).toHaveAccessibleName(title)
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(panel).not.toBeInTheDocument())
      await expect(trigger).toHaveFocus()
    }
  },
}

export const Modal: Story = {
  parameters: { docs: { description: { story: "Use the modal option only when this short task needs focus containment; choose Dialog for longer tasks." } } },
  args: {
    id: "modal-popover",
    trigger: "Open Modal Popover",
    modal: true,
    showCloseButton: true,
    title: "Modal Popover",
    description:
      "This popover acts as a modal - it traps focus and blocks interactions outside.",
    closeOnInteractOutside: false,
    children: (
      <div className="mt-200">
        <p>Try clicking outside - it won't close!</p>
        <p className="mt-100 text-sm">
          Press Escape or use the close button to dismiss.
        </p>
      </div>
    ),
  },
}

export const AsyncContent: Story = {
  parameters: { docs: { description: { story: "Loading and completion feedback remain inside the same anchored surface." } } },
  args: {},
  render: () => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<string | null>(null)

    const loadData = async () => {
      setLoading(true)
      setData(null)

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setData("Data loaded successfully!")
      setLoading(false)
    }

    return (
      <PopoverTemplate
        id="async-popover"
        title="Order tracking"
        onOpenChange={(details) => {
          if (details.open) {
            void loadData()
          }
        }}
        trigger="Load Async Content"
      >
        <div className="flex min-h-24 w-3xs items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-100">
              <Icon
                className="animate-spin"
                icon="token-icon-spinner"
                size="sm"
              />
              <span>Loading...</span>
            </div>
          ) : data ? (
            <div className="text-center">
              <Icon
                className="mx-auto mb-100"
                color="success"
                icon="token-icon-check"
                size="lg"
              />
              <p>{data}</p>
            </div>
          ) : (
            <p>Waiting to load...</p>
          )}
        </div>
      </PopoverTemplate>
    )
  },
}

export const PositioningBehaviors: Story = {
  parameters: { docs: { description: { story: "Flip keeps the panel inside the viewport; non-portalled bounded examples illustrate the clipping trade-off." } } },
  args: {},
  render: () => (
    <div className="grid justify-items-start gap-400 p-400">
      <PopoverTemplate
        description="Flips to opposite side when no space"
        flip={true}
        id="flip-demo-popover"
        placement="left"
        title="Auto Flip"
        trigger="Flip Demo"
      >
        <p>
          This popover opens on the left but will flip to right if there's no
          space.
        </p>
      </PopoverTemplate>
      <div className="space-y-100">
        <p className="text-sm">
          Bounded containers simulate narrow viewport. Compare slide behavior:
        </p>
        <div className="flex flex-wrap gap-200">
          <div className="relative h-48 w-sm max-w-full overflow-hidden border border-border border-dashed">
            <div>
              <PopoverTemplate
                id="slide-true-popover"
                placement="bottom"
                portalled={false}
                slide={true}
                title="Slide Enabled"
                trigger="slide=true"
              >
                <p>Arrow shifts to keep popover visible.</p>
              </PopoverTemplate>
            </div>
          </div>

          <div className="relative h-48 w-sm max-w-full overflow-hidden border border-border border-dashed">
            <div>
              <PopoverTemplate
                id="slide-false-popover"
                placement="bottom"
                portalled={false}
                slide={false}
                title="Slide Disabled"
                trigger="slide=false"
              >
                <p>Popover stays centered, may overflow.</p>
              </PopoverTemplate>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Flip Demo" }))
    const panel = await body.findByRole("dialog", { name: "Auto Flip" })
    await waitFor(() => {
      const positioner = panel.closest<HTMLElement>('[data-part="positioner"]')
      expect(positioner?.style.getPropertyValue("--x")).not.toBe("")
      const rect = panel.getBoundingClientRect()
      expect(rect.left).toBeGreaterThanOrEqual(0)
      expect(rect.right).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientWidth)
    })
    const styles = canvasElement.ownerDocument.defaultView?.getComputedStyle(panel)
    await expect(Number.parseInt(styles?.zIndex ?? "0", 10)).toBeGreaterThanOrEqual(60)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(panel).not.toBeInTheDocument())
  },
}

export const SameWidthDemo: Story = {
  parameters: { docs: { description: { story: "Match a panel to its trigger when the content belongs to the same compact column." } } },
  args: {},
  render: () => (
    <div className="flex items-start gap-400">
      <PopoverTemplate
        id="short-trigger-popover"
        sameWidth={true}
        title="Same Width"
        trigger="Medium Length Trigger"
      >
        <p className="text-sm">
          This popover exactly matches the trigger button width.
        </p>
      </PopoverTemplate>

      <PopoverTemplate
        id="long-trigger-popover"
        sameWidth={true}
        title="Same Width"
        trigger="Very Long Trigger Button Text Here"
      >
        <p className="text-sm">Wide as trigger!</p>
      </PopoverTemplate>
    </div>
  ),
}

export const EdgePositioning: Story = {
  parameters: { docs: { description: { story: "Open panels near viewport edges to compare automatic collision handling." } } },
  args: {},
  render: () => (
    <div className="relative h-96 w-full border border-border border-dashed">
      <div className="absolute top-2 left-2">
        <PopoverTemplate
          id="smart-popover"
          title="Top-left details"
          placement="bottom-start"
          trigger="Top Left"
        >
          <div className="w-3xs">
            <p>Opens at screen corner with smart positioning.</p>
          </div>
        </PopoverTemplate>
      </div>

      <div className="absolute top-2 right-2">
        <PopoverTemplate
          flip={true}
          id="adjust-popover"
          title="Top-right details"
          placement="bottom-end"
          trigger="Top Right"
        >
          <div className="w-3xs">
            <p>Adjusts to avoid viewport overflow.</p>
          </div>
        </PopoverTemplate>
      </div>

      <div className="absolute bottom-2 left-2">
        <PopoverTemplate
          flip={true}
          id="flip-popover"
          title="Bottom-left details"
          placement="top-start"
          trigger="Bottom Left"
        >
          <div className="w-3xs">
            <p>Flips upward when at bottom.</p>
          </div>
        </PopoverTemplate>
      </div>

      <div className="absolute right-2 bottom-2">
        <PopoverTemplate
          flip={true}
          id="corner-popover"
          title="Bottom-right details"
          placement="top-end"
          trigger="Bottom Right"
        >
          <div className="w-3xs">
            <p>Smart positioning at corner.</p>
          </div>
        </PopoverTemplate>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-1/2">
        <PopoverTemplate id="center-popover" placement="bottom" title="Center details" trigger="Center">
          <div className="w-3xs">
            <p>Center positioned with default behavior.</p>
          </div>
        </PopoverTemplate>
      </div>
    </div>
  ),
}

export const OverflowPaddingDemo: Story = {
  parameters: { docs: { description: { story: "Reserve breathing room between the floating panel and the viewport edge." } } },
  args: {},
  render: () => (
    <div className="flex w-md flex-col gap-400">
      <div className="mb-200">
        <h3 className="mb-100 font-semibold">Overflow Padding</h3>
        <p>
          Determines the minimum distance (in pixels) between the popover and
          viewport edges. When the popover would overflow the viewport, it
          shifts to maintain this gap.
        </p>
      </div>
      <PopoverTemplate
        id="8px-padding-popover"
        overflowPadding={8}
        placement="bottom"
        title="Standard Gap"
        trigger="Default Padding (8px)"
      >
        <p>8px minimum gap from viewport edges.</p>
      </PopoverTemplate>

      <PopoverTemplate
        id="24px-padding-popover"
        overflowPadding={24}
        placement="bottom"
        title="Large Gap"
        trigger="Large Padding (24px)"
      >
        <p>24px minimum gap from viewport edges.</p>
      </PopoverTemplate>

      <PopoverTemplate
        id="0px-padding-popover"
        overflowPadding={0}
        placement="bottom"
        title="No Gap"
        trigger="No Padding (0px)"
      >
        <p>Can touch viewport edges.</p>
      </PopoverTemplate>
    </div>
  ),
}

export const NestedPopovers: Story = {
  parameters: { docs: { description: { story: "Nested panels dismiss one level at a time with Escape and restore focus to the original trigger." } } },
  tags: ["ui-runtime-regression"],
  args: {},
  render: () => (
    <PopoverTemplate
      id="level1-popover"
      placement="bottom"
      title="First Level"
      trigger="Level 1"
    >
      <div className="mt-200 space-y-200">
        <p>This is the first level popover.</p>

        <PopoverTemplate
          id="level2-popover"
          placement="right"
          size="sm"
          title="Second Level"
          trigger="Open Level 2"
        >
          <div className="mt-200 space-y-200">
            <p className="text-sm">This is nested inside the first popover.</p>

            <PopoverTemplate
              id="level3-popover"
              placement="right"
              size="sm"
              title="Third Level"
              trigger="Open Level 3"
            >
              <div className="mt-200">
                <p className="text-sm">This is the deepest level!</p>
              </div>
            </PopoverTemplate>
          </div>
        </PopoverTemplate>
      </div>
    </PopoverTemplate>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: "Level 1" })

    await userEvent.click(trigger)
    const first = await page.findByRole("dialog", { name: "First Level" })
    await userEvent.click(within(first).getByRole("button", { name: "Open Level 2" }))
    const second = await page.findByRole("dialog", { name: "Second Level" })
    await userEvent.click(within(second).getByRole("button", { name: "Open Level 3" }))
    await expect(await page.findByRole("dialog", { name: "Third Level" })).toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(page.queryByRole("dialog", { name: "Third Level" })).toBeNull()
      expect(second).toBeVisible()
      expect(first).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(page.queryByRole("dialog", { name: "Second Level" })).toBeNull()
      expect(first).toBeVisible()
    })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(page.queryByRole("dialog", { name: "First Level" })).toBeNull()
    })
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.unhover(trigger)
    trigger.blur()
    await expect(trigger).not.toHaveFocus()
  },
}
