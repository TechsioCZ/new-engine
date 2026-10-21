import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentPropsWithoutRef } from "react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"
import { Skeleton } from "../../src/atoms/skeleton"
import { Button } from "../../src/atoms/button"

const meta: Meta<typeof Skeleton> = {
  title: "Atoms/Skeleton",
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          "Skeleton reserves the shape of content while it loads. Group related shapes in one named loading region to avoid repeated announcements; use a Spinner for an unknown layout and StatusText for a useful progress message. Canonical sizes are sm/md/lg; xl remains a legacy media-size option.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Skeleton>
type PlaygroundArgs = ComponentPropsWithoutRef<typeof Skeleton> & {
  showRectangle?: boolean
  showText?: boolean
  showCircle?: boolean
  circleSize?: "sm" | "md" | "lg" | "xl"
  textSize?: "sm" | "md" | "lg" | "xl"
  textLines?: number
  textLastLineWidth?: string
}

// ===== BASIC USAGE =====

export const Playground: StoryObj<PlaygroundArgs> = {
  parameters: {
    docs: {
      description: {
        story:
          "Adjust the controls to explore skeleton using realistic content and immediately visible results.",
      },
    },
  },

  tags: ["ui-semantic-regression"],
  args: {
    variant: "primary",
    speed: "normal",
    showRectangle: true,
    showText: true,
    showCircle: true,
    circleSize: "lg",
    textSize: "md",
    textLines: 3,
    textLastLineWidth: "80%",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary"],
      description: "Visual variant of the skeleton",
    },
    speed: {
      control: "select",
      options: ["slow", "normal", "fast"],
      description: "Animation speed",
    },
    showRectangle: {
      control: "boolean",
      description: "Show rectangle skeleton",
    },
    showText: {
      control: "boolean",
      description: "Show text skeleton",
    },
    showCircle: {
      control: "boolean",
      description: "Show circle skeleton",
    },
    circleSize: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Circle size",
    },
    textSize: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Text spacing size",
    },
    textLines: {
      control: { type: "number", min: 1, max: 6, step: 1 },
      description: "Number of text lines",
    },
    textLastLineWidth: {
      control: "select",
      options: ["60%", "80%", "90%"],
      description: "Last line width for text skeleton",
    },
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
      <Skeleton {...skeletonArgs} className="space-y-250 w-full max-w-md">
        {showRectangle && (
          <Skeleton.Rectangle {...skeletonArgs} className="h-20 w-xs" />
        )}
        {showText && (
          <Skeleton.Text
            {...skeletonArgs}
            size={textSize}
            noOfLines={textLines}
            lastLineWidth={textLastLineWidth}
          />
        )}
        {showCircle && <Skeleton.Circle {...skeletonArgs} size={circleSize} />}
      </Skeleton>
    )
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    if (args.isLoaded) {
      await expect(canvas.queryByRole("status")).not.toBeInTheDocument()
      return
    }
    const status = canvas.getByRole("status", { name: "Loading content" })
    await expect(status).toHaveAttribute("aria-busy", "true")
    await expect(canvas.getAllByRole("status")).toHaveLength(1)
    await expect(status.querySelectorAll('[aria-hidden="true"]')).toHaveLength(
      [args.showRectangle, args.showText, args.showCircle].filter(Boolean)
        .length
    )
  },
}

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare variants in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare sizes in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => (
    <div className="flex flex-wrap gap-250 items-end">
      {(
        [
          ["sm", "Small (sm)"],
          ["md", "Medium (md)"],
          ["lg", "Large (lg)"],
        ] as const
      ).map(([size, label]) => (
        <div className="flex flex-col gap-150" key={size}>
          <p>{label}</p>
          <Skeleton
            aria-label="Loading profile"
            className="flex flex-col gap-150"
          >
            <Skeleton.Circle size={size} />
            <Skeleton.Text size={size} noOfLines={3} />
          </Skeleton>
        </div>
      ))}
    </div>
  ),
}

export const WithContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare with content in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  tags: ["ui-semantic-regression"],
  render: () => {
    const [isLoaded, setIsLoaded] = useState(false)

    return (
      <div className="space-y-250">
        <Button onClick={() => setIsLoaded(!isLoaded)} size="sm">
          Toggle Loaded State
        </Button>
        <Skeleton isLoaded={isLoaded} className="h-20 w-xs">
          {/* While loading, show a placeholder shape, not the pulsing real content. */}
          {isLoaded ? (
            <div className="h-20 w-xs bg-fill-surface text-fg-primary flex items-center justify-center rounded">
              Content loaded.
            </div>
          ) : (
            <Skeleton.Rectangle className="h-20 w-xs" />
          )}
        </Skeleton>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: "Toggle Loaded State" })
    await expect(
      canvas.getByRole("status", { name: "Loading content" })
    ).toHaveAttribute("aria-busy", "true")
    await userEvent.click(toggle)
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeNull()
    await expect(canvas.getByText("Content loaded.")).toBeVisible()
    await userEvent.click(toggle)
    await expect(
      canvasElement.querySelector('[aria-busy="true"]')
    ).toBeInTheDocument()
    await userEvent.unhover(toggle)
    toggle.blur()
    await expect(toggle).not.toHaveFocus()
  },
}

