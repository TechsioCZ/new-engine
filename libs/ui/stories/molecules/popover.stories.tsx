import type { Meta, StoryObj } from "@storybook/react"
import { useId, useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { StorySurface } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
import { StatusText } from "../../src/atoms/status-text"
import { Popover } from "../../src/molecules/popover"
import { PopoverTemplate } from "../../src/templates/popover"

const meta = {
  title: "Molecules/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
    docs: { description: { component: "Popover composes Trigger, Positioner, Content, Title, Description, Arrow and CloseTrigger into an anchored interactive surface. Use it for short tasks, Tooltip for hints, Menu for commands, Dialog for longer modal tasks, or PopoverTemplate for a ready-made composition." } },
  },
  tags: ["autodocs"],
  argTypes: {
    placement: { control: "select", options: ["top", "bottom", "left", "right", "top-start", "top-end", "bottom-start", "bottom-end"] },
    size: { control: "select", options: ["sm", "md", "lg"] },
    shadow: { control: "boolean" },
    border: { control: "boolean" },
    modal: { control: "boolean" },
    closeOnEscape: { control: "boolean" },
    closeOnInteractOutside: { control: "boolean" },
    id: { table: { disable: true } },
    children: { control: false },
  },
  args: { placement: "bottom", size: "md", shadow: true, border: true, modal: false, children: null },
  render: (args) => <Popover {...args}>
    <Popover.Trigger>Delivery details</Popover.Trigger>
    <Popover.Positioner><Popover.Content>
      <Popover.Arrow /><Popover.CloseTrigger />
      <Popover.Title>Delivery details</Popover.Title>
      <Popover.Description>Standard delivery takes 2–4 business days.</Popover.Description>
      <p className="mt-200">We send a tracking link when your order leaves our warehouse.</p>
    </Popover.Content></Popover.Positioner>
  </Popover>,
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Explore placement, size, surface and dismissal controls with realistic delivery information." } } },
  args: {
    id: "playground-popover",
  },
}

export const Variants: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Compare border, shadow and arrow choices without changing the content hierarchy." } } },
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
  parameters: { controls: { disable: true }, docs: { description: { story: "An unavailable trigger cannot receive focus or open the panel." } } },
  render: (args) => <Popover {...args}><Popover.Trigger disabled>Disabled Popover</Popover.Trigger><Popover.Positioner><Popover.Content><Popover.Title>Disabled State</Popover.Title></Popover.Content></Popover.Positioner></Popover>,
  play: async ({ canvasElement }) => { await expect(within(canvasElement).getByRole("button", { name: "Disabled Popover" })).toBeDisabled() },
}

export const WithTitleAndDescription: Story = {
  parameters: { docs: { description: { story: "Title and Description parts provide the panel's accessible name and supporting context." } } },
}

export const Controlled: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "External actions and the trigger share one controlled open state and dismissal path." } } },
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
  parameters: { controls: { disable: true }, docs: { description: { story: "Compose the anchored panel with an alternative trigger while preserving its accessible name." } } },
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
  parameters: { docs: { description: { story: "Use modal focus containment for a short anchored task; choose Dialog for longer workflows." } } },
  args: { modal: true, closeOnInteractOutside: false },
}

export const AsyncContent: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "Loading and completion feedback remain inside the same anchored surface." } } },
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
        <div aria-busy={loading} className="flex min-h-24 w-3xs items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-100">
              <Icon
                className="motion-safe:animate-spin"
                icon="token-icon-spinner"
                size="sm"
              />
              <StatusText role="status">Loading tracking details…</StatusText>
            </div>
          ) : data ? (
            <div className="text-center">
              <Icon
                className="mx-auto mb-100"
                color="success"
                icon="token-icon-check"
                size="lg"
              />
              <StatusText status="success">{data}</StatusText>
            </div>
          ) : (
            <p>Waiting to load...</p>
          )}
        </div>
      </PopoverTemplate>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Load Async Content" }))
    const panel = await body.findByRole("dialog", { name: "Order tracking" })
    await expect(within(panel).getByRole("status")).toHaveTextContent("Loading tracking details")
    await waitFor(() => expect(within(panel).getByRole("status")).toHaveTextContent("Data loaded successfully!"), { timeout: 4000 })
    await expect(panel.querySelector('[aria-busy="false"]')).toBeInTheDocument()
  },
}


