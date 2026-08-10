import type { Meta, StoryObj } from "@storybook/react"

import { Carousel } from "../../src/molecules/carousel"
import type { CarouselSlide } from "../../src/molecules/carousel"

const mixedImageOne = new URL(
  "../../assets/gallery/shoes-1.jpg",
  import.meta.url,
).href
const mixedImageTwo = new URL(
  "../../assets/gallery/shoes-2.jpg",
  import.meta.url,
).href

const sampleImages: CarouselSlide[] = [
  {
    alt: "Beautiful landscape",
    id: "slide-1",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
  },
  {
    alt: "City skyline",
    id: "slide-2",
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
  },
  {
    alt: "Ocean view",
    id: "slide-3",
    src: "https://images.unsplash.com/photo-1747258294931-79af146bd74c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    alt: "Coffee",
    id: "coffee",
    src: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
  },
  {
    alt: "Architecture",
    id: "architecture",
    src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600",
  },
  {
    alt: "City panorama",
    id: "city-panorama",
    src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200",
  },
  {
    alt: "Beach panorama",
    id: "beach-wide",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
  },
  {
    alt: "Skyscraper",
    id: "skyscraper",
    src: "https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=400",
  },
]

const mixedSlides: CarouselSlide[] = [
  {
    alt: "Sample image",
    id: "image-1",
    src: mixedImageOne,
  },
  {
    content: (
      <div className="flex h-full flex-col items-center justify-center bg-overlay p-400 text-center">
        <h3 className="mb-250 text-xl font-bold text-fg-primary">
          Custom Content
        </h3>
        <p className="text-fg-secondary">
          This slide has custom JSX content instead of an image
        </p>
      </div>
    ),
    id: "content-1",
  },
  {
    alt: "Another image",
    id: "image-2",
    src: mixedImageTwo,
  },
]

const contentSlides: CarouselSlide[] = [
  {
    content: (
      <div className="flex flex-col items-center justify-center bg-bg-secondary-base p-400 text-center">
        <h3 className="mb-250 text-xl font-bold text-fg-primary">Welcome</h3>
        <p className="text-fg-secondary">
          This is the first slide with custom content
        </p>
      </div>
    ),
    id: "content-1",
  },
  {
    content: (
      <div className="flex flex-col items-center justify-center bg-bg-success p-400 text-center">
        <h3 className="mb-250 text-xl font-bold text-fg-primary">Features</h3>
        <p className="text-fg-secondary">
          Explore the amazing features we offer
        </p>
      </div>
    ),
    id: "content-2",
  },
  {
    content: (
      <div className="flex flex-col items-center justify-center bg-bg-info p-400 text-center">
        <h3 className="mb-250 text-xl font-bold text-fg-primary">
          Get Started
        </h3>
        <p className="text-fg-secondary">Ready to begin your journey?</p>
      </div>
    ),
    id: "content-3",
  },
]

const meta: Meta<typeof Carousel> = {
  argTypes: {
    allowMouseDrag: {
      control: "boolean",
      description: "Allow mouse/touch drag to navigate",
      table: { defaultValue: { summary: "true" } },
    },
    aspectRatio: {
      control: "select",
      description: "Aspect ratio of slides",
      options: ["square", "landscape", "portrait", "wide", "none"],
      table: { defaultValue: { summary: "square" } },
    },
    autoplay: {
      control: "boolean",
      description: "Whether carousel auto-advances",
      table: { defaultValue: { summary: "false" } },
    },
    loop: {
      control: "boolean",
      description: "Whether carousel loops infinitely",
      table: { defaultValue: { summary: "true" } },
    },
    objectFit: {
      control: "select",
      description: "How images fit within slides",
      options: ["cover", "contain", "fill", "none"],
      table: { defaultValue: { summary: "cover" } },
    },
    orientation: {
      control: "radio",
      description: "Direction of carousel movement",
      options: ["horizontal", "vertical"],
      table: { defaultValue: { summary: "horizontal" } },
    },
    size: {
      control: "select",
      description: "Size of the carousel",
      options: ["sm", "md", "lg", "full"],
      table: { defaultValue: { summary: "md" } },
    },
    slidesPerMove: {
      control: { max: 5, min: 1, type: "number" },
      description: "Number of slides to move per navigation",
      table: { defaultValue: { summary: "1" } },
    },
    slidesPerPage: {
      control: { max: 5, min: 1, type: "number" },
      description: "Number of slides visible at once",
      table: { defaultValue: { summary: "1" } },
    },
  },
  args: {
    allowMouseDrag: true,
    aspectRatio: "square",
    autoplay: false,
    loop: true,
    objectFit: "cover",
    orientation: "horizontal",
    size: "md",
    slidesPerMove: 1,
    slidesPerPage: 1,
  },
  component: Carousel,
  decorators: [
    (Story) => (
      <div className="flex">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: `
A flexible carousel component using compound component pattern, built with Zag.js that supports multiple orientations, autoplay, and customizable controls.

## Features
- Compound component pattern for flexibility
- Horizontal and vertical orientation
- Autoplay with pause/play controls
- Loop functionality
- Multiple slides per page
- Responsive design
- Keyboard navigation
- Touch/mouse drag support
- Customizable indicators
- Accessibility support

## Usage Examples

### Basic Usage
\`\`\`tsx
<Carousel.Root slideCount={slides.length}>
  <Carousel.Slides slides={slides} />
  <Carousel.Control>
    <Carousel.Previous />
    <Carousel.Indicators />
    <Carousel.Next />
  </Carousel.Control>
</Carousel.Root>
\`\`\`

### With Autoplay
\`\`\`tsx
<Carousel.Root slideCount={slides.length} autoplay>
  <Carousel.Autoplay />
  <Carousel.Slides slides={slides} />
  <Carousel.Control>
    <Carousel.Previous />
    <Carousel.Indicators />
    <Carousel.Next />
  </Carousel.Control>
</Carousel.Root>
\`\`\`

### Custom Indicators
\`\`\`tsx
<Carousel.Root slideCount={slides.length}>
  <Carousel.Slides slides={slides} />
  <Carousel.Control>
    <Carousel.Previous />
    <Carousel.Indicators>
      {slides.map((_, index) => (
        <Carousel.Indicator key={index} index={index} />
      ))}
    </Carousel.Indicators>
    <Carousel.Next />
  </Carousel.Control>
</Carousel.Root>
\`\`\`
        `,
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/Carousel",
}

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <Carousel.Root
      slideCount={sampleImages.length}
      size={args.size}
      objectFit={args.objectFit}
      aspectRatio={args.aspectRatio}
      orientation={args.orientation}
      loop={args.loop}
      autoplay={args.autoplay}
      slidesPerPage={args.slidesPerPage}
      slidesPerMove={args.slidesPerMove}
      allowMouseDrag={args.allowMouseDrag}
    >
      {args.autoplay !== false && args.autoplay !== undefined && (
        <Carousel.Autoplay />
      )}
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}

export const CustomControlLayout: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates custom control layouts outside the default Control wrapper.",
      },
    },
  },
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} size="md" loop>
      <Carousel.Slides slides={sampleImages} />
      <div className="flex w-full items-center justify-between">
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </div>
    </Carousel.Root>
  ),
}

