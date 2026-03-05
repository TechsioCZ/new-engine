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
      control: 'inline-radio',
      options: [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
        'left-start',
        'left-end',
        'right-start',
        'right-end',
      ],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    id: 'basic-popover',
    trigger: 'Click me',
    children: (
      <div className="w-64">
        <p>This is a basic popover with some content inside.</p>
      </div>
    ),
    shadow: false,
    placement: 'bottom',
    size: 'md',
  },
}

export const WithTitleAndDescription: Story = {
  args: {
    id: 'title-description-popover',
    trigger: 'Open popover',
    title: 'Popover Title',
    description: 'This is a helpful description that provides more context.',
    children: (
      <div className="mt-4">
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
      <div className="mt-4">
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
    <div className="space-y-8">
      {/* Sizes */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Sizes</h3>
        <div className="flex gap-4">
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

      {/* Border & Shadow Combinations */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Visual Styles</h3>
        <div className="flex gap-4">
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

      {/* Arrow Variations */}
      <div>
        <h3 className="text-sm font-semibold mb-4">Arrow Options</h3>
        <div className="flex gap-4">
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
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
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
          <div className="mt-4">
            <p>The popover is {open ? 'open' : 'closed'}.</p>
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              variant="secondary"
              className="mt-2"
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
      <form className="mt-4 space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            size="sm"
            className="px-2 py-2"
            id="name"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            size="sm"
            className="px-2 py-2"
            id="email"
            type="email"
            placeholder="Enter your email"
          />
        </div>
        <div className="flex gap-2">
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
    <div className="flex gap-4">
      <Popover
        id="custom-trigger-popover"
        trigger={
          <div className="flex items-center gap-2">
            <Icon icon="token-icon-info" size="sm" />
            <span>Info</span>
          </div>
        }
        triggerClassName="flex items-center gap-2 px-4 py-2 bg-info text-info-fg rounded-md hover:bg-info/90"
      >
        <div className="w-64">
          <p>This popover uses a custom trigger with an icon.</p>
        </div>
      </Popover>

      <Popover
        id="custom-area-trigger-popover"
        trigger={
          <div className="rounded-lg border-2 border-border border-dashed p-2">
            <p className="text-muted text-sm">Click this custom area</p>
          </div>
        }
        triggerClassName="hover:border-primary focus:border-primary"
      >
        <div className="w-64">
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
    title: 'Modal Popover',
    description: 'This popover acts as a modal - it traps focus and blocks interactions outside.',
    closeOnInteractOutside: false,
    children: (
      <div className="mt-4">
        <p>Try clicking outside - it won't close!</p>
        <p className="mt-2 text-muted text-sm">
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

      // Simulate API call
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
        <div className="flex min-h-[100px] w-64 items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2">
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
                className="mx-auto mb-2"
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
    <div className="grid gap-8 p-8">
        <Popover
          id="flip-demo-popover"
          trigger="Flip Demo"
          flip={true}
          placement="left"
          title="Auto Flip"
          description="Flips to opposite side when no space"
        >
          <p>This popover starts on top but will flip to bottom if there's no space above.</p>
        </Popover>

        <Popover
          id="slide-demo-popover"
          trigger="Slide Demo"
          slide={true}
          placement="bottom"
          title="Slide Enabled"
          description="Slides along axis to stay visible"
        >
          <p>This popover slides smoothly along the trigger edge to maximize visibility.</p>
        </Popover>
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
    <div className="flex gap-8 items-start">
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
    <div className="relative w-full h-[600px] border border-dashed border-border">
      <div className="absolute top-2 left-2">
        <Popover
          id="smart-popover"
          trigger="Top Left"
          placement="bottom-start"
        >
          <div className="w-64">
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
          <div className="w-64">
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
          <div className="w-64">
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
          <div className="w-64">
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
          <div className="w-64">
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
    <div className="flex gap-8">
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
      <div className="mt-4 space-y-4">
        <p>This is the first level popover.</p>

        <Popover
          id="level2-popover"
          trigger="Open Level 2"
          title="Second Level"
          placement="right"
          size="sm"
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm">This is nested inside the first popover.</p>

            <Popover
              id="level3-popover"
              trigger="Open Level 3"
              title="Third Level"
              placement="right"
              size="sm"
            >
              <div className="mt-4">
                <p className="text-sm">This is the deepest level!</p>
              </div>
            </Popover>
          </div>
        </Popover>
      </div>
    </Popover>
  ),
}
