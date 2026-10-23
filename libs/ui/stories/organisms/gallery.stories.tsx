import { type ComponentPropsWithRef, useRef, useState } from "react"
import { Button } from "../../src/atoms/button"
import { StatusText } from "../../src/atoms/status-text"
import type { Meta, StoryObj } from "@storybook/react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Gallery, type GalleryItem } from "../../src/organisms/gallery"
import { Carousel } from "../../src/molecules/carousel"

const items: GalleryItem[] = [
  {
    id: "front",
    src: new URL("../../assets/gallery/shoes-1.avif", import.meta.url).href,
    alt: "Pastel sneaker, front view",
  },
  {
    id: "side",
    src: new URL("../../assets/gallery/shoes-2.avif", import.meta.url).href,
    alt: "Pastel sneaker, side view",
  },
  {
    id: "red",
    src: new URL("../../assets/gallery/shoes-3.avif", import.meta.url).href,
    alt: "Red sneaker, side view",
  },
  {
    id: "detail",
    src: new URL("../../assets/gallery/shoes-4.avif", import.meta.url).href,
    alt: "Sneaker sole detail",
  },
]
const meta: Meta<typeof Gallery> = {
  title: "Organisms/Gallery",
  component: Gallery,
  tags: ["autodocs"],
  parameters: {
    controls: { exclude: ["ref", "id", "children", "ids", "getRootNode"] },
    layout: "padded",
    docs: {
      description: {
        component:
          "Gallery is a compound product-media viewer that synchronizes a main carousel and thumbnail rail. Compose Gallery.Main, Gallery.Carousel and Gallery.Thumbnails for custom layouts; choose GalleryTemplate for a ready-made props-only layout, or Carousel for slides without thumbnails. thumbnailSize is a media dimension in pixels, not a form-control size; carouselProps configures the nested carousel's media sizing.",
      },
    },
  },
  argTypes: {
    items: { control: "object" },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
    thumbnailSize: { control: { type: "number", min: 32, max: 120, step: 4 } },
    showThumbnails: { control: "boolean" },
    hideThumbnailsWhenSingle: { control: "boolean" },
    carouselProps: { control: "object" },
    value: { control: false },
    children: { control: false, table: { disable: true } },
    onValueChange: { control: false },
  },
  args: {
    items,
    orientation: "horizontal",
    thumbnailSize: 64,
    showThumbnails: true,
    hideThumbnailsWhenSingle: true,
    carouselProps: {
      width: "100%",
      size: "full",
      aspectRatio: "square",
      objectFit: "contain",
      "aria-label": "Workshop sneaker views",
    },
  },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-lg">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <Gallery {...args}>
      <Gallery.Main>
        <Gallery.Carousel>
          <Gallery.Slides />
        </Gallery.Carousel>
      </Gallery.Main>
      <Gallery.Thumbnails />
    </Gallery>
  ),
} satisfies Meta<typeof Gallery>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Change the real Gallery props and select a thumbnail to keep the main product view in sync.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("region", { name: "Workshop sneaker views" })
    ).toBeInTheDocument()
    const thumbnail = canvas.getByRole("button", { name: "Show slide 2" })
    await userEvent.click(thumbnail)
    await expect(thumbnail).toHaveAttribute("aria-current", "true")
  },
}
export const VerticalRail: Story = {
  args: { orientation: "vertical" },
  parameters: {
    docs: {
      description: {
        story:
          "A vertical thumbnail rail saves horizontal space on desktop and reflows below the image on mobile.",
      },
    },
  },
}
export const WithControls: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Add carousel controls inside the main viewer when thumbnails alone are not enough for sequential browsing.",
      },
    },
  },
  render: (args) => (
    <Gallery {...args}>
      <Gallery.Main>
        <Gallery.Carousel>
          <Gallery.Slides />
          <Carousel.Control>
            <Carousel.Previous />
            <Carousel.Indicators />
            <Carousel.Next />
          </Carousel.Control>
        </Gallery.Carousel>
      </Gallery.Main>
      <Gallery.Thumbnails />
    </Gallery>
  ),
}
export const SingleImage: Story = {
  args: { items: items.slice(0, 1) },
  parameters: {
    docs: {
      description: {
        story:
          "A single product image hides the redundant thumbnail rail while preserving a named media region.",
      },
    },
  },
}

