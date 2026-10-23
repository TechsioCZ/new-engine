import type { Meta, StoryObj } from "@storybook/react"
import {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useState,
} from "react"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Image, ImageWithFallback } from "../../src/atoms/image"
import { Button } from "../../src/atoms/button"
import { Badge } from "../../src/atoms/badge"
import { Link } from "../../src/atoms/link"
import { LinkButton } from "../../src/atoms/link-button"

const landscape =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=960&h=640&fit=crop"
const alt = "Sunlit mountain peaks beneath a blue sky"

const meta: Meta<typeof Image> = {
  title: "Atoms/Image",
  component: Image,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'A framework-agnostic image slot for product photos, editorial media, and thumbnails. Use Gallery for several images and Icon for symbols. Choose sm/md/lg for square thumbnails, full for a fluid image, or custom when the parent owns sizing. Reserve space with width/height or an aspect ratio; use object-cover to crop, object-contain to preserve the whole image, and rounded token utilities for shape. The as prop forwards image and framework-specific props to an adapter such as NextImage; meaningful images need descriptive alt text, while decorative images use alt="".',
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg", "full", "custom"] },
    src: { control: "text", description: "Image source URL." },
    alt: {
      control: "text",
      description:
        "Describe the image's purpose; use an empty string only for decorative media.",
    },
    className: {
      control: "text",
      description:
        "Layout and presentation utilities, e.g. aspect-video object-cover rounded-lg.",
    },
    loading: { control: "inline-radio", options: ["eager", "lazy"] },
    as: { control: false },
  },
  args: {
    src: landscape,
    alt,
    size: "full",
    width: 960,
    height: 640,
    className: "rounded-lg",
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-lg">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Image>

export const Playground: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Explore image size, source, alt text, and presentation classes to choose a stable image slot for your layout.",
      },
    },
  },
  render: (args) => <Image {...args} />,
}

export const Sizes: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare token-sized square thumbnails with fluid and parent-sized images so the slot matches its content hierarchy.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Square thumbnails">
        {(["sm", "md", "lg"] as const).map((size) => (
          <figure className="flex flex-col gap-100" key={size}>
            <Image
              src={landscape}
              alt={alt}
              size={size}
              width={960}
              height={640}
              className="rounded-md"
            />
            <figcaption className="text-sm text-fg-secondary">
              {size}
            </figcaption>
          </figure>
        ))}
      </VariantGroup>
      <VariantGroup title="Fluid width" fullWidth>
        <Image
          src={landscape}
          alt={alt}
          size="full"
          width={960}
          height={640}
          className="rounded-lg"
        />
      </VariantGroup>
      <VariantGroup title="Parent-sized banner" fullWidth>
        <Image
          src={landscape}
          alt={alt}
          size="custom"
          className="w-full aspect-video rounded-lg"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const AspectAndFit: Story = {
  name: "Aspect ratio and fit",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare cover cropping with contain inside equal landscape slots to keep photography immersive and product details visible.",
      },
    },
  },
  render: () => (
    <VariantContainer>
      <VariantGroup title="Cover: fills the slot, crops edges" fullWidth>
        <Image
          src={landscape}
          alt={alt}
          size="custom"
          className="aspect-wide w-full rounded-lg object-cover"
        />
      </VariantGroup>
      <VariantGroup title="Contain: preserves the entire image" fullWidth>
        <Image
          src={landscape}
          alt={alt}
          size="custom"
          className="aspect-wide w-full rounded-lg bg-fill-secondary object-contain"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

export const Rounded: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Compare square, softly rounded, and circular crops to match media shape to its surrounding surface.",
      },
    },
  },
  render: () => (
    <VariantGroup title="Shape utilities">
      {(["rounded-none", "rounded-lg", "rounded-full"] as const).map(
        (shape) => (
          <figure className="flex flex-col gap-100" key={shape}>
            <Image src={landscape} alt={alt} size="sm" className={shape} />
            <figcaption className="text-sm text-fg-secondary">
              {shape}
            </figcaption>
          </figure>
        )
      )}
    </VariantGroup>
  ),
}

