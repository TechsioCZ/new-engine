import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentPropsWithoutRef } from "react"
import { useState } from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Skeleton } from "../../src/atoms/skeleton"
import { Button } from "../../src/atoms/button"

const meta: Meta<typeof Skeleton> = {
  title: "Atoms/Skeleton",
  component: Skeleton,
  decorators: [
    (Story) => (
      <div className="p-200">
        <Story />
      </div>
    ),
  ],
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
      <Skeleton
        {...skeletonArgs}
        className="flex w-full max-w-md flex-col gap-250"
      >
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
    const placeholders = status.querySelector("[inert]")
    await expect(placeholders).toHaveAttribute("aria-hidden", "true")
    await expect(
      placeholders?.querySelectorAll(':scope > [aria-hidden="true"]')
    ).toHaveLength(
      [args.showRectangle, args.showText, args.showCircle].filter(Boolean)
        .length
    )
    const shapes = Array.from(placeholders?.children ?? [])
    for (let index = 1; index < shapes.length; index += 1) {
      const previous = shapes[index - 1]!.getBoundingClientRect()
      const current = shapes[index]!.getBoundingClientRect()
      await expect(current.top).toBeGreaterThan(previous.bottom)
    }
  },
}

export const Variants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare equal-size placeholders in an undimmed static reduced-motion state. Primary carries the main loading shape; Secondary is a quieter supporting surface. Animation speed is demonstrated separately.",
      },
    },
  },

  render: () => (
    <div className="space-y-250">
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Primary (default)</p>
        <Skeleton.Rectangle
          variant="primary"
          className="h-20 w-xs force-reduced-motion"
          data-testid="skeleton-primary"
        />
      </div>
      <div>
        <p className="mb-150 text-sm text-fg-secondary">Secondary</p>
        <Skeleton.Rectangle
          variant="secondary"
          className="h-20 w-xs force-reduced-motion"
          data-testid="skeleton-secondary"
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const primary = canvas.getByTestId("skeleton-primary")
    const secondary = canvas.getByTestId("skeleton-secondary")
    const primaryBounds = primary.getBoundingClientRect()
    const secondaryBounds = secondary.getBoundingClientRect()
    await expect(primaryBounds.width).toBe(secondaryBounds.width)
    await expect(primaryBounds.height).toBe(secondaryBounds.height)
    for (const placeholder of [primary, secondary]) {
      const style = getComputedStyle(placeholder)
      await expect(style.animationName).toBe("none")
      await expect(style.opacity).toBe("1")
    }

    if (!canvasElement.closest('[data-theme="business"]')) return

    const samples: Uint8ClampedArray[] = []
    const swatch = canvasElement.ownerDocument.createElement("canvas")
    swatch.width = 1
    swatch.height = 1
    const context = swatch.getContext("2d")
    if (!context) throw new Error("Missing Skeleton color-check context")

    for (const variant of ["primary", "secondary"]) {
      const placeholder = canvas.getByTestId(`skeleton-${variant}`)
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = getComputedStyle(placeholder).backgroundColor
      context.fillRect(0, 0, 1, 1)
      const sample = context.getImageData(0, 0, 1, 1).data
      samples.push(sample)
      const [red, green, blue, alpha] = sample
      // Keep both fills in the same cool neutral family, not a status hue.
      await expect(alpha).toBe(255)
      await expect(green).toBeGreaterThanOrEqual(red!)
      await expect(blue).toBeGreaterThanOrEqual(red!)
    }
    // Static shapes keep full opacity and at least eight levels of separation
    // per channel on the same surface. Unequal pulse phases cannot pass this.
    for (const channel of [0, 1, 2]) {
      await expect(
        samples[1]![channel]! - samples[0]![channel]!
      ).toBeGreaterThanOrEqual(8)
    }
  },
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Compare avatar sizes and text spacing in equal-width columns, stacked on narrow screens. Text-line height stays content-owned rather than scaling with avatar size.",
      },
    },
  },

  render: () => (
    <div
      className="grid w-full max-w-xl grid-cols-1 items-start gap-250 sm:grid-cols-3"
      data-testid="skeleton-size-comparison"
    >
      {(
        [
          ["sm", "Small (sm)"],
          ["md", "Medium (md)"],
          ["lg", "Large (lg)"],
        ] as const
      ).map(([size, label]) => (
        <div className="flex min-w-0 flex-col gap-150" key={size}>
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
  play: async ({ canvasElement }) => {
    const columns = canvasElement.querySelector('[data-testid="skeleton-size-comparison"]')
    if (!columns) throw new Error("Missing Skeleton size columns")
    await expect(getComputedStyle(columns).display).toBe("grid")
    await expect(getComputedStyle(columns).alignItems).toBe("flex-start")
  },
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
          <div className="flex gap-250 p-250 border border-border-primary rounded-lg">
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
          <div className="flex gap-250 p-250 border border-border-primary rounded-lg">
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
      className="w-full max-w-md border border-border-primary p-250 rounded-lg"
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
      className="flex gap-250 p-250 border border-border-primary rounded-lg max-w-md"
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
    <Skeleton
      aria-label="Loading feed"
      className="flex max-w-xs flex-col gap-250"
    >
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="border border-border-primary p-250 rounded-lg"
        >
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
  play: async ({ canvasElement }) => {
    const feed = within(canvasElement).getByRole("status", {
      name: "Loading feed",
    })
    const cards = feed.querySelectorAll("[inert] > div")
    await expect(cards).toHaveLength(3)
    for (const card of cards) {
      const style = getComputedStyle(card)
      await expect(style.borderTopColor).not.toBe(style.color)
    }
    const first = cards[0]!.getBoundingClientRect()
    const second = cards[1]!.getBoundingClientRect()
    await expect(second.top).toBeGreaterThan(first.bottom)
  },
}

export const ReducedMotion: Story = {
  name: "Reduced motion",
  parameters: {
    docs: {
      description: {
        story:
          "Both variants stop pulsing without dimming rectangle, text, and circle placeholders. This forced static demonstration does not change or emulate your OS preference; the real reduced-motion media rule uses the same undimmed state.",
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
      {(["primary", "secondary"] as const).map((variant) => (
        <div className="w-full max-w-xs space-y-150" key={variant}>
          <p className="text-sm text-fg-secondary">
            {variant === "primary" ? "Primary (default)" : "Secondary"}
          </p>
          <Skeleton
            variant={variant}
            aria-label={`Loading ${variant} preview`}
            className="flex flex-col gap-150"
            data-testid={`reduced-motion-${variant}`}
          >
            <Skeleton.Rectangle className="h-20 force-reduced-motion" />
            <div className="flex items-start gap-200">
              <Skeleton.Circle size="lg" className="force-reduced-motion" />
              <Skeleton.Text
                noOfLines={3}
                className="force-reduced-motion"
                containerClassName="min-w-0 flex-1"
              />
            </div>
          </Skeleton>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const variant of ["primary", "secondary"]) {
      const group = canvas.getByTestId(`reduced-motion-${variant}`)
      const shapes = group.querySelectorAll(
        '[class*="animate-skeleton-pulse-"]'
      )
      await expect(shapes).toHaveLength(5)
      const fill = getComputedStyle(shapes[0]!).backgroundColor
      for (const shape of shapes) {
        const style = getComputedStyle(shape)
        await expect(style.animationName).toBe("none")
        await expect(style.opacity).toBe("1")
        await expect(style.backgroundColor).toBe(fill)
      }
    }
  },
}

function InteractionIsolationExample() {
  const [loaded, setLoaded] = useState(false)
  const [activations, setActivations] = useState(0)
  return (
    <div className="flex w-full max-w-md flex-col gap-250">
      <Button onClick={() => setLoaded((value) => !value)}>
        Toggle loading
      </Button>
      <Skeleton
        isLoaded={loaded}
        aria-label="Loading project details"
        speed="slow"
        data-testid="skeleton-group"
      >
        <Button onClick={() => setActivations((value) => value + 1)}>
          Root action
        </Button>
        <Skeleton.Rectangle
          data-testid="group-rectangle"
          className="h-20 w-xs"
          speed="fast"
        >
          <Button onClick={() => setActivations((value) => value + 1)}>
            Rectangle action
          </Button>
        </Skeleton.Rectangle>
      </Skeleton>
      <Skeleton.Rectangle
        isLoaded={loaded}
        aria-label="Loading summary"
        data-testid="standalone-rectangle"
        className="h-20 w-xs"
        speed="fast"
      >
        <Button onClick={() => setActivations((value) => value + 1)}>
          Standalone action
        </Button>
      </Skeleton.Rectangle>
      <Button onClick={() => setActivations((value) => value + 1)}>
        After placeholders
      </Button>
      <output data-testid="placeholder-activations">{activations}</output>
    </div>
  )
}

export const InteractionIsolation: Story = {
  tags: ["!dev", "!autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Loading placeholders cannot receive keyboard interaction, while loaded content becomes operable without residual loading semantics.",
      },
    },
  },
  render: () => <InteractionIsolationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: "Toggle loading" })
    toggle.focus()
    // userEvent.tab does not model native inert tab order. Assert the browser's
    // focus rejection here; actions.spec.ts covers real Tab traversal.
    const hiddenAction = within(canvas.getByTestId("skeleton-group")).getByText(
      "Root action"
    )
    await expect(hiddenAction.closest("[inert]")).not.toBeNull()
    hiddenAction.focus()
    await expect(hiddenAction).not.toHaveFocus()
    await expect(toggle).toHaveFocus()
    await expect(
      canvas.queryByRole("button", { name: "Rectangle action" })
    ).toBeNull()
    await expect(
      canvas.getByTestId("placeholder-activations")
    ).toHaveTextContent("0")
    await userEvent.click(toggle)
    await waitFor(() =>
      expect(
        canvasElement.querySelector("[inert], [aria-busy], [aria-hidden=true]")
      ).toBeNull()
    )
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Root action" })
    ).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await userEvent.tab()
    await expect(
      canvas.getByRole("button", { name: "Rectangle action" })
    ).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(
      canvas.getByTestId("placeholder-activations")
    ).toHaveTextContent("2")
  },
}
