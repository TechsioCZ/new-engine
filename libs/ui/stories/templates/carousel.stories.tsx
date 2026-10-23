import type { Meta, StoryObj } from "@storybook/react"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { CarouselTemplate } from "../../src/templates/carousel"

const travelSlides = [
  {
    id: "mountains",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80",
    alt: "Sunlit mountain peaks above a valley in the Alps",
  },
  {
    id: "beach",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    alt: "Turquoise sea beside a sandy beach lined with palms",
  },
  {
    id: "city",
    src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1200&q=80",
    alt: "City skyline and waterfront at dusk",
  },
]

const meta: Meta<typeof CarouselTemplate> = {
  title: "Templates/CarouselTemplate",
  component: CarouselTemplate,
  tags: ["autodocs"],
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "CarouselTemplate is the ready-made, props-based version of Carousel for optional images or related content. Use it for a standard navigation layout; use the compound Carousel when you need custom controls, and Gallery for product thumbnails and zoom.",
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
    slides: {
      control: "object",
      description: "Images with stable IDs and meaningful alternative text.",
    },
    size: { control: "select", options: ["sm", "md", "lg", "full"] },
    objectFit: {
      control: "select",
      options: ["cover", "contain", "fill", "none"],
    },
    aspectRatio: {
      control: "select",
      options: ["square", "landscape", "portrait", "wide"],
    },
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    dir: { control: "inline-radio", options: ["ltr", "rtl"] },
    slidesPerMove: {
      control: { type: "number", min: 1, max: 3, step: 1 },
      description: "Slides advanced per move, including a partial final page.",
    },
    showControls: { control: "boolean" },
    showIndicators: { control: "boolean" },
    showAutoplay: {
      control: "boolean",
      description:
        "Show the rotation toggle even without autoplay; autoplay always includes it.",
    },
    loop: { control: "boolean" },
    autoplay: { control: "boolean" },
    allowMouseDrag: { control: "boolean" },
    slidesPerPage: {
      control: { type: "number", min: 1, max: 3, step: 1 },
      description:
        "Visible slides per snap page; indicators follow the actual pages.",
    },
    onPageChange: { control: false },
  },
  args: {
    slides: travelSlides,
    "aria-label": "Featured destinations",
    size: "md",
    objectFit: "cover",
    aspectRatio: "landscape",
    orientation: "horizontal",
    loop: true,
    autoplay: false,
    showControls: true,
    showIndicators: true,
    showAutoplay: false,
    allowMouseDrag: true,
    slidesPerPage: 1,
    slidesPerMove: 1,
    dir: "ltr",
    onPageChange: fn(),
  },
  render: (args) => <CarouselTemplate {...args} />,
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Configure a ready-made travel carousel and toggle its navigation parts without writing a compound layout.",
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
          "The template inherits vertical arrows and side indicators from Carousel, so no custom icons or layout are required.",
      },
    },
  },
}

export const NonLooping: Story = {
  name: "Non-looping destinations",
  args: { loop: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const previous = canvas.getByRole("button", { name: "Previous slide" })
    const next = canvas.getByRole("button", { name: "Next slide" })
    const indicators = canvas.getAllByRole("button", { name: /Go to slide/ })
    await waitFor(() => expect(previous).toBeDisabled())
    await userEvent.click(indicators.at(-1)!)
    await waitFor(() => expect(next).toBeDisabled())
    await expect(next).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(next)
    await expect(indicators.at(-1)!).toHaveAttribute("aria-current", "true")
    await userEvent.click(indicators[0]!)
    await waitFor(() => expect(previous).toBeDisabled())
    await expect(previous).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(previous)
    await expect(indicators[0]!).toHaveAttribute("aria-current", "true")
    await expect(next).toBeEnabled()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
    // Finish with pointer focus off the carousel, not a pending indicator RAF.
    await userEvent.click(canvasElement)
    await expect(canvasElement.ownerDocument.body).toHaveFocus()
  },
  parameters: {
    docs: {
      description: {
        story:
          "A finite set of destinations disables the arrow at each boundary to make the beginning and end obvious.",
      },
    },
  },
}

export const Autoplay: Story = {
  args: { autoplay: true, showAutoplay: true },
  parameters: {
    docs: {
      description: {
        story:
          "Optional rotation includes a pause button and stops on hover, focus or a reduced-motion preference so people stay in control.",
      },
    },
  },
}

export const MediaSizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Carousel sm/md/lg describe media dimensions, not form-control heights; full is a parent-fill layout option.",
      },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-400">
      {(["sm", "md", "lg"] as const).map((size) => (
        <section key={size}>
          <h2>
            {{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}
          </h2>
          <CarouselTemplate {...args} aria-label={`Featured destinations ${size}`} size={size} width="100%" />
        </section>
      ))}
    </div>
  ),
}
export const MultipleSlides: Story = {
  args: { slidesPerPage: 2, loop: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getAllByRole("button", { name: /Go to slide/ })
    ).toHaveLength(2)
  },
  parameters: {
    docs: {
      description: {
        story:
          "Two visible slides share each snap page, so only valid page indicators are rendered.",
      },
    },
  },
}

export const AutoplayWithoutNavigation: Story = {
  args: {
    autoplay: { delay: 800 },
    showControls: false,
    showIndicators: false,
    showAutoplay: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Autoplay always includes its own pause/start control even when other navigation is hidden; reduced motion leaves playback stopped until explicitly started.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const toggle = canvasElement.querySelector('[data-part="autoplay-trigger"]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAccessibleName()
    if (!toggle) throw new Error("Autoplay control is required")
    await userEvent.hover(toggle)
    await waitFor(() =>
      expect(toggle).toHaveAccessibleName("Start slide rotation")
    )
    const visibleSlide = () =>
      canvasElement.querySelector('[data-part="item"]:not([inert])')
        ?.getAttribute("data-index")
    const slides = canvasElement.querySelector<HTMLElement>(
      '[data-part="item-group"]'
    )
    if (!slides) throw new Error("Carousel slides are required")
    const startOffset = slides.scrollLeft
    await userEvent.click(toggle, { skipHover: true })
    await waitFor(() =>
      expect(toggle).toHaveAccessibleName("Stop slide rotation")
    )
    // 800 ms configuration must survive an explicit restart under reduced
    // motion too; Zag's default four-second interval would miss this deadline.
    // Watch the scroll offset the tick starts moving, not the in-view slide:
    // that waits for a smooth scroll plus an IntersectionObserver callback,
    // which a loaded WebKit can push past the deadline.
    await waitFor(
      () => expect(slides.scrollLeft).not.toBe(startOffset),
      { timeout: 1800 }
    )
    await userEvent.click(toggle, { skipHover: true })
    await waitFor(() =>
      expect(toggle).toHaveAccessibleName("Start slide rotation")
    )
    // Rotation is verified above, but elapsed time must not choose the final
    // destination. Scroll the paused carousel to its exact last snap point.
    slides.scrollTo({
      left: slides.scrollWidth - slides.clientWidth,
      behavior: "instant",
    })
    await waitFor(() => {
      expect(visibleSlide()).toBe(String(travelSlides.length - 1))
      expect(slides.scrollLeft).toBe(slides.scrollWidth - slides.clientWidth)
      expect(toggle).toHaveAccessibleName("Start slide rotation")
    })
  },
}
