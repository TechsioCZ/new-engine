import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Gallery, type GalleryItem } from "../../src/organisms/gallery"
import { Carousel } from "../../src/molecules/carousel"

const items: GalleryItem[] = [
  { id: "front", src: new URL("../../assets/gallery/shoes-1.avif", import.meta.url).href, alt: "Pastel sneaker, front view" },
  { id: "side", src: new URL("../../assets/gallery/shoes-2.avif", import.meta.url).href, alt: "Pastel sneaker, side view" },
  { id: "red", src: new URL("../../assets/gallery/shoes-3.avif", import.meta.url).href, alt: "Red sneaker, side view" },
  { id: "detail", src: new URL("../../assets/gallery/shoes-4.avif", import.meta.url).href, alt: "Sneaker sole detail" },
]
const meta: Meta<typeof Gallery> = {
  title: "Organisms/Gallery", component: Gallery, tags: ["autodocs"],
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "padded",
    docs: { description: { component: "Gallery is a compound product-media viewer that synchronizes a main carousel and thumbnail rail. Compose Gallery.Main, Gallery.Carousel and Gallery.Thumbnails for custom layouts; choose GalleryTemplate for a ready-made props-only layout, or Carousel for slides without thumbnails. thumbnailSize is a media dimension in pixels, not a form-control size; carouselProps configures the nested carousel's media sizing." } },
  },
  argTypes: {
    items: { control: "object" },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    thumbnailSize: { control: { type: "number", min: 32, max: 120, step: 4 } },
    showThumbnails: { control: "boolean" },
    hideThumbnailsWhenSingle: { control: "boolean" },
    carouselProps: { control: "object" },
    value: { control: false }, children: { control: false, table: { disable: true } },
    onValueChange: { control: false },
  },
  args: {
    items, orientation: "horizontal", thumbnailSize: 64,
    showThumbnails: true, hideThumbnailsWhenSingle: true,
    carouselProps: { width: "100%", size: "full", aspectRatio: "square", objectFit: "contain", "aria-label": "Workshop sneaker views" },
  },
  decorators: [(Story) => <div className="mx-auto w-full max-w-lg"><Story /></div>],
  render: (args) => <Gallery {...args}>
    <Gallery.Main><Gallery.Carousel><Gallery.Slides /></Gallery.Carousel></Gallery.Main>
    <Gallery.Thumbnails />
  </Gallery>,
} satisfies Meta<typeof Gallery>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: { docs: { description: { story: "Change the real Gallery props and select a thumbnail to keep the main product view in sync." } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("region", { name: "Workshop sneaker views" })).toBeInTheDocument()
    const thumbnail = canvas.getByRole("button", { name: "Show slide 2" })
    await userEvent.click(thumbnail)
    await expect(thumbnail).toHaveAttribute("aria-current", "true")
  },
}
export const VerticalRail: Story = {
  args: { orientation: "vertical" },
  parameters: { docs: { description: { story: "A vertical thumbnail rail saves horizontal space on desktop and reflows below the image on mobile." } } },
}
export const WithControls: Story = {
  parameters: { docs: { description: { story: "Add carousel controls inside the main viewer when thumbnails alone are not enough for sequential browsing." } } },
  render: (args) => <Gallery {...args}>
    <Gallery.Main><Gallery.Carousel>
      <Gallery.Slides />
      <Carousel.Control><Carousel.Previous /><Carousel.Indicators /><Carousel.Next /></Carousel.Control>
    </Gallery.Carousel></Gallery.Main>
    <Gallery.Thumbnails />
  </Gallery>,
}
export const SingleImage: Story = {
  args: { items: items.slice(0, 1) },
  parameters: { docs: { description: { story: "A single product image hides the redundant thumbnail rail while preserving a named media region." } } },
}


export const OverflowingRail: Story = {
  parameters: { docs: { description: { story: "Sequential carousel navigation keeps the active thumbnail visible in a long rail without scrolling the whole page." } } },
  args: { items: Array.from({ length: 16 }, (_, index) => ({ ...items[index % items.length]!, id: `view-${index}`, alt: `Sneaker view ${index + 1}` })) },
  render: (args) => <Gallery {...args}>
    <Gallery.Main><Gallery.Carousel>
      <Gallery.Slides />
      <Carousel.Control><Carousel.Previous /><Carousel.Next /></Carousel.Control>
    </Gallery.Carousel></Gallery.Main>
    <Gallery.Thumbnails />
  </Gallery>,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const next = canvas.getByRole("button", { name: /next/i })
    for (let index = 0; index < 12; index++) await userEvent.click(next)
    await waitFor(() => {
      const active = canvasElement.querySelector('[aria-current="true"]')!
      const rail = active.parentElement!.parentElement!
      const item = active.getBoundingClientRect()
      const bounds = rail.getBoundingClientRect()
      expect(item.left).toBeGreaterThanOrEqual(bounds.left - 1)
      expect(item.right).toBeLessThanOrEqual(bounds.right + 1)
    })
  },
}