export const AnimationSpeed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare animation speed in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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
    <div className="space-y-400 max-w-xs">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">
          Parent speed="fast" - children inherit
        </p>
        <Skeleton speed="fast">
          <div className="flex gap-250 p-250 border rounded-lg">
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
          Parent speed="slow" - one child overrides to fast
        </p>
        <Skeleton speed="slow">
          <div className="flex gap-250 p-250 border rounded-lg">
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

export const CircleWithAvatar: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare circle with avatar in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => {
    const [isLoaded, setIsLoaded] = useState(false)

    return (
      <div className="space-y-250">
        <Button onClick={() => setIsLoaded(!isLoaded)} size="sm">
          Toggle Avatar
        </Button>
        <Skeleton.Circle size="lg" isLoaded={isLoaded}>
          <img
            src="https://i.pravatar.cc/150?img=1"
            alt="User avatar"
            className="rounded-full size-16"
          />
        </Skeleton.Circle>
      </div>
    )
  },
}

export const TextBasic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare text basic in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  render: () => <Skeleton.Text />,
}

export const TextCustomLines: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare text custom lines in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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

export const TextLastLineWidth: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare text last line width in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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
  parameters: {
    docs: {
      description: {
        story:
          "Compare text number of lines in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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
  parameters: {
    docs: {
      description: {
        story:
          "Compare rectangle aspect ratios in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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
  parameters: {
    docs: {
      description: {
        story:
          "Compare rectangle fixed dimensions in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

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
        <Skeleton.Rectangle className="w-xs h-16" />
      </div>
    </div>
  ),
}

export const ProductCardSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare product card skeleton in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Product card loading region",
  render: () => (
    <Skeleton
      aria-label="Loading product"
      className="w-full max-w-md border p-250 rounded-lg"
    >
      <Skeleton.Rectangle className="mb-250 h-64" />
      <Skeleton.Text noOfLines={2} size="sm" />
      <div className="flex gap-150 mt-250">
        <Skeleton.Rectangle className="h-10 flex-1" />
        <Skeleton.Rectangle className="size-10" />
      </div>
    </Skeleton>
  ),
}

export const UserProfileSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare user profile skeleton in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "User profile loading region",
  render: () => (
    <Skeleton
      aria-label="Loading profile"
      className="flex gap-250 p-250 border rounded-lg max-w-md"
    >
      <Skeleton.Circle size="lg" />
      <div className="flex-1">
        <Skeleton.Text noOfLines={3} />
        <div className="flex gap-150 mt-250">
          <Skeleton.Rectangle className="h-8 w-20" />
          <Skeleton.Rectangle className="h-8 w-24" />
        </div>
      </div>
    </Skeleton>
  ),
}

export const FeedSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare feed skeleton in skeleton to choose a suitable presentation for real product content.",
      },
    },
  },

  name: "Feed loading region",
  render: () => (
    <Skeleton aria-label="Loading feed" className="space-y-250 max-w-xs">
      {[1, 2, 3].map((item) => (
        <div key={item} className="border p-250 rounded-lg">
          <div className="flex gap-200 mb-250">
            <Skeleton.Circle size="md" />
            <div className="flex-1">
              <Skeleton.Text noOfLines={2} size="sm" />
            </div>
          </div>
          <Skeleton.Rectangle className="mb-200 aspect-video" />
          <Skeleton.Text noOfLines={3} />
        </div>
      ))}
    </Skeleton>
  ),
}

export const ReducedMotion: Story = {
  name: "Reduced motion",
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
      <div className="bg-warning-subtle border border-warning p-250 rounded">
        <p className="text-sm text-fg-accent-warning">
          <strong>Accessibility:</strong> When users enable "Reduce motion" in
          their OS, animations automatically switch to the static state shown
          below.
        </p>
      </div>
      <Skeleton.Rectangle className="h-20 w-xs force-reduced-motion" />
      <Skeleton.Text noOfLines={3} className="force-reduced-motion" />
      <Skeleton.Circle size="lg" className="force-reduced-motion" />
    </div>
  ),
}
