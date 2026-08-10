import type { Meta, StoryObj } from "@storybook/react"
import type { ReactNode } from "react"

import type { Image } from "../../src/atoms/image"
import { GalleryTemplate } from "../../src/templates/gallery"

const StoryGalleryTemplate = GalleryTemplate<typeof Image>

const shoes1 = new URL("../../assets/gallery/shoes-1.jpg", import.meta.url).href
const shoes2 = new URL("../../assets/gallery/shoes-2.jpg", import.meta.url).href
const shoes3 = new URL("../../assets/gallery/shoes-3.jpg", import.meta.url).href
const shoes4 = new URL("../../assets/gallery/shoes-4.jpg", import.meta.url).href

const baseItems = [
  {
    alt: "Product hero image",
    id: "gallery-1",
    src: shoes1,
  },
  {
    alt: "Product detail image",
    id: "gallery-2",
    src: shoes2,
  },
  {
    alt: "Product color variant",
    id: "gallery-3",
    src: shoes3,
  },
  {
    alt: "Product lifestyle image",
    id: "gallery-4",
    src: shoes4,
  },
]

interface StoryFrameProps {
  children: ReactNode
}

const StoryFrame = ({ children }: StoryFrameProps) => (
  <div className="w-full bg-base p-300">
    <div className="mx-auto w-full max-w-md rounded-md border border-border-primary bg-surface p-200">
      {children}
    </div>
  </div>
)

const meta: Meta<typeof StoryGalleryTemplate> = {
  argTypes: {
    aspectRatio: {
      control: "select",
      description: "Main image aspect ratio",
      options: ["square", "portrait", "landscape", "wide", "none"],
      table: { category: "Appearance" },
    },
    carouselHeight: {
      control: "number",
      description:
        "Main image height in px. Keep empty with fitParent to rely on aspect ratio.",
      table: { category: "Layout" },
    },
    carouselWidth: {
      control: "number",
      description:
        "Main image width in px. For full parent width use fitParent.",
      table: { category: "Layout" },
    },
    fitParent: {
      control: "boolean",
      description:
        "When enabled, carousel width defaults to 100% of parent container.",
      table: { category: "Layout" },
    },
    objectFit: {
      control: "select",
      description: "How images fit in the frame",
      options: ["cover", "contain", "fill", "none"],
      table: { category: "Appearance" },
    },
    orientation: {
      control: "select",
      description: "Thumbnail orientation",
      options: ["horizontal", "vertical"],
      table: { category: "Layout" },
    },
    showAutoplay: {
      control: "boolean",
      description: "Show autoplay toggle",
      table: { category: "Behavior" },
    },
    showControls: {
      control: "boolean",
      description: "Show carousel previous/next arrows",
      table: { category: "Behavior" },
    },
    showIndicators: {
      control: "boolean",
      description: "Show carousel indicators",
      table: { category: "Behavior" },
    },
    showThumbnails: {
      control: "boolean",
      description: "Toggle thumbnail rail",
      table: { category: "Behavior" },
    },
    thumbnailSize: {
      control: "number",
      description: "Thumbnail edge size",
      table: { category: "Layout" },
    },
  },
  args: {
    aspectRatio: "square",
    fitParent: true,
    items: baseItems,
    mainClassName:
      "overflow-hidden rounded-md border border-border-primary bg-base",
    objectFit: "cover",
    orientation: "horizontal",
    showThumbnails: true,
    thumbnailSize: 72,
    thumbnailsClassName:
      "rounded-md border border-border-primary bg-base px-100",
    thumbnailsListClassName: "gap-100 py-100",
  },
  component: StoryGalleryTemplate,
  parameters: {
    docs: {
      description: {
        component: `
A ready-to-use ecommerce image gallery template built on top of the Gallery compound component.
Supports fixed dimensions and parent-fill layout via \`fitParent\`.
        `,
      },
    },
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  title: "Templates/GalleryTemplate",
}

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    orientation: "vertical",
    thumbnailSize: 64,
  },
  render: (args) => (
    <StoryFrame>
      <GalleryTemplate {...args} />
    </StoryFrame>
  ),
}
