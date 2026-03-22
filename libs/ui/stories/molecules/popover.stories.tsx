import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '../../src/atoms/button'
import { Icon } from '../../src/atoms/icon'
import { Input } from '../../src/atoms/input'
import { Label } from '../../src/atoms/label'
import { Popover } from '../../src/molecules/popover'

const meta = {
  title: 'Molecules/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'top-start', 'top-end', 'bottom-start', 'bottom-end', 'left-start', 'left-end', 'right-start', 'right-end'],
      description: 'Position of the popover relative to the trigger',
      table: { defaultValue: { summary: 'bottom' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the popover content area',
      table: { defaultValue: { summary: 'md' } },
    },
    shadow: {
      control: 'boolean',
      description: 'Whether to show shadow on the popover',
      table: { defaultValue: { summary: 'true' } },
    },
    border: {
      control: 'boolean',
      description: 'Whether to show border on the popover',
      table: { defaultValue: { summary: 'true' } },
    },
    showArrow: {
      control: 'boolean',
      description: 'Whether to show the arrow indicator',
      table: { defaultValue: { summary: 'true' } },
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show the close button in the popover',
      table: { defaultValue: { summary: 'false' } },
    },
    modal: {
      control: 'boolean',
      description: 'Whether the popover behaves as a modal (traps focus)',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the trigger is disabled',
      table: { defaultValue: { summary: 'false' } },
    },
    title: {
      control: 'text',
      description: 'Optional title for the popover',
    },
    description: {
      control: 'text',
      description: 'Optional description text',
    },
    trigger: {
      control: 'text',
      description: 'Content of the trigger button',
    },
  },
  args: {
    placement: 'bottom',
    size: 'md',
    shadow: true,
    border: true,
    showArrow: true,
    modal: false,
    disabled: false,
    trigger: 'Open Popover',
    title: 'Popover Title',
    description: 'This is a popover description.',
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    id: 'playground-popover',
    children: (
      <div className="mt-200">
        <p>This is the popover content area.</p>
      </div>
    ),
  },
}

export const WithTitleAndDescription: Story = {
  args: {
    id: 'title-description-popover',
    trigger: 'Open popover',
    title: 'Popover Title',
    description: 'This is a helpful description that provides more context.',
    children: (
      <div className="mt-200">
        <p>Additional content can go here.</p>
      </div>
    ),
  },
}

export const Disabled: Story = {
  args: {
    id: 'disabled-popover',
    trigger: 'Disabled Popover',
    disabled: true,
    title: 'Disabled State',
    description: 'This popover trigger is disabled and cannot be opened.',
    children: (
      <div className="mt-200">
        <p>This content should not be accessible.</p>
      </div>
    ),
  },
}

export const Variants: Story = {
  args: {
    id: 'variants-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="space-y-400">
      <div>
        <h3 className="text-sm font-semibold mb-200">Sizes</h3>
        <div className="flex gap-200">
          <Popover
            id="small-popover"
            trigger="Small"
            size="sm"
            title="Small"
            description="Compact size"
          >
            <p className="text-xs">Small content area</p>
          </Popover>

          <Popover
            id="medium-popover"
            trigger="Medium"
            size="md"
            title="Medium"
            description="Default size"
          >
            <p>Standard content area</p>
          </Popover>

          <Popover
            id="large-popover"
            trigger="Large"
            size="lg"
            title="Large"
            description="Spacious size"
          >
            <p className="text-lg">Large content area</p>
          </Popover>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold mb-200">Visual Styles</h3>
        <div className="flex gap-200">
          <Popover
            id="border-shadow-popover"
            trigger="Default"
            border={true}
            shadow={true}
            title="Default Style"
          >
            <p>Border + Shadow (default)</p>
          </Popover>

          <Popover
            id="border-only-popover"
            trigger="border-only"
            border={true}
            shadow={false}
            title="Flat Style"
          >
            <p>Border only, no shadow</p>
          </Popover>

          <Popover
            id="shadow-only-popover"
            trigger="shadow-only"
            border={false}
            shadow={true}
            title="Elevated Style"
          >
            <p>Shadow only, no border</p>
          </Popover>

          <Popover
            id="minimal-popover"
            trigger="Minimal"
            border={false}
            shadow={false}
            title="Minimal Style"
          >
            <p>No border, no shadow</p>
          </Popover>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-200">Arrow Options</h3>
        <div className="flex gap-200">
          <Popover
            id="no-arrow-popover"
            trigger="No Arrow"
            showArrow={false}
            title="Clean Look"
          >
            <p>No arrow indicator</p>
          </Popover>
        </div>
      </div>
    </div>
  ),
}