export const MinimalControls: Story = {
  parameters: {
    docs: {
      description: {
        story: "Carousel with only navigation arrows, no indicators.",
      },
    },
  },
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} loop className="relative">
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Previous className="absolute top-1/2 left-0 translate-x-1/2 -translate-y-1/2 bg-transparent text-xl hover:bg-transparent hover:text-primary" />
      <Carousel.Next className="absolute top-1/2 right-0 -translate-1/2 bg-transparent text-xl hover:bg-transparent hover:text-primary" />
    </Carousel.Root>
  ),
}

export const CustomIndicators: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates custom indicator styling with elongated active indicator.",
      },
    },
  },
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} loop>
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators>
          {sampleImages.map((image, index) => (
            <Carousel.Indicator
              key={image.id}
              index={index}
              className="rounded-sm border border-border-primary"
            />
          ))}
        </Carousel.Indicators>
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}

export const NumberedIndicators: Story = {
  parameters: {
    docs: {
      description: {
        story: "Carousel with numbered indicators showing slide position.",
      },
    },
  },
  render: () => (
    <div className="space-y-250">
      <Carousel.Root
        slideCount={sampleImages.length}
        loop
        className="overflow-auto"
      >
        <Carousel.Slides slides={sampleImages} />
        <div className="flex h-8 items-center justify-center gap-200 bg-surface">
          <Carousel.Previous />
          <div className="flex gap-50">
            {sampleImages.map((image, index) => (
              <Carousel.Indicator
                key={image.id}
                index={index}
                className="bg-transparent text-sm font-medium text-fg-primary hover:bg-transparent hover:text-primary data-[current]:bg-transparent data-[current]:text-primary"
              >
                {index + 1}
              </Carousel.Indicator>
            ))}
          </div>
          <Carousel.Next />
        </div>
      </Carousel.Root>
    </div>
  ),
}

export const MixedContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the hybrid approach with both image sources and custom JSX content in the same carousel.",
      },
    },
  },
  render: () => (
    <Carousel.Root slideCount={mixedSlides.length} size="md" loop>
      <Carousel.Slides slides={mixedSlides} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: "Different size variants of the carousel component.",
      },
    },
  },
  render: () => (
    <div className="space-y-400">
      <div>
        <h3 className="mb-250 text-lg font-medium text-fg-primary">Small</h3>
        <Carousel.Root slideCount={3} size="sm">
          <Carousel.Slides slides={sampleImages.slice(0, 3)} />
          <Carousel.Control>
            <Carousel.Previous />
            <Carousel.Indicators />
            <Carousel.Next />
          </Carousel.Control>
        </Carousel.Root>
      </div>

      <div>
        <h3 className="mb-250 text-lg font-medium text-fg-primary">
          Medium (Default)
        </h3>
        <Carousel.Root slideCount={3} size="md">
          <Carousel.Slides slides={sampleImages.slice(0, 3)} />
          <Carousel.Control>
            <Carousel.Previous />
            <Carousel.Indicators />
            <Carousel.Next />
          </Carousel.Control>
        </Carousel.Root>
      </div>

      <div>
        <h3 className="mb-250 text-lg font-medium text-fg-primary">Large</h3>
        <Carousel.Root slideCount={3} size="lg">
          <Carousel.Slides slides={sampleImages.slice(0, 3)} />
          <Carousel.Control>
            <Carousel.Previous />
            <Carousel.Indicators />
            <Carousel.Next />
          </Carousel.Control>
        </Carousel.Root>
      </div>
    </div>
  ),
}

