import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Input } from "../../src/atoms/input"
import { Label } from "../../src/atoms/label"
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
  },
  args: {
    placement: "bottom",
    size: "md",
    shadow: true,
    border: true,
    showArrow: true,
    modal: false,
    disabled: false,
    trigger: "Open Popover",
    title: "Popover Title",
    description: "This is a popover description.",
  },
} satisfies Meta<typeof PopoverStory>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    id: "playground-popover",
    children: (
      <div className="mt-200">
        <p>This is the popover content area.</p>
      </div>
    ),
  },
}

export const WithTitleAndDescription: Story = {
  args: {
    id: "title-description-popover",
    trigger: "Open popover",
    title: "Popover Title",
    description: "This is a helpful description that provides more context.",
    children: (
      <div className="mt-200">
        <p>Additional content can go here.</p>
      </div>
    ),
  },
}

export const Disabled: Story = {
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

export const Variants: Story = {
  args: {
    id: "variants-popover",
    trigger: "Demo",
    children: <div />,
  },
  render: () => (
    <div className="space-y-400">
      <div>
        <h3 className="mb-200 text-sm font-semibold">Sizes</h3>
        <div className="flex gap-200">
          <PopoverTemplate
            description="Compact size"
            id="small-popover"
            size="sm"
            title="Small"
            trigger="Small"
          >
            <p className="text-xs">Small content area</p>
          </PopoverTemplate>

          <PopoverTemplate
            description="Default size"
            id="medium-popover"
            size="md"
            title="Medium"
            trigger="Medium"
          >
            <p>Standard content area</p>
          </PopoverTemplate>

          <PopoverTemplate
            description="Spacious size"
            id="large-popover"
            size="lg"
            title="Large"
            trigger="Large"
          >
            <p className="text-lg">Large content area</p>
          </PopoverTemplate>
        </div>
      </div>
      <div>
        <h3 className="mb-200 text-sm font-semibold">Visual Styles</h3>
        <div className="flex gap-200">
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
        <div className="flex gap-200">
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

export const Controlled: Story = {
  args: {
    id: "controlled-popover",
    trigger: "Demo",
    children: <div />,
  },
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

export const OpenOnHover: Story = {
  args: {
    id: 'hover-popover',
    trigger: 'Hover me',
    children: <div />,
  },
  render: () => (
    <Popover
      id="hover-popover"
      trigger="Hover me"
      title="Hover popover"
      description="Opens on pointer hover and closes when pointer leaves trigger and content."
      openOnHover
      hoverCloseDelay={100}
    >
      <div className="w-64">
        <p>Useful for mini-cart previews or quick account hints.</p>
      </div>
    </Popover>
  ),
}

export const WithForm: Story = {
  args: {
    id: "form-popover",
    trigger: "Edit Profile",
    title: "Edit Profile",
    children: (
      <form className="mt-200 space-y-200">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter your name" size="sm" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Enter your email"
            size="sm"
            type="email"
          />
        </div>
        <div className="flex gap-100">
          <Button size="sm" type="submit">
            Save
          </Button>
        </div>
      </form>
    ),
  },
}

export const CustomTrigger: Story = {
  args: {
    id: "custom-trigger-popover",
    trigger: "Demo",
    children: <div />,
  },
  render: () => (
    <div className="flex gap-200">
      <PopoverTemplate
        id="custom-trigger-popover"
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
}

export const Modal: Story = {
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
  args: {
    id: "async-content-popover",
    trigger: "Demo",
    children: <div />,
  },
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
  args: {
    id: "positioning-behaviors-popover",
    trigger: "Demo",
    children: <div />,
  },
  render: () => (
    <div className="grid gap-400 p-400">
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
        <div className="flex gap-200">
          <div className="relative h-48 w-sm overflow-hidden border border-border border-dashed">
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

          <div className="relative h-48 w-sm overflow-hidden border border-border border-dashed">
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
}

export const SameWidthDemo: Story = {
  args: {
    id: "same-width-demo-popover",
    trigger: "Demo",
    children: <div />,
  },
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
  args: {
    id: "edge-positioning-popover",
    trigger: "Demo",
    children: <div />,
  },
  render: () => (
    <div className="relative h-96 w-full border border-border border-dashed">
      <div className="absolute top-2 left-2">
        <PopoverTemplate
          id="smart-popover"
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
          placement="top-end"
          trigger="Bottom Right"
        >
          <div className="w-3xs">
            <p>Smart positioning at corner.</p>
          </div>
        </PopoverTemplate>
      </div>

      <div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2">
        <PopoverTemplate id="center-popover" placement="bottom" trigger="Center">
          <div className="w-3xs">
            <p>Center positioned with default behavior.</p>
          </div>
        </PopoverTemplate>
      </div>
    </div>
  ),
}

export const OverflowPaddingDemo: Story = {
  args: {
    id: "overflow-padding-demo-popover",
    trigger: "Demo",
    children: <div />,
  },
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
  args: {
    id: "nested-popovers-popover",
    trigger: "Demo",
    children: <div />,
  },
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
}
