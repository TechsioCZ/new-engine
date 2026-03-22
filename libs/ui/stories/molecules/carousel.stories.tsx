import type { Meta, StoryObj } from '@storybook/react'
import { Carousel, type CarouselSlide } from '../../src/molecules/carousel'

const sampleImages: CarouselSlide[] = [
  {
    id: 'slide-1',
    src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    alt: 'Beautiful landscape',
  },
  {
    id: 'slide-2',
    src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    alt: 'City skyline',
  },
  {
    id: 'slide-3',
    src: 'https://images.unsplash.com/photo-1747258294931-79af146bd74c?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    alt: 'Ocean view',
  },
  {
    id: 'coffee',
    src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
    alt: 'Coffee',
  },
  {
    id: 'architecture',
    src: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600',
    alt: 'Architecture',
  },
  {
    id: 'city-panorama',
    src: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200',
    alt: 'City panorama',
  },
  {
    id: 'beach-wide',
    src: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200',
    alt: 'Beach panorama',
  },
  {
    id: 'skyscraper',
    src: 'https://images.unsplash.com/photo-1494145904049-0dca59b4bbad?w=400',
    alt: 'Skyscraper',
  },
]

const mixedSlides: CarouselSlide[] = [
  {
    id: 'image-1',
    src: 'https://picsum.photos/205',
    alt: 'Sample image',
  },
  {
    id: 'content-1',
    content: (
      <div className="flex h-full flex-col items-center justify-center bg-surface-secondary p-lg text-center">
        <h3 className="mb-md font-bold text-xl text-fg-primary">
          Custom Content
        </h3>
        <p className="text-fg-secondary">
          This slide has custom JSX content instead of an image
        </p>
      </div>
    ),
  },
  {
    id: 'image-2',
    src: 'https://picsum.photos/206',
    alt: 'Another image',
  },
]

const contentSlides: CarouselSlide[] = [
  {
    id: 'content-1',
    content: (
      <div className="flex flex-col items-center justify-center bg-surface-accent p-lg text-center">
        <h3 className="mb-md font-bold text-xl text-fg-primary">Welcome</h3>
        <p className="text-fg-secondary">
          This is the first slide with custom content
        </p>
      </div>
    ),
  },
  {
    id: 'content-2',
    content: (
      <div className="flex flex-col items-center justify-center bg-surface-success p-lg text-center">
        <h3 className="mb-md font-bold text-xl text-fg-primary">Features</h3>
        <p className="text-fg-secondary">Explore the amazing features we offer</p>
      </div>
    ),
  },
  {
    id: 'content-3',
    content: (
      <div className="flex flex-col items-center justify-center bg-surface-info p-lg text-center">
        <h3 className="mb-md font-bold text-xl text-fg-primary">Get Started</h3>
        <p className="text-fg-secondary">Ready to begin your journey?</p>
      </div>
    ),
  },
]

const meta: Meta<typeof Carousel> = {
  title: 'Molecules/Carousel',
  component: Carousel,
  parameters: {
    layout: 'centered',
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
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="flex">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'full'],
      description: 'Size of the carousel',
      table: { defaultValue: { summary: 'md' } },
    },
    objectFit: {
      control: 'select',
      options: ['cover', 'contain', 'fill', 'none'],
      description: 'How images fit within slides',
      table: { defaultValue: { summary: 'cover' } },
    },
    aspectRatio: {
      control: 'select',
      options: ['square', 'landscape', 'portrait', 'wide', 'none'],
      description: 'Aspect ratio of slides',
      table: { defaultValue: { summary: 'square' } },
    },
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Direction of carousel movement',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    loop: {
      control: 'boolean',
      description: 'Whether carousel loops infinitely',
      table: { defaultValue: { summary: 'true' } },
    },
    autoplay: {
      control: 'boolean',
      description: 'Whether carousel auto-advances',
      table: { defaultValue: { summary: 'false' } },
    },
    slidesPerPage: {
      control: { type: 'number', min: 1, max: 5 },
      description: 'Number of slides visible at once',
      table: { defaultValue: { summary: '1' } },
    },
    slidesPerMove: {
      control: { type: 'number', min: 1, max: 5 },
      description: 'Number of slides to move per navigation',
      table: { defaultValue: { summary: '1' } },
    },
    allowMouseDrag: {
      control: 'boolean',
      description: 'Allow mouse/touch drag to navigate',
      table: { defaultValue: { summary: 'true' } },
    },
  },
  args: {
    size: 'md',
    objectFit: 'cover',
    aspectRatio: 'square',
    orientation: 'horizontal',
    loop: true,
    autoplay: false,
    slidesPerPage: 1,
    slidesPerMove: 1,
    allowMouseDrag: true,
  },
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
      {args.autoplay && <Carousel.Autoplay />}
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
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} size='md' loop>
      <Carousel.Slides slides={sampleImages} />
      <div className="flex justify-between w-full items-center">
        <Carousel.Previous />
        <Carousel.Indicators />
        <Carousel.Next />
      </div>
    </Carousel.Root>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom control layouts outside the default Control wrapper.',
      },
    },
  },
}

