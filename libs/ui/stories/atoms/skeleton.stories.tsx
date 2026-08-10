import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentPropsWithoutRef } from "react"
import { useState } from "react"

import { Button } from "../../src/atoms/button"
import { Image } from "../../src/atoms/image"
import { Skeleton } from "../../src/atoms/skeleton"

const meta: Meta<typeof Skeleton> = {
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          "Skeleton components provide loading placeholders while content is being fetched. Supports pulse animation, accessibility, and compound pattern for different shapes.",
      },
    },
  },
  tags: ["autodocs"],
  title: "Atoms/Skeleton",
}

export default meta
type Story = StoryObj<typeof Skeleton>
type PlaygroundArgs = ComponentPropsWithoutRef<typeof Skeleton> & {
  showRectangle?: boolean
  showText?: boolean
  showCircle?: boolean
  circleSize?: ComponentPropsWithoutRef<typeof Skeleton.Circle>["size"]
  textSize?: ComponentPropsWithoutRef<typeof Skeleton.Text>["size"]
  textLines?: number
  textLastLineWidth?: string
}

// ===== BASIC USAGE =====

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: {
    circleSize: {
      control: "select",
      description: "Circle size",
      options: ["sm", "md", "lg", "xl"],
    },
    showCircle: {
      control: "boolean",
      description: "Show circle skeleton",
    },
    showRectangle: {
      control: "boolean",
      description: "Show rectangle skeleton",
    },
    showText: {
      control: "boolean",
      description: "Show text skeleton",
    },
    speed: {
      control: "select",
      description: "Animation speed",
      options: ["slow", "normal", "fast"],
    },
    textLastLineWidth: {
      control: "select",
      description: "Last line width for text skeleton",
      options: ["60%", "80%", "90%"],
    },
    textLines: {
      control: { max: 6, min: 1, step: 1, type: "number" },
      description: "Number of text lines",
    },
    textSize: {
      control: "select",
      description: "Text spacing size",
      options: ["sm", "md", "lg", "xl"],
    },
    variant: {
      control: "select",
      description: "Visual variant of the skeleton",
      options: ["primary", "secondary"],
    },
  },
  args: {
    circleSize: "lg",
    showCircle: true,
    showRectangle: true,
    showText: true,
    speed: "normal",
    textLastLineWidth: "80%",
    textLines: 3,
    textSize: "md",
    variant: "primary",
  },
  render: (args) => {
    const {
      showRectangle,
      showText,
      showCircle,
      circleSize,
      textSize,
      textLines,
      textLastLineWidth,
      ...skeletonArgs
    } = args

    return (
      <div className="w-md space-y-250">
        {showRectangle === true && (
          <Skeleton.Rectangle {...skeletonArgs} className="h-20 w-xs" />
        )}
        {showText === true && (
          <Skeleton.Text
            {...skeletonArgs}
            {...(textSize === undefined ? {} : { size: textSize })}
            {...(textLines === undefined ? {} : { noOfLines: textLines })}
            {...(textLastLineWidth === undefined
              ? {}
              : { lastLineWidth: textLastLineWidth })}
          />
        )}
        {showCircle === true && (
          <Skeleton.Circle
            {...skeletonArgs}
            {...(circleSize === undefined ? {} : { size: circleSize })}
          />
        )}
      </div>
    )
  },
}

const WithContentStory = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="space-y-250">
      <Button
        onClick={() => {
          setIsLoaded(!isLoaded)
        }}
        size="sm"
      >
        Toggle Loaded State
      </Button>
      <Skeleton isLoaded={isLoaded} className="h-20 w-xs">
        <div className="flex h-20 w-xs items-center justify-center rounded bg-primary text-white">
          ✨ Content loaded!
        </div>
      </Skeleton>
    </div>
  )
}

export const WithContent: Story = {
  render: WithContentStory,
}

export const Variants: Story = {
  render: () => (
    <div className="space-y-250">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Primary (default)</p>
        <Skeleton.Rectangle variant="primary" className="h-20 w-xs" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Secondary</p>
        <Skeleton.Rectangle variant="secondary" className="h-20 w-xs" />
      </div>
    </div>
  ),
}

export const AnimationSpeed: Story = {
  render: () => (
    <div className="space-y-300">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Slow (3s)</p>
        <Skeleton.Rectangle speed="slow" className="h-16 w-xs" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Normal (2s) - default
        </p>
        <Skeleton.Rectangle speed="normal" className="h-16 w-xs" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Fast (1s)</p>
        <Skeleton.Rectangle speed="fast" className="h-16 w-xs" />
      </div>
    </div>
  ),
}

export const SpeedInheritance: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Speed is inherited from parent Skeleton via context. Child components automatically use the parent speed unless overridden.",
      },
    },
  },
  render: () => (
    <div className="max-w-xs space-y-400">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Parent speed=&quot;fast&quot; - children inherit
        </p>
        <Skeleton speed="fast">
          <div className="flex gap-250 rounded-lg border p-250">
            <Skeleton.Circle size="lg" />
            <div className="flex-1 space-y-150">
              <Skeleton.Text noOfLines={2} />
              <Skeleton.Rectangle className="h-8" />
            </div>
          </div>
        </Skeleton>
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Parent speed=&quot;slow&quot; - one child overrides to fast
        </p>
        <Skeleton speed="slow">
          <div className="flex gap-250 rounded-lg border p-250">
            <Skeleton.Circle size="lg" speed="fast" />
            <div className="flex-1 space-y-150">
              <Skeleton.Text noOfLines={2} />
              <Skeleton.Rectangle className="h-8" />
            </div>
          </div>
        </Skeleton>
      </div>
    </div>
  ),
}