export const PositioningBehaviors: Story = {
  decorators: [(Story) => <StorySurface className="max-w-4xl"><Story /></StorySurface>],
  parameters: { layout: "fullscreen", controls: { disable: true }, docs: { description: { story: "Flip keeps the panel inside the viewport; non-portalled bounded examples illustrate the clipping trade-off." } } },
  args: {},
  render: () => (
    <div className="grid w-full min-w-0 justify-items-start gap-400">
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
      <div className="w-full min-w-0 space-y-100">
        <p className="text-sm">
          Bounded containers simulate narrow viewport. Compare slide behavior:
        </p>
        <div className="flex flex-wrap gap-200">
          <div className="relative h-48 w-full min-w-0 max-w-sm overflow-hidden border border-border border-dashed">
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

          <div className="relative h-48 w-full min-w-0 max-w-sm overflow-hidden border border-border border-dashed">
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
  parameters: { controls: { disable: true }, docs: { description: { story: "Match a panel to its trigger when the content belongs to the same compact column." } } },
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
  decorators: [(Story) => <StorySurface className="max-w-4xl"><Story /></StorySurface>],
  parameters: { layout: "fullscreen", controls: { disable: true }, docs: { description: { story: "Open panels near viewport edges to compare automatic collision handling." } } },
  args: {},
  render: () => (
    <div className="relative h-96 w-full border border-border border-dashed">
      <div className="absolute top-100 left-100">
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

      <div className="absolute top-100 right-100">
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

      <div className="absolute bottom-100 left-100">
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

      <div className="absolute right-100 bottom-100">
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
  parameters: { controls: { disable: true }, docs: { description: { story: "Reserve breathing room between the floating panel and the viewport edge." } } },
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
  parameters: { controls: { disable: true }, docs: { description: { story: "Nested panels dismiss one level at a time with Escape and restore focus to the original trigger." } } },
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

export const LongContent: Story = {
  parameters: { controls: { disable: true }, docs: { description: { story: "A long attachment name and review list wrap and scroll within the available viewport without obscuring the close control." } } },
  render: (args) => <Popover {...args}><Popover.Trigger>Review attachment</Popover.Trigger><Popover.Positioner><Popover.Content>
    <Popover.Title>Attachment details</Popover.Title><Popover.CloseTrigger aria-label="Dismiss attachment details" size="sm" />
    <p>{"Catalog-2026-" + "AB1234567890".repeat(30)}</p>
    <div className="space-y-200">{Array.from({ length: 15 }, (_, index) => <p key={index}>Attachment {index + 1}: review availability and regional delivery information.</p>)}</div>
  </Popover.Content></Popover.Positioner></Popover>,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Review attachment" }))
    const panel = await within(canvasElement.ownerDocument.body).findByRole("dialog", { name: "Attachment details" })
    await waitFor(() => {
      const rect = panel.getBoundingClientRect()
      expect(rect.bottom).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientHeight)
    })
    const close = within(panel).getByRole("button", { name: "Dismiss attachment details" })
    const scrollViewport = panel.querySelector<HTMLElement>(".popover-scroll-viewport")
    expect(scrollViewport).not.toBeNull()
    for (const fraction of [0.5, 1]) {
      if (scrollViewport) scrollViewport.scrollTop = scrollViewport.scrollHeight * fraction
      await waitFor(() => {
        expect(scrollViewport?.scrollTop).toBeGreaterThan(0)
        const rect = close.getBoundingClientRect()
        expect(rect.top).toBeGreaterThanOrEqual(0)
        expect(rect.bottom).toBeLessThanOrEqual(canvasElement.ownerDocument.documentElement.clientHeight)
      })
      await expect(close).toBeVisible()
    }
    await userEvent.click(close)
    await waitFor(() => expect(panel).not.toBeInTheDocument())
  },
}
