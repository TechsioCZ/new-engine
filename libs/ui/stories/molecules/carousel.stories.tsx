import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import {
  Carousel,
  type CarouselRootProps,
  type CarouselSlide,
} from "../../src/molecules/carousel"

const sampleImages: CarouselSlide[] = [
  {
    id: "mountains",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
    alt: "Sunlit mountain peaks above a valley in the Alps",
  },
  {
    id: "coast",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    alt: "Turquoise sea beside a sandy beach lined with palms",
  },
  {
    id: "city",
    src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
    alt: "City skyline and waterfront at dusk",
  },
  {
    id: "coffee",
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    alt: "Freshly brewed coffee and coffee-making equipment on a table",
  },
]

const contentSlides: CarouselSlide[] = (
  [
    ["weekend", "A weekend away", "Find a slower pace in the mountains."],
    [
      "coast",
      "Follow the coastline",
      "Explore quiet beaches and seaside trails.",
    ],
    [
      "city",
      "Stay curious",
      "Discover a new neighbourhood on your next city break.",
    ],
  ] as const
).map(([id, title, description]) => ({
  id,
  content: (
    <div className="flex size-full flex-col justify-center gap-100 bg-surface p-400 text-fg-primary">
      <p className="text-sm text-fg-secondary">Ideas for your next trip</p>
      <h3 className="font-semibold text-xl">{title}</h3>
      <p className="max-w-sm text-fg-secondary">{description}</p>
    </div>
  ),
}))

type StoryArgs = CarouselRootProps & {
  controls?: "standard" | "minimal"
  controlPosition?: "top" | "bottom" | "side" | "unset"
}

const meta: Meta<StoryArgs> = {
  title: "Molecules/Carousel",
  component: Carousel,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      source: {
        transform: (source: string) =>
          source.includes('import { Carousel } from "@techsio/ui-kit/molecules/carousel"')
            ? source
            : `import { Carousel } from "@techsio/ui-kit/molecules/carousel"\n\n${source}`,
      },
      description: {
        component:
          "Carousel lets people browse optional images or related content one page at a time, with buttons, keyboard navigation and swipe. Use Gallery for product media with thumbnails and zoom; keep essential information in a static layout. Vertical orientation automatically places up/down controls and indicators on the side.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-lg">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "full"] },
    objectFit: {
      control: "select",
      options: ["cover", "contain", "fill", "none"],
    },
    aspectRatio: {
      control: "select",
      options: ["square", "landscape", "portrait", "wide", "none"],
    },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    dir: { control: "inline-radio", options: ["ltr", "rtl"] },
    controls: {
      control: "inline-radio",
      options: ["standard", "minimal"],
      description:
        "Standard navigation includes page indicators; minimal navigation uses two surface-backed arrows.",
    },
    controlPosition: {
      control: "select",
      options: ["top", "bottom", "side", "unset"],
      if: { arg: "controls", eq: "standard" },
      description:
        "Vertical carousels place top/bottom controls on the leading/trailing side.",
    },
    loop: { control: "boolean" },
    autoplay: { control: "boolean" },
    allowMouseDrag: { control: "boolean" },
    slidesPerPage: { control: { type: "number", min: 1, max: 4, step: 1 } },
    slidesPerMove: {
      control: { type: "number", min: 1, max: 4, step: 1 },
      description:
        "Keep this at or below slidesPerPage to avoid skipping content.",
    },
    id: { control: false, table: { disable: true } },
    children: { control: false, table: { disable: true } },
    slideCount: { control: false, table: { disable: true } },
    onPageChange: { control: false },
  },
  args: {
    size: "md",
    objectFit: "cover",
    aspectRatio: "landscape",
    orientation: "horizontal",
    dir: "ltr",
    controls: "standard",
    controlPosition: "bottom",
    loop: true,
    autoplay: false,
    slidesPerPage: 1,
    slidesPerMove: 1,
    allowMouseDrag: true,
    onPageChange: fn(),
  },
  render: ({ controls, controlPosition, ...args }) => (
    <Carousel
      {...args}
      aria-label={args["aria-label"] ?? "Travel inspiration"}
      slideCount={sampleImages.length}
      height={
        args.height ??
        (args.aspectRatio === "none" && args.orientation === "vertical"
          ? "var(--size-carousel-md)"
          : undefined)
      }
    >
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control controls={controls} controlPosition={controlPosition}>
        <Carousel.Previous />
        {controls !== "minimal" && <Carousel.Indicators />}
        <Carousel.Next />
      </Carousel.Control>
      {args.autoplay && <Carousel.Autoplay />}
    </Carousel>
  ),
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Change orientation, navigation style and page size to see how the carousel adapts without custom layout or icons.",
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <VariantContainer>
      {(["sm", "md", "lg"] as const).map((size) => (
        <VariantGroup key={size} title={size}>
          <Carousel
            aria-label={`${size} travel inspiration`}
            slideCount={sampleImages.length}
            size={size}
            aspectRatio="landscape"
          >
            <Carousel.Slides slides={sampleImages} />
            <Carousel.Control>
              <Carousel.Previous />
              <Carousel.Indicators />
              <Carousel.Next />
            </Carousel.Control>
          </Carousel>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare small, medium and large viewports with navigation targets scaled to each size.",
      },
    },
  },
}

