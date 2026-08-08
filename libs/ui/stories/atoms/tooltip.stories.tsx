import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import type { ComponentPropsWithoutRef } from "react"

import { Button } from "@/atoms/button"
import type { IconType } from "@/atoms/icon"
import { Input } from "@/atoms/input"
import { Label } from "@/atoms/label"
import { Link } from "@/atoms/link"
import { Tooltip } from "@/atoms/tooltip"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { iconLabels, iconOptions } from "../helpers/icon-options"

const outlineNavigationItems = [
  { icon: "icon-[mdi--home]", label: "Dashboard" },
  { icon: "icon-[mdi--chart-line]", label: "Analytics" },
  { icon: "icon-[mdi--users]", label: "Team Members" },
  { icon: "icon-[mdi--settings]", label: "Settings" },
  { icon: "icon-[mdi--help-circle]", label: "Help & Support" },
] satisfies readonly { icon: IconType; label: string }[]

type PlaygroundArgs = ComponentPropsWithoutRef<typeof Tooltip> & {
  triggerType?: "button" | "icon"
  triggerLabel?: string
  triggerIcon?: IconType
  triggerVariant?: ComponentPropsWithoutRef<typeof Button>["variant"]
  triggerSize?: ComponentPropsWithoutRef<typeof Button>["size"]
}