export const OverflowingRail: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Sequential carousel navigation keeps the active thumbnail visible in a long rail without scrolling the whole page.",
      },
    },
  },
  args: {
    items: Array.from({ length: 16 }, (_, index) => ({
      ...items[index % items.length]!,
      id: `view-${index}`,
      alt: `Sneaker view ${index + 1}`,
    })),
  },
  render: (args) => (
    <Gallery {...args}>
      <Gallery.Main>
        <Gallery.Carousel>
          <Gallery.Slides />
          <Carousel.Control>
            <Carousel.Previous />
            <Carousel.Next />
          </Carousel.Control>
        </Gallery.Carousel>
      </Gallery.Main>
      <Gallery.Thumbnails />
    </Gallery>
  ),
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

// The test adapter deliberately waits for explicit load/error events: no network race.
function LifecycleMedia({ src, ...props }: ComponentPropsWithRef<"img">) {
  return <img {...props} data-requested-src={src} data-adapter="shared" />
}
function ThumbnailMedia({ src, ...props }: ComponentPropsWithRef<"img">) {
  return <img {...props} data-requested-src={src} data-adapter="thumbnail" />
}
function MediaLifecycleExample() {
  const [mounted, setMounted] = useState(true)
  const [source, setSource] = useState("controlled-pending")
  const [objectScrollRef, setObjectScrollRef] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const [report, setReport] = useState(
    "Refs attach to their actual DOM targets."
  )
  const root = useRef<HTMLDivElement>(null)
  const main = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const media = useRef<HTMLImageElement>(null)
  const calls = useRef({ attached: 0, cleaned: 0, loaded: 0, failed: 0 })
  return (
    <div className="flex flex-col gap-200">
      {mounted && (
        <Gallery
          ref={root}
          items={[
            {
              id: "controlled",
              src: source,
              alt: "Workshop sneaker full view",
              imageProps: {
                width: 400,
                height: 300,
                ref: media,
                onLoad: () => {
                  calls.current.loaded++
                },
                onError: () => {
                  calls.current.failed++
                },
                "data-media-prop": "preserved",
              },
            },
            { id: "missing", src: "", alt: "Missing sneaker full view" },
          ]}
          thumbnailImageAs={LifecycleMedia}
          carouselProps={{
            imageAs: LifecycleMedia,
            aspectRatio: "landscape",
            width: "100%",
          }}
        >
          <Gallery.Main ref={main}>
            <Gallery.Carousel />
          </Gallery.Main>
          <Gallery.Thumbnails
            ref={rail}
            listRef={list}
            scrollAreaRef={
              objectScrollRef
                ? scroll
                : (node) => {
                    if (!node)
                      throw new Error(
                        "Cleanup callback must replace the legacy null callback"
                      )
                    calls.current.attached++
                    return () => {
                      calls.current.cleaned++
                    }
                  }
            }
          >
            <Gallery.Thumbnail
              index={0}
              ref={button}
              imageAs={ThumbnailMedia}
            />
            <Gallery.Thumbnail index={1} />
          </Gallery.Thumbnails>
        </Gallery>
      )}
      <div className="flex flex-wrap gap-200">
        <Button
          onClick={() => {
            const valid =
              root.current?.contains(main.current) &&
              rail.current?.contains(list.current) &&
              list.current?.contains(button.current) &&
              main.current?.contains(media.current) &&
              (!objectScrollRef ||
                (scroll.current?.contains(list.current) &&
                  scroll.current !== rail.current))
            setReport(
              valid
                ? "Root, main, rail, list, button and image refs verified."
                : "Incorrect ref target"
            )
          }}
        >
          Check refs
        </Button>
        <Button onClick={() => setObjectScrollRef(true)}>
          Use object scroll ref
        </Button>
        <Button onClick={() => setSource("controlled-recovery")}>
          Change source
        </Button>
        <Button
          onClick={() =>
            setReport(
              `Load events: ${calls.current.loaded}; error events: ${calls.current.failed}`
            )
          }
        >
          Check events
        </Button>
        <Button onClick={() => setMounted(false)}>Unmount gallery</Button>
        <Button
          onClick={() =>
            setReport(
              !root.current &&
                !main.current &&
                !rail.current &&
                !list.current &&
                !button.current &&
                !media.current &&
                !scroll.current &&
                calls.current.attached === calls.current.cleaned
                ? "All refs cleaned."
                : "Refs leaked"
            )
          }
        >
          Check cleanup
        </Button>
      </div>
      <StatusText role="status">{report}</StatusText>
    </div>
  )
}
export const MediaLifecycleAndRefs: Story = {
  render: () => <MediaLifecycleExample />,
  parameters: {
    docs: {
      description: {
        story:
          "Deterministic adapter loading, failure and source recovery with full-image alternatives, decorative thumbnails, and React 19 ref cleanup. Native adapters use the same fallback composition.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Check refs" }))
    await expect(canvas.getByRole("status")).toHaveTextContent("refs verified")
    let image = canvasElement.querySelector<HTMLImageElement>(
      '[data-media-prop="preserved"]'
    )!
    const box = image.closest<HTMLElement>("[data-image-state]")!
    const bounds = box.getBoundingClientRect()
    await expect(box).toHaveAttribute("data-image-state", "loading")
    image.dispatchEvent(new Event("error"))
    await waitFor(() =>
      expect(box).toHaveAttribute("data-image-state", "error")
    )
    await expect(
      canvas.getByRole("img", { name: "Workshop sneaker full view" })
    ).toBeVisible()
    const buttons = canvasElement.querySelectorAll(
      'button[aria-label^="Show slide"]'
    )
    for (const thumbnail of buttons) {
      await expect(thumbnail.querySelector("img")).toHaveAttribute("alt", "")
      await expect(thumbnail.querySelector("img")).toHaveAttribute(
        "aria-hidden",
        "true"
      )
    }
    await expect(buttons[0]?.querySelector("img")).toHaveAttribute(
      "data-adapter",
      "thumbnail"
    )
    await expect(buttons[1]?.querySelector("img")).toHaveAttribute(
      "data-adapter",
      "shared"
    )
    await expect(
      buttons[1]?.querySelector("[data-image-fallback]")
    ).toHaveAttribute("aria-hidden", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Change source" }))
    image = canvasElement.querySelector<HTMLImageElement>(
      '[data-media-prop="preserved"]'
    )!
    const recovered = image.closest<HTMLElement>("[data-image-state]")!
    await expect(recovered).toHaveAttribute("data-image-state", "loading")
    image.dispatchEvent(new Event("load"))
    await waitFor(() =>
      expect(recovered).toHaveAttribute("data-image-state", "loaded")
    )
    await expect(recovered.getBoundingClientRect().height).toBe(bounds.height)
    await expect(recovered.getBoundingClientRect().width).toBe(bounds.width)
    await userEvent.click(canvas.getByRole("button", { name: "Check events" }))
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Load events: 1; error events: 1"
    )
    await userEvent.click(
      canvas.getByRole("button", { name: "Use object scroll ref" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Check refs" }))
    await expect(canvas.getByRole("status")).toHaveTextContent("refs verified")
    await userEvent.click(
      canvas.getByRole("button", { name: "Unmount gallery" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Check cleanup" }))
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "All refs cleaned."
    )
  },
}