export const States: Story = {
  name: "Non-looping boundaries",
  args: { loop: false },
  parameters: {
    docs: {
      description: {
        story:
          "Browse a finite set of four destinations; previous is disabled at the start and next is disabled at the end.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const previous = canvas.getByRole("button", { name: "Previous slide" })
    const next = canvas.getByRole("button", { name: "Next slide" })
    const indicators = canvas.getAllByRole("button", { name: /Go to slide/ })
    await waitFor(() => expect(next).toBeEnabled())
    await expect(previous).toBeDisabled()
    await expect(previous).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(indicators.at(-1)!)
    await waitFor(() => expect(next).toBeDisabled())
    await expect(next).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(next)
    await expect(indicators.at(-1)!).toHaveAttribute("aria-current", "true")
    await userEvent.click(indicators[0]!)
    await waitFor(() => expect(previous).toBeDisabled())
    await expect(next).toBeEnabled()
    await userEvent.click(previous)
    await expect(indicators[0]!).toHaveAttribute("aria-current", "true")
  },
}

export const MinimalControls: Story = {
  args: { controls: "minimal" },
  parameters: {
    docs: {
      description: {
        story:
          "Two opaque, bordered arrows stay visible over bright or dark photography without an indicator rail.",
      },
    },
  },
}

export const Vertical: Story = {
  args: { orientation: "vertical", aspectRatio: "square" },
  parameters: {
    docs: {
      description: {
        story:
          "A vertical carousel uses up/down arrows and a vertical indicator rail on the side, with no consumer overrides.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const previous = canvas.getByRole("button", { name: "Previous slide" })
    const next = canvas.getByRole("button", { name: "Next slide" })
    await expect(previous.querySelector("span")).toHaveClass(
      /token-icon-carousel-prev-vertical/
    )
    await expect(next.querySelector("span")).toHaveClass(
      /token-icon-carousel-next-vertical/
    )
    const indicators = canvas.getAllByRole("button", { name: /Go to slide/ })
    await waitFor(() => expect(indicators).toHaveLength(sampleImages.length))
    await userEvent.click(indicators[0]!)
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() =>
      expect(indicators[1]).toHaveAttribute("aria-current", "true")
    )
    await userEvent.keyboard("{Home}")
    await waitFor(() =>
      expect(indicators[0]).toHaveAttribute("aria-current", "true")
    )
  },
}

export const VerticalWide: Story = {
  name: "Vertical navigation in a short viewport",
  args: { orientation: "vertical", size: "md", aspectRatio: "wide" },
  parameters: {
    docs: {
      description: {
        story:
          "A wide image keeps its short aspect ratio while the vertical rail occupies a separate column with enough height for every navigation target.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Travel inspiration" })
    const previous = canvas.getByRole("button", { name: "Previous slide" })
    const next = canvas.getByRole("button", { name: "Next slide" })
    const slides = region.querySelector('[data-part="item-group"]')!
    const rail = region.querySelector('[data-part="control"]')!
    await waitFor(() => expect(next).toBeEnabled())
    await waitFor(() => {
      const bounds = region.getBoundingClientRect()
      expect(bounds.right).toBeLessThanOrEqual(
        canvasElement.getBoundingClientRect().right
      )
      const railBounds = rail.getBoundingClientRect()
      expect(railBounds.left).toBeGreaterThanOrEqual(
        slides.getBoundingClientRect().right
      )
      for (const button of [previous, next]) {
        const target = button.getBoundingClientRect()
        expect(target.top).toBeGreaterThanOrEqual(bounds.top)
        expect(target.bottom).toBeLessThanOrEqual(bounds.bottom)
        expect(target.right).toBeLessThanOrEqual(bounds.right)
      }
    })
    await userEvent.click(next)
    await waitFor(() =>
      expect(canvas.getAllByRole("button", { name: /Go to slide/ })[1]).toHaveAttribute(
        "aria-current",
        "true"
      )
    )
  },
}

export const NumberedIndicators: Story = {
  render: ({ controls: _controls, controlPosition, ...args }) => (
    <Carousel
      {...args}
      aria-label="Numbered travel inspiration"
      slideCount={sampleImages.length}
    >
      <Carousel.Slides slides={sampleImages} />
      {args.autoplay && <Carousel.Autoplay />}
      <Carousel.Control controlPosition={controlPosition}>
        <Carousel.Previous />
        <Carousel.Indicators>
          {sampleImages.map((slide, index) => (
            <Carousel.Indicator
              key={slide.id}
              index={index}
              className="font-medium text-sm data-current:underline data-current:decoration-2 data-current:underline-offset-4"
            >
              {index + 1}
            </Carousel.Indicator>
          ))}
        </Carousel.Indicators>
        <Carousel.Next />
      </Carousel.Control>
    </Carousel>
  ),
  parameters: {
    controls: { exclude: ["controls", "slidesPerPage", "slidesPerMove"] },
    docs: {
      description: {
        story:
          "Numbered indicators replace the dots and underline the current page so selection does not rely on color alone.",
      },
    },
  },
}

export const CustomControlLayout: Story = {
  args: { controlPosition: "unset" },
  parameters: {
    docs: {
      description: {
        story:
          "An in-flow navigation rail sits below the image when controls should never cover slide content.",
      },
    },
  },
}

export const MixedContent: Story = {
  render: ({ controls, controlPosition: _controlPosition, ...args }) => (
    <Carousel {...args} aria-label="Travel ideas" slideCount={3}>
      <Carousel.Slides
        slides={[sampleImages[0]!, contentSlides[0]!, sampleImages[1]!]}
      />
      <Carousel.Control controls={controls} controlPosition="unset">
        <Carousel.Previous />
        {controls !== "minimal" && <Carousel.Indicators />}
        <Carousel.Next />
      </Carousel.Control>
      {args.autoplay && <Carousel.Autoplay />}
    </Carousel>
  ),
  parameters: {
    controls: { exclude: ["controlPosition"] },
    docs: {
      description: {
        story:
          "Mix photography and editorial content while keeping equal slide heights and controls outside the text.",
      },
    },
  },
}

export const ObjectFitDemo: Story = {
  name: "Image fit",
  render: () => (
    <VariantContainer>
      {(["cover", "contain", "fill", "none"] as const).map((fit) => (
        <VariantGroup key={fit} title={fit}>
          <Carousel
            aria-label={`${fit} image fit`}
            slideCount={1}
            size="sm"
            aspectRatio="square"
            objectFit={fit}
          >
            <Carousel.Slides slides={sampleImages.slice(0, 1)} />
          </Carousel>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare cropping, letterboxing, stretching and natural image size before choosing how media fits its viewport.",
      },
    },
  },
}

export const AspectRatioDemo: Story = {
  name: "Aspect ratios",
  render: () => (
    <VariantContainer>
      {(["square", "landscape", "portrait", "wide"] as const).map((ratio) => (
        <VariantGroup key={ratio} title={ratio}>
          <Carousel
            aria-label={`${ratio} image`}
            slideCount={1}
            size="sm"
            aspectRatio={ratio}
          >
            <Carousel.Slides slides={sampleImages.slice(0, 1)} />
          </Carousel>
        </VariantGroup>
      ))}
    </VariantContainer>
  ),
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The same photograph appears in four stable viewport shapes so designers can compare cropping and composition.",
      },
    },
  },
}

export const Autoplay: Story = {
  args: { autoplay: true },
  parameters: {
    docs: {
      description: {
        story:
          "Optional automatic rotation includes a visible pause/play control and starts paused when reduced motion is preferred; hover or focus stops rotation until explicitly restarted.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const next = canvas.getByRole("button", { name: "Next slide" })
    await userEvent.hover(next)
    const start = await canvas.findByRole("button", {
      name: "Start slide rotation",
    })
    await userEvent.click(start)
    await canvas.findByRole("button", { name: "Stop slide rotation" })
    await userEvent.click(
      canvas.getAllByRole("button", { name: /Go to slide/ })[0]!
    )
    await waitFor(() =>
      expect(
        canvas.queryByRole("button", { name: "Stop slide rotation" })
      ).not.toBeInTheDocument()
    )
  },
}

export const SlidesPerPage: Story = {
  args: {
    slidesPerPage: 3,
    size: "lg",
    aspectRatio: "wide",
    controlPosition: "unset",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Three destinations share each viewport while page indicators reflect actual snap points rather than the number of images.",
      },
    },
  },
}

export const SlidesPerMove: Story = {
  args: {
    slidesPerPage: 2,
    slidesPerMove: 2,
    size: "lg",
    controlPosition: "unset",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Advance two destinations at a time when the visible pair should be browsed as one page.",
      },
    },
  },
}

export const SingleSlide: Story = {
  name: "Single-slide boundaries",
  args: { loop: true },
  render: ({ controls, controlPosition, ...args }) => (
    <Carousel {...args} aria-label="Featured destination" slideCount={1}>
      <Carousel.Slides slides={sampleImages.slice(0, 1)} />
      <Carousel.Control controls={controls} controlPosition={controlPosition}>
        <Carousel.Previous />
        {controls !== "minimal" && <Carousel.Indicators />}
        <Carousel.Next />
      </Carousel.Control>
      {args.autoplay && <Carousel.Autoplay />}
    </Carousel>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "A single image has no next or previous destination, so both arrows remain disabled even when looping is enabled.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "Previous slide" })
    ).toBeDisabled()
    await expect(
      canvas.getByRole("button", { name: "Next slide" })
    ).toBeDisabled()
  },
}

export const VerticalMinimalControls: Story = {
  name: "Vertical minimal controls",
  args: {
    orientation: "vertical",
    controls: "minimal",
    aspectRatio: "portrait",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Minimal up/down arrows sit at opposite ends of the vertical viewport and remain visible without a navigation rail.",
      },
    },
  },
}