export const Controlled: Story = {
  args: {
    id: 'controlled-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className="flex flex-col items-center gap-200">
        <div className="flex gap-100">
          <Button onClick={() => setOpen(true)} variant="secondary" size="sm">
            Open Popover
          </Button>
          <Button onClick={() => setOpen(false)} variant="secondary" size="sm">
            Close Popover
          </Button>
        </div>

        <Popover
          id="controlled-popover"
          trigger="Controlled Popover"
          open={open}
          onOpenChange={(details) => setOpen(details.open)}
          title="Controlled Popover"
          description="This popover is controlled by external state"
        >
          <div className="mt-200">
            <p>The popover is {open ? 'open' : 'closed'}.</p>
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              variant="secondary"
              className="mt-100"
            >
              Close from inside
            </Button>
          </div>
        </Popover>
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
    id: 'form-popover',
    trigger: 'Edit Profile',
    title: 'Edit Profile',
    children: (
      <form className="mt-200 space-y-200">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            size="sm"
            id="name"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            size="sm"
            id="email"
            type="email"
            placeholder="Enter your email"
          />
        </div>
        <div className="flex gap-100">
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </form>
    ),
  },
}

export const CustomTrigger: Story = {
  args: {
    id: 'custom-trigger-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="flex gap-200">
      <Popover
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
      </Popover>

      <Popover
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
      </Popover>
    </div>
  ),
}


export const Modal: Story = {
  args: {
    id: 'modal-popover',
    trigger: 'Open Modal Popover',
    modal: true,
    showCloseButton: true,
    title: 'Modal Popover',
    description: 'This popover acts as a modal - it traps focus and blocks interactions outside.',
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
    id: 'async-content-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<string | null>(null)

    const loadData = async () => {
      setLoading(true)
      setData(null)

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setData('Data loaded successfully!')
      setLoading(false)
    }

    return (
      <Popover
        id="async-popover"
        trigger="Load Async Content"
        onOpenChange={(open) => {
          if (open) {
            loadData()
          }
        }}
      >
        <div className="flex min-h-24 w-3xs items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-100">
              <Icon
                icon="token-icon-spinner"
                size="sm"
                className="animate-spin"
              />
              <span>Loading...</span>
            </div>
          ) : data ? (
            <div className="text-center">
              <Icon
                icon="token-icon-check"
                size="lg"
                color="success"
                className="mx-auto mb-100"
              />
              <p>{data}</p>
            </div>
          ) : (
            <p>Waiting to load...</p>
          )}
        </div>
      </Popover>
    )
  },
}

export const PositioningBehaviors: Story = {
  args: {
    id: 'positioning-behaviors-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="grid gap-400 p-400">
        <Popover
          id="flip-demo-popover"
          trigger="Flip Demo"
          flip={true}
          placement="left"
          title="Auto Flip"
          description="Flips to opposite side when no space"
        >
          <p>This popover opens on the left but will flip to right if there's no space.</p>
        </Popover>
        <div className="space-y-100">
          <p className="text-sm">Bounded containers simulate narrow viewport. Compare slide behavior:</p>
          <div className="flex gap-200">
            <div className="relative w-sm h-48 border border-dashed border-border overflow-hidden">
              <div>
                <Popover
                  id="slide-true-popover"
                  trigger="slide=true"
                  slide={true}
                  portalled={false}
                  placement="bottom"
                  title="Slide Enabled"
                >
                  <p>Arrow shifts to keep popover visible.</p>
                </Popover>
              </div>
            </div>

            <div className="relative w-sm h-48 border border-dashed border-border overflow-hidden">
              <div>
                <Popover
                  id="slide-false-popover"
                  trigger="slide=false"
                  slide={false}
                  portalled={false}
                  placement="bottom"
                  title="Slide Disabled"
                >
                  <p>Popover stays centered, may overflow.</p>
                </Popover>
              </div>
            </div>
          </div>
        </div>
    </div>
  ),
}