// Stand-in for a framework component; Storybook does not require a Next.js runtime.
// Next consumers use as={NextImage} and provide width/height or fill.
function FrameworkImageAdapter({
  priority,
  ...props
}: ComponentPropsWithoutRef<"img"> & { priority?: boolean }) {
  return (
    <img
      {...props}
      data-framework-image="true"
      fetchPriority={priority ? "high" : "auto"}
    />
  )
}

export const FrameworkAdapter: Story = {
  name: "Framework adapter with as",
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Pass an image adapter through as to retain UI-kit sizing while forwarding framework props such as priority, width, and height.",
      },
    },
  },
  render: () => (
    <Image
      as={FrameworkImageAdapter}
      src={landscape}
      alt={alt}
      width={960}
      height={640}
      priority
      size="full"
      className="rounded-lg"
    />
  ),
  play: async ({ canvasElement }) => {
    const image = within(canvasElement).getByRole("img", { name: alt })
    await expect(image).toHaveAttribute("data-framework-image", "true")
    await expect(image).toHaveAttribute("fetchpriority", "high")
    await expect(image).toHaveAttribute("width", "960")
  },
}

const brokenPhoto = "data:image/png;base64,not-an-image"
const localPhoto = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#dbeafe"/><path d="M0 640 360 160 600 480 740 280 960 640" fill="#166534"/></svg>')}`

function RefImageAdapter(props: ComponentPropsWithRef<"img">) {
  return <img {...props} data-framework-image="true" />
}

function ResilientImagesExample() {
  const [src, setSrc] = useState(brokenPhoto)
  const [errors, setErrors] = useState(0)
  const [loads, setLoads] = useState(0)
  return (
    <div className="flex max-w-lg flex-col gap-200">
      <div className="flex flex-wrap gap-200">
        <ImageWithFallback
          src={src}
          alt="Mountain landscape"
          fallbackLabel="Mountain landscape — photo unavailable"
          size="md"
          width={960}
          height={640}
          onError={() => setErrors((value) => value + 1)}
          onLoad={() => setLoads((value) => value + 1)}
        />
        <ImageWithFallback
          as={RefImageAdapter}
          src={src}
          alt="Mountain landscape from adapter"
          fallbackLabel="Mountain landscape from adapter — photo unavailable"
          size="md"
          width={960}
          height={640}
          onError={() => setErrors((value) => value + 1)}
          onLoad={() => setLoads((value) => value + 1)}
        />
        <ImageWithFallback src="" alt="" size="sm" width={80} height={80} />
      </div>
      <Button
        onClick={() => setSrc(src === brokenPhoto ? localPhoto : brokenPhoto)}
        theme="outlined"
      >
        {src === brokenPhoto ? "Load working photo" : "Break photo"}
      </Button>
      <p>
        Errors: <output data-testid="image-errors">{errors}</output>; loads:{" "}
        <output data-testid="image-loads">{loads}</output>
      </p>
    </div>
  )
}

export const FailedAndRecovery: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Native and adapter images share a neutral failure state, compose load callbacks and recover when given a working source.",
      },
    },
  },
  render: () => <ResilientImagesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await waitFor(() =>
      expect(
        canvasElement.querySelectorAll("[data-image-fallback]")
      ).toHaveLength(3)
    )
    await expect(
      canvas.getByRole("img", {
        name: "Mountain landscape — photo unavailable",
      })
    ).toBeVisible()
    await expect(canvas.getByTestId("image-errors")).toHaveTextContent("2")
    await userEvent.click(
      canvas.getByRole("button", { name: "Load working photo" })
    )
    await waitFor(() =>
      expect(canvas.getByTestId("image-loads")).toHaveTextContent("2")
    )
    await expect(
      canvasElement.querySelectorAll("[data-image-fallback]")
    ).toHaveLength(1)
    const image = canvas.getByRole("img", {
      name: "Mountain landscape",
    }) as HTMLImageElement
    await expect(image.naturalWidth).toBeGreaterThan(0)
    await expect(image).not.toHaveAttribute("aria-hidden")
  },
}

