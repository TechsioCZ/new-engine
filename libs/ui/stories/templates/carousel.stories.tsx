import type { Meta, StoryObj } from "@storybook/react"

import type { Image } from "../../src/atoms/image"
import { CarouselTemplate } from "../../src/templates/carousel"

const StoryCarouselTemplate = CarouselTemplate<typeof Image>

const meta: Meta<typeof StoryCarouselTemplate> = {
  argTypes: {
    allowMouseDrag: {
      control: "boolean",
      description: "Allow mouse drag to navigate",
      table: {
        category: "Behavior",
      },
    },
    aspectRatio: {
      control: "select",
      description: "Aspect ratio of slides",
      options: ["square", "landscape", "portrait", "wide", "none"],
      table: {
        category: "Appearance",
      },
    },
    autoplay: {
      control: "boolean",
      description: "Enable autoplay",
      table: {
        category: "Behavior",
      },
    },
    loop: {
      control: "boolean",
      description: "Enable infinite loop",
      table: {
        category: "Behavior",
      },
    },
    objectFit: {
      control: "select",
      description: "How images fit within slides",
      options: ["cover", "contain", "fill", "none"],
      table: {
        category: "Appearance",
      },
    },
    onPageChange: {
      action: "page-changed",
      table: {
        category: "Events",
      },
    },
    orientation: {
      control: "select",
      description: "Carousel orientation",
      options: ["horizontal", "vertical"],
      table: {
        category: "Layout",
      },
    },
    showAutoplay: {
      control: "boolean",
      description: "Show autoplay control button",
      table: {
        category: "Controls",
      },
    },
    showControls: {
      control: "boolean",
      description: "Show previous/next navigation buttons",
      table: {
        category: "Controls",
      },
    },
    showIndicators: {
      control: "boolean",
      description: "Show slide indicators",
      table: {
        category: "Controls",
      },
    },
    size: {
      control: "select",
      description: "Size variant",
      options: ["sm", "md", "lg", "full"],
      table: {
        category: "Appearance",
      },
    },
    slides: {
      control: "object",
      description:
        "Array of carousel slides with id, src, alt, and optional content",
      table: {
        category: "Content",
      },
    },
    slidesPerPage: {
      control: "number",
      description: "Number of slides visible per page",
      table: {
        category: "Behavior",
      },
    },
  },
  component: StoryCarouselTemplate,
  parameters: {
    docs: {
      description: {
        component: `
          A ready-to-use carousel template with props-based API.
          This template provides a simplified interface for the Carousel compound component,
          making it ideal for Storybook controls and rapid prototyping.

          Part of the templates layer in atomic design architecture.
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Templates/CarouselTemplate",
}

export default meta
type Story = StoryObj<typeof meta>

const defaultSlides = [
  {
    alt: "Product 1",
    id: "slide-1",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  },
  {
    alt: "Product 2",
    id: "slide-2",
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
  },
  {
    alt: "Product 3",
    id: "slide-3",
    src: "https://images.unsplash.com/photo-1747258294931-79af146bd74c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    alt: "Product 4",
    id: "slide-4",
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
  },
]

export const Default: Story = {
  args: {
    allowMouseDrag: true,
    aspectRatio: "square",
    autoplay: false,
    loop: true,
    objectFit: "cover",
    orientation: "horizontal",
    showAutoplay: false,
    showControls: true,
    showIndicators: true,
    size: "md",
    slides: defaultSlides,
    slidesPerPage: 1,
  },
}

export const Playground: Story = {
  args: {
    allowMouseDrag: true,
    aspectRatio: "landscape",
    autoplay: true,
    loop: true,
    objectFit: "cover",
    orientation: "horizontal",
    showAutoplay: true,
    showControls: true,
    showIndicators: true,
    size: "lg",
    slides: [
      ...defaultSlides,
      {
        alt: "Product 5",
        id: "slide-5",
        src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
      },
    ],
    slidesPerPage: 1,
  },
  name: "🎮 Interactive Playground",
}
