import { expect, userEvent, waitFor, within } from "storybook/test"
import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode } from "react"
import { GalleryTemplate } from "../../src/templates/gallery"

const shoes1 = new URL("../../assets/gallery/shoes-1.avif", import.meta.url)
  .href
const shoes2 = new URL("../../assets/gallery/shoes-2.avif", import.meta.url)
  .href
const shoes3 = new URL("../../assets/gallery/shoes-3.avif", import.meta.url)
  .href
const shoes4 = new URL("../../assets/gallery/shoes-4.avif", import.meta.url)
  .href

const baseItems = [
  {
    id: "gallery-1",
    src: shoes1,
    alt: "Product hero image",
  },
  {
    id: "gallery-2",
    src: shoes2,
    alt: "Product detail image",
  },
  {
    id: "gallery-3",
    src: shoes3,
    alt: "Product color variant",
  },
  {
    id: "gallery-4",
    src: shoes4,
    alt: "Product lifestyle image",
  },
]

type StoryFrameProps = {
  children: ReactNode
}

function StoryFrame({ children }: StoryFrameProps) {
  return (
    <div className="w-full bg-base p-300">
      <div className="mx-auto max-w-md w-full rounded-md border border-border-primary bg-surface p-200">
        {children}
      </div>
    </div>
  )
}

const meta: Meta<typeof GalleryTemplate> = {
  title: "Templates/GalleryTemplate",
  component: GalleryTemplate,
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "fullscreen",
    docs: {
      description: {
        component: `
A ready-to-use ecommerce image gallery template built on top of the Gallery compound component.
Supports fixed dimensions and parent-fill layout via \`fitParent\`. Choose compound Gallery for custom composition, or Carousel when thumbnails are unnecessary. The size prop describes media dimensions rather than form-control heights.
        `,
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Thumbnail orientation",
      table: { category: "Layout" },
    },
    aspectRatio: {
      control: "select",
      options: ["square", "portrait", "landscape", "wide", "none"],
      description: "Main image aspect ratio",
      table: { category: "Appearance" },
    },
    objectFit: {
      control: "select",
      options: ["cover", "contain", "fill", "none"],
      description: "How images fit in the frame",
      table: { category: "Appearance" },
    },
    carouselWidth: {
      control: "number",
      description:
        "Main image width in px. For full parent width use fitParent.",
      table: { category: "Layout" },
    },
    carouselHeight: {
      control: "number",
      description:
        "Main image height in px. Keep empty with fitParent to rely on aspect ratio.",
      table: { category: "Layout" },
    },
    fitParent: {
      control: "boolean",
      description:
        "When enabled, carousel width defaults to 100% of parent container.",
      table: { category: "Layout" },
    },
    thumbnailSize: {
      control: "number",
      description: "Thumbnail edge size",
      table: { category: "Layout" },
    },
    showThumbnails: {
      control: "boolean",
      description: "Toggle thumbnail rail",
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
    showAutoplay: {
      control: "boolean",
      description: "Show autoplay toggle",
      table: { category: "Behavior" },
    },
  },
  args: {
    items: baseItems,
    orientation: "horizontal",
    aspectRatio: "square",
    objectFit: "cover",
    thumbnailSize: 72,
    showThumbnails: true,
    mainClassName:
      "overflow-hidden rounded-md border border-border-primary bg-base",
    thumbnailsClassName:
      "rounded-md border border-border-primary bg-base px-100",
    thumbnailsListClassName: "gap-100 py-100",
    fitParent: true,
  },
}

export default meta

type Story = StoryObj<typeof GalleryTemplate>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Use the controls to explore the component in a realistic layout without leaving the preview.",
      },
    },
  },
  render: (args) => (
    <StoryFrame>
      <GalleryTemplate {...args} />
    </StoryFrame>
  ),
  args: {
    orientation: "vertical",
    thumbnailSize: 64,
  },
}

export const MediaSizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "The nested carousel's Small (sm), Medium (md) and Large (lg) media dimensions are independent of form-control heights; fitParent makes each example responsive.",
      },
    },
  },
  render: (args) => (
    <div className="flex flex-col gap-400">
      {(["sm", "md", "lg"] as const).map((size) => (
        <section key={size}>
          <h2 className="p-200">
            {{ sm: "Small (sm)", md: "Medium (md)", lg: "Large (lg)" }[size]}
          </h2>
          <StoryFrame>
            <GalleryTemplate {...args} aria-label={`Product images ${size}`} size={size} />
          </StoryFrame>
        </section>
      ))}
    </div>
  ),
}

export const AutoplayOnly: Story = {
  args: {
    items: baseItems,
    orientation: "horizontal",
    autoplay: { delay: 900 },
    showAutoplay: false,
    showControls: false,
    showIndicators: false,
    showThumbnails: false,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Autoplay always provides its own pause/restart control, even without navigation. Reduced motion prevents automatic startup, not explicit play.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button")
    // Reduced motion starts paused; otherwise pause the initial rotation.
    toggle.focus()
    if (/stop|pause/i.test(toggle.getAttribute("aria-label") ?? "")) {
      await userEvent.keyboard("{Enter}")
    }
    await waitFor(() => expect(toggle).toHaveAccessibleName(/start|play/i))
    const group = canvasElement.querySelector<HTMLElement>(
      '[data-part="item-group"]'
    )!
    const before = group.scrollLeft
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await expect(group.scrollLeft).toBe(before)
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(toggle).toHaveAccessibleName(/stop|pause/i))
    await new Promise((resolve) => setTimeout(resolve, 250))
    await expect(group.scrollLeft).toBe(before)
    await waitFor(() => expect(group.scrollLeft).not.toBe(before), {
      timeout: 2200,
    })
    await userEvent.keyboard("{Enter}")
    await waitFor(() => expect(toggle).toHaveAccessibleName(/start|play/i))
  },
}