export const CircleSizes: Story = {
  render: () => (
    <div className="flex items-end gap-250">
      <div className="text-center">
        <Skeleton.Circle size="sm" />
        <p className="mt-150 text-xs">sm (32px)</p>
      </div>
      <div className="text-center">
        <Skeleton.Circle size="md" />
        <p className="mt-150 text-xs">md (48px)</p>
      </div>
      <div className="text-center">
        <Skeleton.Circle size="lg" />
        <p className="mt-150 text-xs">lg (64px)</p>
      </div>
      <div className="text-center">
        <Skeleton.Circle size="xl" />
        <p className="mt-150 text-xs">xl (96px)</p>
      </div>
    </div>
  ),
}

const CircleWithAvatarStory = () => {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className="space-y-250">
      <Button
        onClick={() => {
          setIsLoaded(!isLoaded)
        }}
        size="sm"
      >
        Toggle Avatar
      </Button>
      <Skeleton.Circle size="lg" isLoaded={isLoaded}>
        <Image
          alt="User avatar"
          className="size-16 rounded-full"
          size="custom"
          src="https://i.pravatar.cc/150?img=1"
        />
      </Skeleton.Circle>
    </div>
  )
}

export const CircleWithAvatar: Story = {
  render: CircleWithAvatarStory,
}

// ===== TEXT VARIANTS =====

export const TextBasic: Story = {
  render: () => <Skeleton.Text />,
}

export const TextCustomLines: Story = {
  render: () => (
    <div className="space-y-400">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">3 lines (default)</p>
        <Skeleton.Text noOfLines={3} />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">5 lines</p>
        <Skeleton.Text noOfLines={5} />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">1 line</p>
        <Skeleton.Text noOfLines={1} />
      </div>
    </div>
  ),
}

export const TextSizes: Story = {
  render: () => (
    <div className="space-y-400">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Small spacing</p>
        <Skeleton.Text size="sm" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Medium spacing (default)
        </p>
        <Skeleton.Text size="md" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Large spacing number</p>
        <Skeleton.Text size="lg" />
      </div>
    </div>
  ),
}

export const TextLastLineWidth: Story = {
  render: () => (
    <div className="space-y-400">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          80% last line (default)
        </p>
        <Skeleton.Text lastLineWidth="80%" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">90% last line</p>
        <Skeleton.Text lastLineWidth="90%" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">60% last line</p>
        <Skeleton.Text lastLineWidth="60%" />
      </div>
    </div>
  ),
}

export const TextNumberOfLines: Story = {
  render: () => (
    <div className="space-y-400">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">1 line</p>
        <Skeleton.Text noOfLines={1} />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">3 lines (default)</p>
        <Skeleton.Text />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">5 lines</p>
        <Skeleton.Text noOfLines={5} />
      </div>
    </div>
  ),
}

export const RectangleAspectRatios: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-250">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">16:9 (Video)</p>
        <Skeleton.Rectangle className="aspect-video" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">4:3</p>
        <Skeleton.Rectangle className="aspect-landscape" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">1:1 (Square)</p>
        <Skeleton.Rectangle className="aspect-square" />
      </div>
    </div>
  ),
}

export const RectangleFixedDimensions: Story = {
  render: () => (
    <div className="space-y-250">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Fixed height (full width)
        </p>
        <Skeleton.Rectangle className="h-64" />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Fixed width + height</p>
        <Skeleton.Rectangle className="h-16 w-xs" />
      </div>
    </div>
  ),
}

export const ProductCardSkeleton: Story = {
  name: "🛍️ Product Card",
  render: () => (
    <div className="w-md rounded-lg border p-250">
      <Skeleton.Rectangle className="mb-250 h-64" />
      <Skeleton.Text noOfLines={2} size="sm" />
      <div className="mt-250 flex gap-150">
        <Skeleton.Rectangle className="h-10 flex-1" />
        <Skeleton.Rectangle className="size-10" />
      </div>
    </div>
  ),
}

export const UserProfileSkeleton: Story = {
  name: "👤 User Profile",
  render: () => (
    <div className="flex max-w-md gap-250 rounded-lg border p-250">
      <Skeleton.Circle size="lg" />
      <div className="flex-1">
        <Skeleton.Text noOfLines={3} />
        <div className="mt-250 flex gap-150">
          <Skeleton.Rectangle className="h-8 w-20" />
          <Skeleton.Rectangle className="h-8 w-24" />
        </div>
      </div>
    </div>
  ),
}

export const FeedSkeleton: Story = {
  name: "📰 Feed Item",
  render: () => (
    <div className="max-w-xs space-y-250">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-lg border p-250">
          <div className="mb-250 flex gap-200">
            <Skeleton.Circle size="md" />
            <div className="flex-1">
              <Skeleton.Text noOfLines={2} size="sm" />
            </div>
          </div>
          <Skeleton.Rectangle className="mb-200 aspect-video" />
          <Skeleton.Text noOfLines={3} />
        </div>
      ))}
    </div>
  ),
}

export const ReducedMotion: Story = {
  name: "♿ Reduced Motion",
  parameters: {
    docs: {
      description: {
        story:
          "This story shows what the skeleton would look like with reduced motion enabled (without having to enable it)",
      },
    },
  },
  render: () => (
    <div className="space-y-250">
      <div className="rounded border border-warning bg-warning-light p-250">
        <p className="text-sm text-warning">
          💡 <strong>Accessibility:</strong> When users enable &quot;Reduce
          motion&quot; in their OS, animations automatically switch to the
          static state shown below.
        </p>
      </div>
      <Skeleton.Rectangle className="h-20 w-xs force-reduced-motion" />
      <Skeleton.Text noOfLines={3} className="force-reduced-motion" />
      <Skeleton.Circle size="lg" className="force-reduced-motion" />
    </div>
  ),
}