export const ObjectFitDemo: Story = {
  render: () => {
    const testImage = {
      alt: "Portrait for object-fit testing",
      id: "test",
      src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
    }

    return (
      <div className="space-y-400">
        <div className="text-center">
          <h3 className="mb-150 text-lg font-semibold text-fg-primary">
            Object Fit Variants
          </h3>
          <p className="text-sm text-fg-secondary">
            Portrait image (400×600) in square containers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-400">
          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Cover
            </h4>
            <p className="mb-250 text-xs text-fg-secondary">
              Image covers entire container, may crop
            </p>
            <Carousel.Root
              slideCount={1}
              objectFit="cover"
              aspectRatio="square"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[testImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Contain
            </h4>
            <p className="mb-250 text-xs text-fg-secondary">
              Entire image visible, may have empty space
            </p>
            <Carousel.Root
              slideCount={1}
              objectFit="contain"
              aspectRatio="square"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[testImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">Fill</h4>
            <p className="mb-250 text-xs text-fg-secondary">
              Image stretches to fill, may distort
            </p>
            <Carousel.Root
              slideCount={1}
              objectFit="fill"
              aspectRatio="square"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[testImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">None</h4>
            <p className="mb-250 text-xs text-fg-secondary">
              Natural size, no fitting applied
            </p>
            <Carousel.Root
              slideCount={1}
              objectFit="none"
              aspectRatio="square"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[testImage]} />
            </Carousel.Root>
          </div>
        </div>
      </div>
    )
  },
}

export const AspectRatioDemo: Story = {
  render: () => {
    const landscapeImage = {
      alt: "Mountain landscape",
      id: "landscape",
      src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    }

    return (
      <div className="space-y-400">
        <div className="text-center">
          <h3 className="mb-150 text-lg font-semibold text-fg-primary">
            Aspect Ratio Variants
          </h3>
          <p className="text-sm text-fg-secondary">
            Same landscape image in different aspect ratios
          </p>
        </div>

        <div className="space-y-250">
          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Square (1:1)
            </h4>
            <Carousel.Root
              slideCount={1}
              aspectRatio="square"
              objectFit="cover"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[landscapeImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Landscape (16:9)
            </h4>
            <Carousel.Root
              slideCount={1}
              aspectRatio="landscape"
              objectFit="cover"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[landscapeImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Portrait (3:4)
            </h4>
            <Carousel.Root
              slideCount={1}
              aspectRatio="portrait"
              objectFit="cover"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[landscapeImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              Wide (21:9)
            </h4>
            <Carousel.Root
              slideCount={1}
              aspectRatio="wide"
              objectFit="cover"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[landscapeImage]} />
            </Carousel.Root>
          </div>

          <div>
            <h4 className="mb-150 text-sm font-medium text-fg-primary">
              None (natural height)
            </h4>
            <Carousel.Root
              slideCount={1}
              aspectRatio="none"
              objectFit="contain"
              size="md"
              loop={false}
            >
              <Carousel.Slides slides={[landscapeImage]} />
            </Carousel.Root>
          </div>
        </div>
      </div>
    )
  },
}

export const Vertical: Story = {
  render: () => (
    <div className="w-md">
      <Carousel.Root
        orientation="vertical"
        slideCount={4}
        size="md"
        loop
        className="flex h-96 flex-row overflow-visible"
      >
        <Carousel.Slides slides={sampleImages.slice(0, 4)} />
        <Carousel.Control controlPosition="side" className="bg-transparent">
          <Carousel.Previous icon="icon-[mdi--keyboard-arrow-up]" />
          <Carousel.Indicators className="flex-col" />
          <Carousel.Next icon="icon-[mdi--keyboard-arrow-down]" />
        </Carousel.Control>
      </Carousel.Root>
    </div>
  ),
}

export const Autoplay: Story = {
  render: () => (
    <Carousel.Root slideCount={contentSlides.length} autoplay loop>
      <Carousel.Autoplay />
      <Carousel.Slides slides={contentSlides} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}

export const SlidesPerPage: Story = {
  render: () => (
    <Carousel.Root
      slideCount={sampleImages.length}
      slidesPerPage={3}
      size="lg"
      loop
      spacing="var(--spacing-200)"
    >
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}

export const SlidesPerMove: Story = {
  render: () => (
    <Carousel.Root
      slideCount={sampleImages.length}
      slidesPerPage={2}
      slidesPerMove={2}
      size="lg"
      loop
    >
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
}
