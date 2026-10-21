import type { Meta, StoryObj } from "@storybook/react"
import type { ComponentPropsWithoutRef } from "react"
import { expect, within } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Image } from "../../src/atoms/image"

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