function DelayedImageAdapter({ src, ...props }: ComponentPropsWithRef<"img">) {
  const [resolved, setResolved] = useState<string>()
  useEffect(() => {
    const timer = setTimeout(() => setResolved(src), 800)
    return () => clearTimeout(timer)
  }, [src])
  return <img {...props} src={resolved} />
}

function DelayedImageExample() {
  const [request, setRequest] = useState(0)
  return (
    <div className="flex flex-col gap-200">
      <ImageWithFallback
        as={DelayedImageAdapter}
        src={localPhoto}
        alt="Mountain landscape"
        width={960}
        height={640}
        className="aspect-video rounded-lg"
        key={request}
      />
      <Button onClick={() => setRequest((value) => value + 1)} theme="outlined">
        Reload photo
      </Button>
    </div>
  )
}

export const DelayedAdapter: Story = {
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "A delayed local adapter reserves the same media box before and after loading without depending on a remote image service.",
      },
    },
  },
  render: () => <DelayedImageExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Restart the request so bounds are sampled before load even on slow CI.
    await userEvent.click(canvas.getByRole("button", { name: "Reload photo" }))
    const image = canvas.getByRole("img", {
      name: "Mountain landscape",
    }) as HTMLImageElement
    const box = image.closest<HTMLElement>("[data-image-state]")!
    await expect(box).toHaveAttribute("data-image-state", "loading")
    const before = box.getBoundingClientRect()
    await expect(before.width).toBeGreaterThan(0)
    await expect(before.height).toBeGreaterThan(0)
    // Decoding can finish before the load event's React state update commits.
    await waitFor(
      () => {
        expect(image.naturalWidth).toBeGreaterThan(0)
        expect(box).toHaveAttribute("data-image-state", "loaded")
      },
      { timeout: 5000 }
    )
    const after = box.getBoundingClientRect()
    await expect(after.width).toBeCloseTo(before.width, 1)
    await expect(after.height).toBeCloseTo(before.height, 1)
  },
}

function PrimitiveRefsExample() {
  const anchor = useRef<HTMLAnchorElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const resilient = useRef<HTMLImageElement>(null)
  const [targets, setTargets] = useState("")
  useEffect(() => {
    setTargets(
      [anchor, button, badge, image, resilient]
        .map((ref) => ref.current?.tagName)
        .join(",")
    )
  }, [])
  return (
    <div className="flex flex-col items-start gap-200">
      <Link
        href="#orders"
        onClick={(event) => event.preventDefault()}
        ref={anchor}
      >
        Orders
      </Link>
      <LinkButton as={Button} ref={button}>
        Adapter button
      </LinkButton>
      <Badge ref={badge}>Ready</Badge>
      <Image
        as={RefImageAdapter}
        src={localPhoto}
        alt="Ref target"
        size="sm"
        ref={image}
      />
      <ImageWithFallback
        as={RefImageAdapter}
        src={brokenPhoto}
        alt="Fallback ref target"
        size="sm"
        ref={resilient}
      />
      <output data-testid="primitive-ref-targets">{targets}</output>
    </div>
  )
}

export const PrimitiveRefs: Story = {
  tags: ["!dev", "!autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Accepted native and custom-adapter refs reach the declared DOM targets, including failed media.",
      },
    },
  },
  render: () => <PrimitiveRefsExample />,
  play: async ({ canvasElement }) => {
    // Ref targets are published by an effect after the first render.
    await waitFor(() =>
      expect(
        within(canvasElement).getByTestId("primitive-ref-targets")
      ).toHaveTextContent("A,BUTTON,SPAN,IMG,IMG")
    )
  },
}
