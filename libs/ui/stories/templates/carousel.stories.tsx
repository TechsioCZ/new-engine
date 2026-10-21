import type { Meta, StoryObj } from "@storybook/react"
import { fn } from "storybook/test"
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
    showControls: { control: "boolean" },
    showIndicators: { control: "boolean" },
    showAutoplay: {
      control: "boolean",
      description: "Keep this enabled whenever automatic rotation is enabled.",
    },
    loop: { control: "boolean" },
    autoplay: { control: "boolean" },
    allowMouseDrag: { control: "boolean" },
    slidesPerPage: { control: false, table: { disable: true } },
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
    onPageChange: fn(),
  },
  render: (args) => (
    <CarouselTemplate
      {...args}
      showAutoplay={Boolean(args.autoplay) || args.showAutoplay}
    />
  ),
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