export const MinimalControls: Story = {
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} loop className='relative'>
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Previous className="absolute top-1/2 left-0 -translate-y-1/2 translate-x-1/2 bg-transparent text-xl hover:bg-transparent hover:text-primary"/>
      <Carousel.Next className="absolute top-1/2 right-0 -translate-y-1/2 -translate-x-1/2 bg-transparent text-xl hover:bg-transparent hover:text-primary"/>
    </Carousel.Root>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Carousel with only navigation arrows, no indicators.',
      },
    },
  },
}

export const CustomIndicators: Story = {
  render: () => (
    <Carousel.Root slideCount={sampleImages.length} loop>
      <Carousel.Slides slides={sampleImages} />
      <Carousel.Control>
        <Carousel.Previous />
        <Carousel.Indicators>
          {sampleImages.map((_, index) => (
            <Carousel.Indicator
              key={index}
              index={index}
              className="rounded-sm border border-reverse"
            />
          ))}
        </Carousel.Indicators>
        <Carousel.Next />
      </Carousel.Control>
    </Carousel.Root>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates custom indicator styling with elongated active indicator.',
      },
    },
  },
}

export const NumberedIndicators: Story = {
  render: () => (
    <div className="space-y-md">
      <Carousel.Root slideCount={sampleImages.length} loop className='overflow-auto'>
        <Carousel.Slides slides={sampleImages} />
        <div className="flex justify-center h-8 bg-surface items-center gap-200">
          <Carousel.Previous />
          <div className="flex gap-50">
            {sampleImages.map((_, index) => (
              <Carousel.Indicator
                key={index}
                index={index}
                className="bg-transparent text-fg-primary hover:bg-transparent hover:text-primary data-[current]:bg-transparent data-[current]:text-primary text-sm font-medium"
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
  parameters: {
    docs: {
      description: {
        story: 'Carousel with numbered indicators showing slide position.',
      },
    },
  },
}

export const MixedContent: Story = {
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
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the hybrid approach with both image sources and custom JSX content in the same carousel.',
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-lg">
      <div>
        <h3 className="mb-md font-medium text-lg text-fg-primary">Small</h3>
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
        <h3 className="mb-md font-medium text-lg text-fg-primary">Medium (Default)</h3>
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
        <h3 className="mb-md font-medium text-lg text-fg-primary">Large</h3>
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
  parameters: {
    docs: {
      description: {
        story: 'Different size variants of the carousel component.',
      },
    },
  },
}

export const ObjectFitDemo: Story = {
  render: () => {
    const testImage = {
      id: 'test',
      src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      alt: 'Portrait for object-fit testing',
    }

    return (
      <div className="space-y-lg">
        <div className="text-center">
          <h3 className="mb-sm font-semibold text-lg text-fg-primary">Object Fit Variants</h3>
          <p className="text-fg-secondary text-sm">
            Portrait image (400×600) in square containers
          </p>
        </div>

        <div className="grid grid-cols-2 gap-lg">
          <div>
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Cover</h4>
            <p className="mb-md text-fg-muted text-xs">
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Contain</h4>
            <p className="mb-md text-fg-muted text-xs">
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Fill</h4>
            <p className="mb-md text-fg-muted text-xs">
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">None</h4>
            <p className="mb-md text-fg-muted text-xs">
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
      id: 'landscape',
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      alt: 'Mountain landscape',
    }

    return (
      <div className="space-y-lg">
        <div className="text-center">
          <h3 className="mb-sm font-semibold text-lg text-fg-primary">Aspect Ratio Variants</h3>
          <p className="text-fg-secondary text-sm">
            Same landscape image in different aspect ratios
          </p>
        </div>

        <div className="space-y-md">
          <div>
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Square (1:1)</h4>
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Landscape (16:9)</h4>
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Portrait (3:4)</h4>
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">Wide (21:9)</h4>
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
            <h4 className="mb-sm font-medium text-sm text-fg-primary">None (natural height)</h4>
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
        className="flex flex-row h-96 overflow-visible"
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