export const SameWidthDemo: Story = {
  args: {
    id: 'same-width-demo-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="flex gap-400 items-start">
      <Popover
        id="short-trigger-popover"
        trigger="Medium Length Trigger"
        sameWidth={true}
        title="Same Width"
      >
        <p className="text-sm">This popover exactly matches the trigger button width.</p>
      </Popover>

      <Popover
        id="long-trigger-popover"
        trigger="Very Long Trigger Button Text Here"
        sameWidth={true}
        title="Same Width"
      >
        <p className="text-sm">Wide as trigger!</p>
      </Popover>
    </div>
  ),
}

export const EdgePositioning: Story = {
  args: {
    id: 'edge-positioning-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="relative w-full h-96 border border-dashed border-border">
      <div className="absolute top-2 left-2">
        <Popover
          id="smart-popover"
          trigger="Top Left"
          placement="bottom-start"
        >
          <div className="w-3xs">
            <p>Opens at screen corner with smart positioning.</p>
          </div>
        </Popover>
      </div>

      <div className="absolute top-2 right-2">
        <Popover
          id="adjust-popover"
          trigger="Top Right"
          placement="bottom-end"
          flip={true}
        >
          <div className="w-3xs">
            <p>Adjusts to avoid viewport overflow.</p>
          </div>
        </Popover>
      </div>

      <div className="absolute bottom-2 left-2">
        <Popover
          id="flip-popover"
          trigger="Bottom Left"
          placement="top-start"
          flip={true}
        >
          <div className="w-3xs">
            <p>Flips upward when at bottom.</p>
          </div>
        </Popover>
      </div>

      <div className="absolute bottom-2 right-2">
        <Popover
          id="corner-popover"
          trigger="Bottom Right"
          placement="top-end"
          flip={true}
        >
          <div className="w-3xs">
            <p>Smart positioning at corner.</p>
          </div>
        </Popover>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Popover
          id="center-popover"
          trigger="Center"
          placement="bottom"
        >
          <div className="w-3xs">
            <p>Center positioned with default behavior.</p>
          </div>
        </Popover>
      </div>
    </div>
  ),
}

export const OverflowPaddingDemo: Story = {
  args: {
    id: 'overflow-padding-demo-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <div className="flex w-md flex-col gap-400">
      <div className="mb-200">
        <h3 className="font-semibold mb-100">Overflow Padding</h3>
        <p>
          Determines the minimum distance (in pixels) between the popover and viewport edges.
          When the popover would overflow the viewport, it shifts to maintain this gap.
        </p>
      </div>
      <Popover
        id="8px-padding-popover"
        trigger="Default Padding (8px)"
        overflowPadding={8}
        placement="bottom"
        title="Standard Gap"
      >
        <p>8px minimum gap from viewport edges.</p>
      </Popover>

      <Popover
        id="24px-padding-popover"
        trigger="Large Padding (24px)"
        overflowPadding={24}
        placement="bottom"
        title="Large Gap"
      >
        <p>24px minimum gap from viewport edges.</p>
      </Popover>

      <Popover
        id="0px-padding-popover"
        trigger="No Padding (0px)"
        overflowPadding={0}
        placement="bottom"
        title="No Gap"
      >
        <p>Can touch viewport edges.</p>
      </Popover>
    </div>
  ),
}

export const NestedPopovers: Story = {
  args: {
    id: 'nested-popovers-popover',
    trigger: 'Demo',
    children: <div />,
  },
  render: () => (
    <Popover id="level1-popover" trigger="Level 1" title="First Level" placement="bottom">
      <div className="mt-200 space-y-200">
        <p>This is the first level popover.</p>

        <Popover
          id="level2-popover"
          trigger="Open Level 2"
          title="Second Level"
          placement="right"
          size="sm"
        >
          <div className="mt-200 space-y-200">
            <p className="text-sm">This is nested inside the first popover.</p>

            <Popover
              id="level3-popover"
              trigger="Open Level 3"
              title="Third Level"
              placement="right"
              size="sm"
            >
              <div className="mt-200">
                <p className="text-sm">This is the deepest level!</p>
              </div>
            </Popover>
          </div>
        </Popover>
      </div>
    </Popover>
  ),
}