const meta: Meta<typeof Tooltip> = {
  argTypes: {
    closeDelay: {
      control: { max: 2000, min: 0, step: 100, type: "range" },
      description: "Delay before tooltip closes (ms)",
    },
    closeOnClick: {
      control: "boolean",
      description: "Close on any click",
    },
    closeOnEscape: {
      control: "boolean",
      description: "Close on ESC key press",
    },
    closeOnPointerDown: {
      control: "boolean",
      description: "Close on any pointer down",
    },
    closeOnScroll: {
      control: "boolean",
      description: "Close when page scrolls",
    },
    content: {
      control: "text",
      description: "Content to display in the tooltip",
    },
    defaultOpen: {
      control: "boolean",
      description: "Initial open state",
    },
    disabled: {
      control: "boolean",
      description: "Disable tooltip functionality",
    },
    flip: {
      control: "boolean",
      description: "Auto-flip to opposite side if doesn't fit",
    },
    gutter: {
      control: { max: 50, min: 0, step: 5, type: "range" },
      description: "Minimum distance from screen edges",
    },
    interactive: {
      control: "boolean",
      description: "Allow hovering over tooltip content",
    },
    openDelay: {
      control: { max: 2000, min: 0, step: 100, type: "range" },
      description: "Delay before tooltip opens (ms)",
    },
    placement: {
      control: { type: "select" },
      description: "Where tooltip appears relative to trigger",
      options: [
        "top",
        "top-start",
        "top-end",
        "right",
        "right-start",
        "right-end",
        "bottom",
        "bottom-start",
        "bottom-end",
        "left",
        "left-start",
        "left-end",
      ],
    },
    sameWidth: {
      control: "boolean",
      description: "Match trigger element width",
    },
    size: {
      control: { type: "select" },
      description: "Visual size of the tooltip",
      options: ["sm", "md", "lg"],
    },
    strategy: {
      control: { type: "select" },
      description: "CSS positioning strategy",
      options: ["absolute", "fixed"],
    },
  },
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component: `
A tooltip component built with Zag.js that provides accessible, customizable tooltips with rich positioning and interaction options.

## Features
- Accessible with proper ARIA attributes
- Customizable delays and interactions
- Rich positioning with auto-flip
- Interactive mode for complex content
- Multiple close triggers
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Atoms/Tooltip",
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    triggerIcon: {
      control: {
        labels: iconLabels,
        type: "select",
      },
      description: "Icon for icon trigger",
      options: iconOptions.filter((option): option is IconType =>
        Boolean(option),
      ),
    },
    triggerLabel: {
      control: "text",
      description: "Label for button trigger",
    },
    triggerSize: {
      control: "select",
      description: "Button size for trigger",
      options: ["sm", "md", "lg"],
    },
    triggerType: {
      control: "select",
      description: "Type of trigger element",
      options: ["button", "icon"],
    },
    triggerVariant: {
      control: "select",
      description: "Button variant for trigger",
      options: ["primary", "secondary", "tertiary", "warning", "danger"],
    },
  },
  args: {
    content: "This is a helpful tooltip!",
    triggerIcon: "icon-[mdi--magnify]",
    triggerLabel: "Hover me",
    triggerSize: "md",
    triggerType: "button",
    triggerVariant: "primary",
  },
  render: (args) => {
    const {
      triggerType,
      triggerLabel,
      triggerIcon,
      triggerVariant,
      triggerSize,
      ...tooltipArgs
    } = args
    const icon = triggerIcon ?? "icon-[mdi--magnify]"
    const label = triggerLabel ?? "Tooltip trigger"

    const trigger =
      triggerType === "icon" ? (
        <Button
          aria-label={label}
          icon={icon}
          size={triggerSize}
          variant={triggerVariant}
        />
      ) : (
        <Button variant={triggerVariant} size={triggerSize}>
          {label}
        </Button>
      )

    return <Tooltip {...tooltipArgs}>{trigger}</Tooltip>
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Tooltip Sizes">
        <Tooltip content="Small tooltip" size="sm">
          <Button size="sm">Small</Button>
        </Tooltip>
        <Tooltip content="Medium tooltip (default)" size="md">
          <Button size="md">Medium</Button>
        </Tooltip>
        <Tooltip content="Large tooltip with more content" size="lg">
          <Button size="lg">Large</Button>
        </Tooltip>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const WithIcon: Story = {
  args: {
    children: (
      <Button theme="unstyled" icon="icon-[mdi--help-circle-outline]" />
    ),
    content: "Get help and support",
    placement: "top",
  },
}

export const RichContent: Story = {
  args: {
    children: <Button variant="secondary">Rich Content</Button>,
    content: (
      <div className="space-y-200">
        <div className="font-semibold">User Profile</div>
        <div className="text-sm opacity-80">
          View and edit your profile settings
        </div>
        <div className="mt-300 flex gap-200">
          <Button size="sm">Edit</Button>
          <Button size="sm" variant="secondary">
            View
          </Button>
        </div>
      </div>
    ),
    interactive: true,
  },
}

export const WithLinks: Story = {
  args: {
    children: <Button theme="unstyled" icon="icon-[mdi--information]" />,
    content: (
      <div>
        Learn more in our{" "}
        <Link
          href="#"
          className="text-primary underline hover:no-underline"
          onClick={(e) => {
            e.preventDefault()
          }}
        >
          documentation
        </Link>
      </div>
    ),
    interactive: true,
    placement: "top",
  },
}

export const AllPlacements: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Top Placements">
        <Tooltip content="Top start" placement="top-start">
          <Button className="w-3xs" size="sm">
            ↖ top-start
          </Button>
        </Tooltip>
        <Tooltip content="Top end" placement="top-end">
          <Button className="w-3xs" size="sm">
            ↗ top-end
          </Button>
        </Tooltip>
      </VariantGroup>

      <VariantGroup title="Side Placements">
        <Tooltip content="Left start" placement="left-start">
          <Button className="h-900 items-center" size="sm">
            ← left-start
          </Button>
        </Tooltip>

        <Tooltip content="Left end" placement="left-end">
          <Button className="h-900 items-center" size="sm">
            ← left-end
          </Button>
        </Tooltip>
        <Tooltip content="Right start" placement="right-start">
          <Button className="h-900 items-center" size="sm">
            right-start →
          </Button>
        </Tooltip>

        <Tooltip content="Right end" placement="right-end">
          <Button className="h-900 items-center" size="sm">
            right-end →
          </Button>
        </Tooltip>
      </VariantGroup>

      <VariantGroup title="Bottom Placements">
        <Tooltip content="Bottom start" placement="bottom-start">
          <Button className="w-3xs" size="sm">
            ↙ bottom-start
          </Button>
        </Tooltip>

        <Tooltip content="Bottom end" placement="bottom-end">
          <Button className="w-3xs" size="sm">
            ↘ bottom-end
          </Button>
        </Tooltip>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const PositioningOptions: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Flip Behavior">
        <Tooltip
          content="Auto-flips if doesn't fit"
          flip={true}
          placement="top"
        >
          <Button>With Flip</Button>
        </Tooltip>
        <Tooltip
          content="Won't flip, might go offscreen"
          flip={false}
          placement="top"
        >
          <Button>No Flip</Button>
        </Tooltip>
      </VariantGroup>

      <VariantGroup title="Width Matching" fullWidth>
        <Tooltip
          content="Matches button width exactly"
          sameWidth={true}
          placement="bottom"
        >
          <Button className="w-full">
            Same Width Tooltip, LOOOOONG trigger
          </Button>
        </Tooltip>
        <Tooltip
          content="Natural content width"
          sameWidth={false}
          placement="bottom"
        >
          <Button className="w-full">Natural Width for LOOOOONG trigger</Button>
        </Tooltip>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const CloseBehaviors: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Different Close Triggers" fullWidth>
        <div className="grid w-full grid-cols-2 gap-400">
          <Tooltip
            content="Press ESC to close"
            closeOnEscape={true}
            closeOnScroll={false}
            closeOnClick={false}
            defaultOpen={false}
          >
            <Button className="w-full">ESC to Close</Button>
          </Tooltip>

          <Tooltip
            content="Closes on any click"
            closeOnClick={true}
            closeOnScroll={false}
            closeOnEscape={false}
            defaultOpen={false}
          >
            <Button className="w-full">Click to Close</Button>
          </Tooltip>

          <Tooltip
            content="Closes when page scrolls"
            closeOnScroll={true}
            closeOnEscape={false}
            closeOnClick={false}
            defaultOpen={false}
          >
            <Button className="w-full">Scroll to Close</Button>
          </Tooltip>

          <Tooltip
            content="Standard close behavior"
            closeOnEscape={true}
            closeOnPointerDown={true}
            defaultOpen={false}
          >
            <Button className="w-full">Default Behavior</Button>
          </Tooltip>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

const ControlledTooltipStory = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <VariantContainer>
      <VariantGroup title="External State Control" fullWidth>
        <div className="w-full space-y-400">
          <div className="flex justify-center gap-400">
            <Button
              onClick={() => {
                setIsOpen(!isOpen)
              }}
            >
              {isOpen ? "Close" : "Open"} Tooltip
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false)
              }}
              variant="secondary"
              disabled={!isOpen}
            >
              Force Close
            </Button>
          </div>

          <div className="flex justify-center">
            <Tooltip
              content="This tooltip is controlled externally"
              open={isOpen}
              onOpenChange={(details) => {
                setIsOpen(details.open)
              }}
              interactive={true}
            >
              <Button variant="primary">Controlled Tooltip</Button>
            </Tooltip>
          </div>

          <div className="text-center text-sm">
            Tooltip state: {isOpen ? "Open" : "Closed"}
          </div>
        </div>
      </VariantGroup>
    </VariantContainer>
  )
}

export const ControlledTooltip: Story = {
  render: ControlledTooltipStory,
}

export const LongContent: Story = {
  args: {
    children: <Button>Long Content</Button>,
    content: (
      <div className="max-w-xs">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris.
      </div>
    ),
    placement: "top",
  },
}

export const FormHelper: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Form Field Helpers" fullWidth>
        <div className="max-w-3xl space-y-400">
          <div className="space-y-200">
            <Label
              className="flex items-center gap-200"
              htmlFor="tooltip-password"
            >
              Password
              <Tooltip
                content="Must be at least 8 characters with uppercase, lowercase, and numbers"
                placement="right"
              >
                <Button
                  aria-label="Password requirements"
                  icon="icon-[mdi--help-circle]"
                  size="current"
                  theme="unstyled"
                />
              </Tooltip>
            </Label>
            <Input
              id="tooltip-password"
              type="password"
              placeholder="Enter password"
            />
          </div>

          <div className="space-y-200">
            <Label
              className="flex items-center gap-200"
              htmlFor="tooltip-api-key"
            >
              API Key
              <Tooltip
                content="Found in your account settings under 'Developer Options'"
                placement="right"
              >
                <Button
                  aria-label="API key info"
                  icon="icon-[mdi--information]"
                  size="current"
                  theme="unstyled"
                />
              </Tooltip>
            </Label>
            <Input id="tooltip-api-key" type="text" placeholder="sk-..." />
          </div>
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const OutlineVariant: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Navigation Bar">
        <div className="flex gap-100 rounded-lg p-200">
          {outlineNavigationItems.map(({ icon, label }) => (
            <Tooltip
              key={label}
              content={label}
              placement="bottom"
              variant="outline"
            >
              <Button
                aria-label={label}
                className="rounded p-200 transition-colors"
                icon={icon}
                theme="unstyled"
              />
            </Tooltip>
          ))}
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

export const DataPreview: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Dashboard Cards" fullWidth>
        <div className="grid w-full grid-cols-3 gap-400">
          {[
            { change: "+12%", label: "Users", value: "1,234" },
            { change: "+8%", label: "Revenue", value: "$45.2K" },
            { change: "+0.2%", label: "Uptime", value: "98.5%" },
          ].map(({ value, label, change }) => (
            <Tooltip
              key={label}
              content={
                <div className="text-center">
                  <div className="font-semibold">{label}</div>
                  <div className="text-2xl">{value}</div>
                  <div className="text-sm text-success">
                    {change} this month
                  </div>
                </div>
              }
              interactive={true}
              placement="top"
            >
              <Button
                aria-label={`${label}: ${value}, ${change} this month`}
                className="w-full flex-col items-start justify-start rounded-lg border p-400 text-start transition-colors"
                size="current"
                theme="unstyled"
              >
                <span className="text-sm">{label}</span>
                <span className="text-2xl font-bold">{value}</span>
              </Button>
            </Tooltip>
          ))}
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}
